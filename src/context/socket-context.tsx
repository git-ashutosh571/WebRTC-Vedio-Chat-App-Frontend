import SocketIoClient from "socket.io-client";
import { createContext, useEffect, useReducer, useState } from "react";
import { useNavigate } from "react-router-dom";
import Peer from 'peerjs';
import {v4 as UUIDv4} from 'uuid';
import { peerReducer } from "../Reducers/peer-reducer";
import { addPeerAction } from "../Actions/peer-action";


const WS_Server = "http://localhost:443";
export const SocketContext = createContext<any | null>(null);

const socket = SocketIoClient(WS_Server, {
    withCredentials: false,
    transports: ["polling", "websocket"]
});

interface Props {
    children: React.ReactNode
}

export const SocketProvider: React.FC<Props> = ({ children }) => {
    const navigate = useNavigate(); //will help to programatically handle navigation
    // state variable to store the userId
    const [user,setUser] = useState<Peer>();
    const [stream,setStream] = useState<MediaStream>();
    const [peers, setPeers] = useState<any>({});
    const [peer,dispatch] = useReducer(peerReducer, {});

    const fetchParticipantList = ( {roomId, participants} : {roomId:string, participants:string[]})=>{
        console.log(`Fetched room participants are ${participants} with ${roomId}`);

    }
    const fetchUserFeed = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({video:true,audio:true});
        setStream(stream);
    }
    useEffect(()=>{

        const userId = UUIDv4();
        const newPeer = new Peer(userId,{
            host: "localhost",
            port: 9000,
            path: "/myapp"
        });

        setUser(newPeer);
        fetchUserFeed();

        const enterRoom = ( {roomId} : {roomId:string}) => {
            navigate(`/room/${roomId}`);
        }
        //We will transfer the user to the room page when we collect an event of room-created from server
        socket.on("room-created",enterRoom);

        socket.on("get-users",fetchParticipantList);

    },[]);

    useEffect(() => {
        if (!user || !stream) return;
    
        socket.on("user-joined", ({ peerId }) => {
            const call = user.call(peerId, stream);
            call.on(stream, () => {
                dispatch(addPeerAction(peerId, stream));
            });
        });
    
        user.on("call", (call) => {
            call.answer(stream);
            call.on(stream, () => {
                dispatch(addPeerAction(call.peer, stream));
            });
        });
        socket.emit("ready");
    }, [user, stream]);
    return (
        <SocketContext.Provider value={{socket,user,stream,peers}}>
            {children}
        </SocketContext.Provider>
    );
}
