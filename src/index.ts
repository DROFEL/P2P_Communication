import WebSocket from 'ws';
import { Lobby } from "./types/Lobby";
import { Message } from "./types/Message";

const wss = new WebSocket.Server({ port: 9080 });

const lobbys = new Map<string, Lobby>();

const connections = new Map<number, WebSocket>();

// let server: undefined | WebSocket = undefined

wss.on("listening", () => {
    console.log("Started and ready for connections");
});

wss.on("connection", (ws, req) => {

    let lobbyID: string;
    const id = connections.size;
    connections.set(id, ws)
    console.log('connection established with id: ' + id);



    ws.on("close", (code, reason) => {
        if (lobbys.get(lobbyID)?.owner === ws) {
            lobbys.delete(lobbyID)
        }
        connections.delete(id)
        console.log("closed with code" + code);
    });

    ws.on("error", console.error);

    ws.on('open', (e: any) => {
        
        console.log('Opend connection ' + e);

    })

    ws.on("message", (message, isBinary) => {
        const data: Message = JSON.parse(message.toString());

        switch (data.action) {
            case "CONNECTION_REQUEST": {
                console.log('connection request received and forwarded to server id: ' + id);
                data.payload.id = id
                const lobby = lobbys.get(data.payload.lobbyID)
                lobby ? lobby.owner.send(JSON.stringify(data)) : ws.send(JSON.stringify({ action: "CONNECTION_RESPONSE", payload: { target: id, id: data.payload.id, error: `Lobby with ${data.payload.lobbyID} doesnt exist!` } } as Message))
                // server?.send(JSON.stringify(data))
                break;
            }
            case "CONNECTION_RESPONSE": {
                console.log('connection response received and forwarded to client');
                connections.get(data.payload.target)?.send(message)
                break;
            }
            case "SDP_RESPONSE": {
                connections.get(data.payload.target)?.send(message)
                console.log(`SDP response received from ${data.payload.id} and forwarded to client ${data.payload.target}`);
                break;
            }
            case "SERVER_INIT": {
                // server = ws;
                do{
                    lobbyID = Math.random().toString(36).substring(7)
                }
                while (lobbyID in lobbys)

                lobbys.set(lobbyID, { owner: ws } )

                ws.send(JSON.stringify({ action: "SERVER_INIT_RESPONSE", payload: { id: id, lobbyID } } as Message));
                console.log(`Server initialized by ${id} and with lobby id: ${lobbyID}`);
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
