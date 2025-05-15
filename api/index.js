// import dependencies and models
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const UserModel = require('./models/User');
const ws = require('ws');
const fs = require('fs');
const Message = require('./models/Message');


// Load environment variables
dotenv.config();

//Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('Failed to connect to MongoDB', err));

// initialize JSON web token and hash password
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);


const app = express(); // set up server
app.use('/uploads', express.static(__dirname + '/uploads')); // serve static files
app.use(express.json()); // parse requests with JSON
app.use(cookieParser()); // parse HTTP request cookies

// allows commmunication from the frontend to the backend
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
}));

// extracts JWT token from request cookies to get user data.
async function getUserDataFromRequest(req){
    return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if(token){
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if(err) throw err;
        resolve(userData);
    });
    } else{
        reject('no token');
    }
    });
}

// // Get messages between users and sorted by creation time.
app.get('/messages/:userId', async(req, res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        sender: {$in: [userId, ourUserId]},
        recepient: {$in: [userId, ourUserId]},
    }).sort({createdAt: 1});
    res.json(messages);
});

// get all users
app.get('/people', async (req, res) => {
    const users = await UserModel.find({}, {'_id': 1, username:1});
    res.json(users);
})

// get user data from the token in cookies
app.get('/profile', (req, res) => {
    const token = req.cookies?.token;
    if(token){
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if(err) throw err;
        res.json(userData);
    });
    } else{
        res.status(401).json('no token');
    }
});

// send cookie if username is found and password is correct
app.post('/login', async (req, res) => {
    const {username, password} = req.body;
    const foundUser = await UserModel.findOne({username});

    if(foundUser){
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if(passOk){
            jwt.sign({userId:foundUser._id, username}, jwtSecret, {}, (err, token) => {
                res.cookie('token', token, {sameSite: 'none', secure: true}).json({
                    id: foundUser._id,
                });
            });
        }
    }
});

// clear token cookie to log out
app.post('/logout', (req, res) => {
    res.cookie('token', '', {sameSite: 'none', secure: true}).json('ok');
})

// get username and password, hash password, and create user
app.post('/register', async (req, res) => {
    const {username, password} = req.body;
    try{
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await UserModel.create({
        username: username,
        password: hashedPassword,
    });
    jwt.sign({userId:createdUser._id, username}, jwtSecret, {}, (err, token) => {
        if(err) throw err;
        res.cookie('token', token, {sameSite:'none', secure: true});
        res.status(201).json({id: createdUser._id,});
    });
    }
    catch(err){
        if(err) throw err;
        res.status(500).json('error')
    }
});

// launch express server on port 3000
const server = app.listen(3000);

// create a web socket server connected to the express server
const wss = new ws.WebSocketServer({server});

// handle web socket connections
wss.on('connection', (connection, req) => {

    // get all online users in the web socket server
    function notifyAboutOnlinePeople(){
        [...wss.clients].forEach(client => {
        client.send(JSON.stringify({
            online: [...wss.clients].map(c => ({userId:c.userId, username:c.username})),
        }));
    });
    }

    // set connection as alive to monitor
    connection.isAlive = true;

    /* send ping every 5 seconds and if not responsive, terminate connection
     and get all online users */
    connection.timer = setInterval(() => {
        connection.ping();
        connection.deathTimer = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            notifyAboutOnlinePeople();
        }, 1000);
    }, 5000);

    connection.on('live', () => {
        clearTimeout(connection.deathTimer);
    })

    //read username and id from the cookie for this connection
    const cookies = req.headers.cookie;
    if(cookies){
        const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
        if(tokenCookieString){
            const token = tokenCookieString.split('=')[1];
            if(token){
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if(err) throw err;
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }

    // handle message and parse content to get recepient, text, or file
    connection.on('message', async (message) => {
        const messageData = JSON.parse(message.toString());
        const {recepient, text, file} = messageData;
        let filename = null;

        // save uploaded file and set filename
        if(file){
            const parts = file.name.split('.');
            const last = parts[parts.length - 1];
            filename = Date.now() + '.'+last;
            const path = __dirname + '/uploads/' + filename;
            const base64Data = file.data.split(',')[1];
            const bufferData = Buffer.from(base64Data, 'base64');
            fs.writeFile(path, bufferData, () => {
                console.log('file saved:'+path);
            });
        }

        // save message and send to the recepient if connected
        if(recepient && (text || file)){
            const messageDoc = await Message.create({
                sender: connection.userId,
                recepient, text,
                file: file? filename : null,
            });
            [...wss.clients]
            .filter(c => c.userId === recepient)
            .forEach(c => c.send(JSON.stringify({
                text, 
                sender: connection.userId, 
                recepient, 
                file: file? filename : null,
                _id:messageDoc._id,})));
        }

    });
    // get all online users
    notifyAboutOnlinePeople();
});