//Mongoose model for storing the messages of users. 
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    recepient: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
    text: String,
    file: String,
}, {timestamps: true});

const MessageModel = mongoose.model('Message', MessageSchema);

module.exports = MessageModel;