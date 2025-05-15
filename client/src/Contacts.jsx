import Avatar from "./Avatar.jsx"

// component for contacts
export default function Contacts({id, username, onClick, selected, online}){
    
    return(
    <div key={id} onClick={() => onClick(id)}
            className={"dark:hover:bg-gray-800 dark:border-gray-800 hover:bg-blue-100 border-b border-gray-100 flex items-center gap-2 cursor-pointer "+(selected ? 'dark:bg-gray-800 bg-blue-100' : '')}>
                {selected && (
                    <div className="w-2 bg-blue-100 h-12 rounded-r-sm"></div>
                )}
        <div className="flex gap-2 py-2 pl-4 items-center">
            <Avatar online={online} username={username} userId={id} />
            <span className="dark:text-gray-300 text-gray-800">{username}</span>
        </div>
    </div>
    );
}