import WebSocket = require("ws");
import { Lobby } from "./types/Lobby";
import { z } from "zod";
import { Request } from "./types/Request";
import { Message } from "./types/Message";

const wss = new WebSocket.Server({ port: 9080 });

const lobbys = new Map<string, Lobby>();

const connections = new Map<string, WebSocket>();

let server: undefined | WebSocket = undefined 

wss.on("connection", (ws, req) => {

    let lobbyID : string;
    console.log('connection established: ');
    
    

    ws.on("close", (code, reason) => {
        if(lobbys.get(lobbyID)?.owner === ws){
            lobbys.delete(lobbyID)
        }

        console.log("closed with code" + code);
    });

    ws.on("error", console.error);

    ws.on('open', (e : any) => {
        console.log('Opend connection ' + e);
        
    })

    ws.on("message", (message, isBinary) => {
        const data: Message = JSON.parse(message.toString());

        switch(data.action){
            case "CONNECTION_REQUEST": {
                connections.set(data.payload.name, ws)
                console.log('connection request received and forwarded to server');
                server?.send(message)
                break;
            }
            case "SDP_RESPONSE": {
                if(data.payload.target === "server"){
                    server?.send(message)
                    console.log('sdp sent to server');
                }
                else{
                    connections.get(data.payload.target)?.send(message)
                    console.log('sdp sent to client');
                    
                }
                break;
            }
            case "SERVER_INIT": {
                server = ws;
                console.log('server initialized');
                break;
            }
            default: {
                ws.send('Unrecognized action type!')
            }
        }

    
  });
});

wss.on("close", () => {
  console.log("closed");
});
