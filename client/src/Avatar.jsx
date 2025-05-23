// set color for profile avatar and let users know if user is online or not
export default function Avatar({userId, username, online}){
    const colors =['bg-teal-200', 'bg-red-200',
                  'bg-green-200', 'bg-purple-200',
                  'bg-blue-200', 'bg-yellow-200',
                  'bg-orange-200', 'bg-pink-200', 'bg-fuchsia-200', 'bg-rose-200'];

    const userIdBase10 = parseInt(userId.substring(10), 16);
    const colorIndex = userIdBase10 % colors.length;
    const color = colors[colorIndex];

    return(
        <div className={"w-8 h-8 relative rounded-full flex items-center " + color}>
            <div className="text-center w-full opacity-70">{username[0]}</div>
            {online && (
            <div className="absolute w-3 h-3 rounded-full 
                          bg-green-500 bottom-0 right-0
                          border border-white"></div>
            )}
            {!online && (
            <div className="absolute w-3 h-3 rounded-full 
                          bg-gray-500 bottom-0 right-0 border
                          border-white"></div>
            )}
        </div>
    );
}