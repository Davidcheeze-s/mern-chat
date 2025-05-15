import {useContext, useState} from "react";
import axios from "axios";
import {UserContext} from "./UserContext.jsx";

export default function RegisterAndLoginForm(){
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginOrRegister, setIsLoginOrRegister] = useState('login');
    const {setUsername:setLoggedInUsername, setId} = useContext(UserContext);
    
    // handles login and register forms
    async function handleSubmit(ev){
        ev.preventDefault();
            const url = isLoginOrRegister === 'register' ? 'register' : 'login';
            const {data} = await axios.post(url, {username, password});
            setLoggedInUsername(username);
            setId(data.id);
    }

    return(
        <div className="bg-blue-50 h-screen flex items-center justify-center">
            <form className="w-64 mx-auto mb-12" onSubmit={handleSubmit}>
                <div className="mx-auto mb-4 block text-center">
                    <img className="w-40 mx-auto" src="/mezzenger.png" alt="logo"/>
                    <h1 className="text-2xl font-bold text-blue-600 tracking-wide">MEZZENGER</h1>
                </div>

                {/* username bar */}
                <input value={username}
                    onChange={ev => setUsername(ev.target.value)}
                    type="text" placeholder="username"
                    className="block w-full rounded-sm p-2 mb-2 border"/>
                {/* password bar */}
                <input value={password}
                    onChange={ev => setPassword(ev.target.value)}
                    type="password"
                    placeholder="password"
                    className="block w-full rounded-sm p-2 mb-2 border"/>
                {/* login / register button */}
                <button className="bg-blue-500 text-white block w-full rounded-sm p-2">
                    {isLoginOrRegister === 'register' ? 'Register': 'Login'}
                </button>
            <div className="text-center mt-2">
                {/* change to login */}
                {isLoginOrRegister === 'register' && (
                    <div>
                        Already Registered?
                    <button className="ml-1" onClick={() => setIsLoginOrRegister('login')}>
                        <u>Login here.</u>
                    </button>
                    </div>
                )}
                {/* change to register */}
                {isLoginOrRegister === 'login' && (
                    <div>
                        Don't have an account?
                    <button onClick={() => setIsLoginOrRegister('register')}>
                        <u>Register.</u>
                    </button>
                    </div>
                )}
            </div>
            
            </form>
        </div>
    );
}