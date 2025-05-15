// import packages and components
import { useContext, useEffect, useState, useRef} from "react";
import Logo from "./Logo.jsx"
import { UserContext } from "./UserContext.jsx";
import { uniqBy } from "lodash";
import axios from "axios";
import Contacts from "./Contacts.jsx";


export default function Chat(){
    // define variables and theme
    const [ws, setWs] = useState(null);
    const [onlinePeople, setOnlinePeople] = useState({});
    const [offlinePeople, setOfflinePeople] = useState({});
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [newMessageText, setMessageText] = useState('');
    const [messages, setMessages] = useState([]);
    const {username, id, setId, setUsername} = useContext(UserContext);
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('theme') === 'dark'
    });

    // reconnect to web socket when user is selected
    const divUnderMessages = useRef();
    useEffect(() =>{
        reconnectToWs();
    }, [selectedUserId]);

    // connect to web socket server
    function reconnectToWs(){
        const ws = new WebSocket('ws://localhost:3000');
        setWs(ws);
        ws.addEventListener('message', handleMessage);
        ws.addEventListener('close', () => {
            setTimeout(() => {reconnectToWs()}, 1000)
        });
    }

    // make online users array an object
    function showOnlinePeople(peopleArray){
        const people = {};
        peopleArray.forEach(({userId, username}) => {
            people[userId] = username;
        });
        setOnlinePeople(people);
    }

    // handle messages
    function handleMessage(ev){
        const messageData = JSON.parse(ev.data);
        console.log({ev, messageData});
        if('online' in messageData){
            showOnlinePeople(messageData.online);
        }
        else if('text' in messageData){
            if(messageData.sender === selectedUserId){
                setMessages(prev => ([...prev, {...messageData}]));
            }
        }
    }
    
    // log out the user, clear websocket and user data
    function logout(){
        axios.post('/logout')
        .then(() => {
            setWs(null);
            setId(null);
            setUsername(null);
        });
    }

    // send message
    function sendMessage(ev, file = null){
        if(ev) ev.preventDefault();
        ws.send(JSON.stringify({
                recepient: selectedUserId,
                text: newMessageText,
                file,
        }));

        if(file){
            axios.get('/messages/' + selectedUserId)
                .then(res => {
                    setMessages(res.data);
                });
        }else{
            setMessageText('');
            setMessages(prev => ([...prev,
                {text: newMessageText,
                sender: id,
                recepient: selectedUserId,
                _id: Date.now(),}]));
        }
    }

    // send file message
    function sendFile(ev){
        const read = new FileReader();
        read.readAsDataURL(ev.target.files[0]);
        read.onload = () => {
            sendMessage(null, {
                name: ev.target.files[0].name,
                data: read.result,
            });
        };
    }

    // auto scroll feature to the latest message
    useEffect(() => {
       const div = divUnderMessages.current;
       if(div){
            div.scrollIntoView({behavior: 'smooth', block:'end'});
       }
    }, [messages]);

    // get all users, check for offline people
    useEffect(() => {
        axios.get('/people')
        .then(res => {
            const offlinePeopleArray = res.data.filter(p => p._id !== id)
            .filter(p => !Object.keys(onlinePeople).includes(p._id));
            const offlinePeople = {};
            offlinePeopleArray.forEach(p => {
                offlinePeople[p._id] = p;
            });
            setOfflinePeople(offlinePeople);
        });
    }, [onlinePeople]);

    // get messages when user is selected
    useEffect(() => {
        if(selectedUserId){
            axios.get('/messages/'+ selectedUserId)
            .then(res => {
                setMessages(res.data);
            });
        }
    }, [selectedUserId]);

    // dark mode
    useEffect(() => {
        const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

    const onlinePeopleExceptSelf = {...onlinePeople}; // get users except self
    delete onlinePeopleExceptSelf[id]; // remove self from contacts

    const messagesWithoutDupe = uniqBy(messages, '_id'); // remove duplicate messages

    return(
        <div className="flex h-screen font-bold">
            <div className="bg-white w-1/3 flex flex-col dark:bg-gray-900"> 
                <div className="flex-grow">
                    <Logo />
                    {/* show online people except self */}
                    {Object.keys(onlinePeopleExceptSelf).map(userId => (
                        <Contacts 
                        key={userId}
                        id={userId}
                        online={true}
                        username={onlinePeopleExceptSelf[userId]}
                        onClick={() => {setSelectedUserId(userId)}}
                        selected={userId === selectedUserId}/>
                    ))}

                    {/* show offline people */}
                    {Object.keys(offlinePeople).map(userId => (
                        <Contacts
                        key={userId}
                        id={userId}
                        online={false}
                        username={offlinePeople[userId].username}
                        onClick={() => setSelectedUserId(userId)}
                        selected={userId === selectedUserId}/>
                    ))}
                </div>

                <div className="p-2 text-center flex items-center justify-center">
                    <span className="mr-2 text-sm text-gray-400 flex items-center dark:text-gray-300">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8">
                        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
                        </svg>
                        {username}
                    </span>

                    {/* logout button */}
                   <button 
                    onClick={logout}
                    className="hover:bg-gray-300 text-sm bg-blue-100 py-1 px-2 text-gray-600 border rounded-sm">LOGOUT</button>
                    
                    {/* dark mode button */}
                    <button
                    onClick={() => setIsDark(!isDark)}
                    className="p-2 text-sm bg-gray-200 dark:bg-gray-700 rounded m-2">
                    {isDark ? '🌙' : '☀️'}
                    </button>
                </div>

            </div>
            <div className="flex flex-col dark:bg-gray-800 bg-blue-100 w-2/3 p-2">
                <div className="flex-grow">

                    {/* if no contact is selected */}
                    {!selectedUserId && (
                        <div className="flex h-full items-center justify-center">
                            <div className=" dark:text-gray-500 text-gray-400 font-bold">&larr; Select a Contact</div>
                        </div>
                    )}

                    {/* when user is selected, show messages */}
                    {!!selectedUserId && (
                            <div className="relative h-full">
                            <div className="overflow-y-scroll absolute top-0 left-0 right-0 bottom-2">
                                {messagesWithoutDupe.map(message => (
                                <div key={message._id} className={(message.sender === id ? 'text-right' : 'text-left')}>
                                    <div className={"inline-block text-left p-2 my-2 mr-2 ml-2 rounded-md text-sm " + (message.sender === id ? 'dark:bg-blue-800 bg-blue-500 text-white' : 'bg-white text-gray-500')}>
                                        {message.text}
                                        {message.file && (
                                            <div className="">
                                                <a target="_blank" className="flex items-center gap-1 border-b" href={axios.defaults.baseURL + '/uploads/' + message.file}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                                    </svg>
                                                    {message.file}
                                                </a>
                                            </div>
                                        )}
                                        </div>
                                    </div>
                                ))}
                                <div ref={divUnderMessages}></div>
                            </div>
                            </div>
                    )}
                </div>

                {/* send message bar  */}
                {!!selectedUserId && (
                    <form className="flex gap-2" onSubmit={sendMessage}>
                        <input type="text"
                        value={newMessageText}
                        onChange={ev => setMessageText(ev.target.value)}
                        placeholder="Aa"
                        className="dark:bg-gray-00 bg-white flex-grow border rounded-sm p-2"/>
                        
                        {/* add file button */}
                        <label className=" cursor-pointer bg-blue-200 p-2 text-gray-500 rounded-sm border border-blue-200">
                            <input type="file" className="hidden" onChange={sendFile} />
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-6 fill-blue-500">
                            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z" clipRule="evenodd" />
                            </svg>
                        </label>
                        
                        {/* send message button */}
                        <button type="submit" className="bg-blue-500 rounded-sm p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-6">
                            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                            </svg>
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}