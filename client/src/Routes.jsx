import RegisterAndLoginForm from "./RegisterAndLoginForm.jsx";
import {UserContext} from "./UserContext.jsx";
import {useContext} from "react";
import Chat from "./Chat.jsx"

export default function Routes(){
    const {username, id} = useContext(UserContext);

    // if logged in or registered, show chats
    if(username){
        return <Chat />;
    } // otherwise show register and login form
    return (
    <RegisterAndLoginForm />
);
}