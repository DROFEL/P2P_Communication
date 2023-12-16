import { WebSocket } from "ws";
// import { RTCPeerConnection, RTCDataChannel } from 'wrtc';
import wrtc from 'wrtc';
import { Message } from "./types/Message";
import { RTCMessage } from "./types/RTCMessage";

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    autoCommit: true,
    prompt: '',
});

type Store = {
    ws: WebSocket | undefined,
    id: number,
    name: string,
    lobbyID: string,
    connection: Map<number, {
        peer: RTCPeerConnection,
        dc: RTCDataChannel | undefined,
    }>
}
const store: Store = {
    name: `user${Math.floor(Math.random() * 1000)}`,
    connection: new Map<number, {
        peer: RTCPeerConnection,
        dc: RTCDataChannel | undefined,
    }>(),
} as Store;

function clearLastLine() {
    readline.moveCursor(process.stdout, 0, -2);
    rl.clearLine(process.stdout, 0);
}

function log(msg: string) {
    console.log(msg);
    rl.prompt();
}

function printMessage(data: RTCMessage) {
    rl.setPrompt(`\x1b[35m${data.name}\x1b[0m: `);
    rl.prompt();
    console.log(`${data.message}`);
    rl.setPrompt(`\x1b[36m${store.name}\x1b[0m: `);
    rl.prompt();
}

console.log('Welcome to the RTC chat client! Type /help for a list of commands.');
console.log('Input signaling server address: ');
rl.prompt()

rl.on('line', (input: string) => {

    rl.prompt();
    const command: string[] = input.split(' ')

    if (store.ws === undefined) {

        if (command[0] === 'localhost') {
            store.ws = new WebSocket('ws://localhost:9080');
        } else if (command[0] === 'default') {
            store.ws = new WebSocket('ws://34.67.194.13:9080')
        } else if (!command[0].match('ws:\/\/.*')) {
            console.log('\x1b[33mIncorrect address format! it has to be ws://*\x1b[0m');
            return;
        } else {
            store.ws = new WebSocket(input);
        }
        rl.pause()
        let i = 0;

        const loadingMessage = setInterval(() => {
            clearLastLine()
            console.log('Connecting to ' + input + '.'.repeat(i) + '    '); // clearLine doesnt remove the text in the terminal, it just allows to override text in it
            i = (i + 1) % 4;
        }, 100)

        store.ws.on('open', () => {
            clearLastLine()
            clearInterval(loadingMessage)
            console.log(`\x1b[32mConnection with ${input} established!\x1b[0m`);
            rl.setPrompt(`\x1b[36m${store.name}\x1b[0m: `);
            rl.prompt();
        })
        store.ws.on('error', (e) => {
            clearLastLine()
            clearInterval(loadingMessage)
            console.log(`\x1b[33mConnection to ${input} failed! Please try again:\x1b[0m`);
            store.ws = undefined;
            rl.resume()
        })

        return
    }

    if (command[0][0] !== '/') {
        Array.from(store.connection).forEach(([_, connection]) => {
            connection.dc?.readyState === 'open' ? connection.dc?.send(JSON.stringify({
                name: store.name,
                message: input,
                senderId: store.id
            } as RTCMessage)) : null
        })
        rl.prompt();
        return
    }

    switch (command[0]) {
        case '/help': {
            break;
        }
        case '/name': {
            store.name = command[1];
            rl.setPrompt(`\x1b[36m${store.name}\x1b[0m: `);
            break;
        }
        case '/exit': {
            rl.close();
            break;
        }
        case '/server': {
            command[1] && (store.name = command[1])
            store.ws?.send(JSON.stringify({
                action: 'SERVER_INIT',
                payload: {}
            } as Message))
            let candidates = new Array<RTCIceCandidateInit>();
            let remoteDescriptionSet = false;
            store.ws?.on('message', (message: string) => {
                const data: Message = JSON.parse(message.toString());
                switch (data.action) {
                    case 'CONNECTION_REQUEST': {
                        // console.log('creating server peer');

                        const peer = new wrtc.RTCPeerConnection({
                            iceServers: [
                                {
                                    urls: ['stun:stun.l.google.com:19302',
                                        'stun:stun1.l.google.com:19302',
                                        'stun:stun2.l.google.com:19302',
                                        'stun:stun3.l.google.com:19302',
                                        'stun:stun4.l.google.com:19302',
                                    ]
                                }
                            ]
                        });
                        // console.log('initial connection state' + peer.connectionState);


                        // peer.onconnectionstatechange = (e) => { console.log('connection state change: ' + peer.connectionState); }
                        // peer.onicecandidateerror = (e) => { console.log('ice candidate error '); }
                        // peer.oniceconnectionstatechange = (e) => { console.log('ice connection state change ' + peer.iceConnectionState); }
                        // peer.onsignalingstatechange = (e) => { console.log('signaling state change: ' + peer.signalingState); }
                        // peer.onnegotiationneeded = (e) => { console.log('negotiation needed '); }

                        store.connection.set(data.payload.id, {
                            peer: peer,
                            dc: undefined,
                        })
                        peer.ondatachannel = (e) => {
                            // console.log('data channel created');
                            const dc = e.channel;
                            dc.onopen = () => {
                                Array.from(store.connection).forEach((connection) => {
                                    if(connection[1].dc !== dc) connection[1].dc?.send(JSON.stringify({
                                        name: '',
                                        message: `\x1b[32m${data.payload.name} connected!\x1b[0m`,
                                        senderId: store.id
                                    } as RTCMessage))
                                })
                                console.log('');
                                clearLastLine();
                                log(`\x1b[32m${data.payload.name} connected!\x1b[0m`);
                            }
                            dc.onmessage = (e) => {
                                const data = JSON.parse(e.data.toString()) as RTCMessage;
                                printMessage(data);
                                Array.from(store.connection).forEach((connection) => {
                                    if (connection[0] !== data.senderId) connection[1].dc?.send(e.data)
                                })
                            }
                            dc.onerror = (e) => {
                                console.log('DC error occured!');
                                console.log(dc.readyState);
                                console.log(e);
                            }
                            store.connection.set(data.payload.id, {
                                peer: store.connection.get(data.payload.id)?.peer as RTCPeerConnection,
                                dc: dc,
                            })
                        }

                        peer.setRemoteDescription(data.payload.initOffer).then(() => {
                            // console.log('remote description set');

                            peer.createAnswer().then((answer) => {
                                // console.log('answer created');

                                peer.setLocalDescription(answer).then(() => {
                                    // console.log('local description set');
                                    store.ws?.send(JSON.stringify({
                                        action: 'CONNECTION_RESPONSE',
                                        payload: {
                                            name: store.name,
                                            id: store.id,
                                            target: data.payload.id,
                                            serverOffer: peer.localDescription
                                        }
                                    } as Message))
                                    remoteDescriptionSet = true;
                                });

                                peer.onicecandidate = (e) => {
                                    // console.log('candidate found');
                                    store.ws?.send(JSON.stringify({
                                        action: 'SDP_RESPONSE',
                                        payload: {
                                            target: data.payload.id,
                                            id: store.id,
                                            offer: e.candidate
                                        }
                                    } as Message))
                                    // e.candidate && candidates.push(e.candidate);
                                    // if (e.candidate === null) {
                                    //     store.ws?.send(JSON.stringify({
                                    //         action: 'SDP_RESPONSE',
                                    //         payload: {
                                    //             target: data.payload.id,
                                    //             id: store.id,
                                    //             offer: candidates
                                    //         }
                                    //     } as Message))
                                    // }
                                }
                            })
                        })

                        break;
                    }
                    case 'SDP_RESPONSE': {
                        const peer = store.connection.get(data.payload.id)?.peer!
                        // console.log('ice candidate reviced from ' + data.payload.id);
                        // console.log('Signaling state: ' + peer.signalingState)
                        // candidates.push(data.payload.offer);
                        // if (remoteDescriptionSet) {
                        //     console.log('processing candidates...');
                        //     while (candidates.length > 0) {
                        //         if (candidates[0] !== null) {
                        //             peer.addIceCandidate(candidates[0])
                        //         }
                        //         console.log(peer.remoteDescription);
                        //         candidates.shift();
                        //     }
                        // }
                        if (data.payload.offer) {
                            peer.addIceCandidate(data.payload.offer)
                                .then(() => {
                                    // console.log("Candidate added successfully")
                                    // console.log(data.payload.offer);
                                    // console.log(peer.remoteDescription)
                                })
                                // .catch(e => console.error("Error adding received candidate", e));
                        } else {
                            // peer.addIceCandidate({ candidate: "" });
                        }

                        break;
                    }
                    case 'SERVER_INIT_RESPONSE': {
                        store.id = data.payload.id;
                        store.lobbyID = data.payload.lobbyID;
                        console.log('Server successfully initialized with id: ' + store.lobbyID);
                        log('Send this id to your friends so they can connect to your server!');
                        break;
                    }
                    default: {
                        log('Unrecognized action type! ' + data.action)
                        // console.log(data);
                    }
                }
            });

            break;
        }
        case '/connect': {
            command[2] && (store.name = command[2])
            if (command[1] === undefined) {
                console.log('You have to specify the lobby id you want to connect to!');
                return;
            }

            rl.setPrompt(``);
            rl.pause();
            console.log('');
            let connectionLineIndex = 0;
            const chars = ['|', '/', '─', '\\'];
            let message = ''
            const connection = setInterval(() => {
                clearLastLine();
                console.log(`\x1b[33mConnecting to lobby: ${message} ${chars[connectionLineIndex]} \x1b[0m`);
                connectionLineIndex = (connectionLineIndex + 1) % 4;
            }, 100)
            
             
            

            const peer = new wrtc.RTCPeerConnection({
                iceServers: [
                    {
                        urls: ['stun:stun.l.google.com:19302',
                            'stun:stun1.l.google.com:19302',
                            'stun:stun2.l.google.com:19302',
                            'stun:stun3.l.google.com:19302',
                            'stun:stun4.l.google.com:19302',
                        ]
                    }
                ]
            });
            const dc = peer.createDataChannel('messageChannel');
            store.connection.set(0, {
                peer: peer,
                dc: dc,
            });

            peer.createOffer().then((offer) => {
                peer.setLocalDescription(offer).then(() => {
                    // console.log('local description set');
                    store.ws?.send(JSON.stringify({
                        action: 'CONNECTION_REQUEST',
                        payload: {
                            name: store.name,
                            lobbyID: command[1],
                            id: 0,
                            initOffer: peer.localDescription
                        }
                    } as Message))
                })
            })

            // peer.onconnectionstatechange = (e) => { console.log('connection state change: ' + peer.connectionState); }
            // peer.onicecandidateerror = (e) => { console.log('ice candidate error '); }
            // peer.oniceconnectionstatechange = (e) => { console.log('ice connection state change ' + peer.iceConnectionState); }
            // peer.onsignalingstatechange = (e) => { console.log('signaling state change: ' + peer.signalingState); }
            // peer.onnegotiationneeded = (e) => { console.log('negotiation needed '); }


            let candidates = new Array<RTCIceCandidateInit>();

            peer.onicecandidate = (e) => {
                if(e.candidate) {
                    candidates.push(e.candidate);
                }
            }

            let remoteDescriptionSet = false;
            store.ws?.on('message', (message: string) => {
                const data: Message = JSON.parse(message.toString());
                switch (data.action) {
                    case 'SDP_RESPONSE': {
                        // console.log('ice candidate reviced from ' + data.payload.id);
                        // console.log('Signaling state: ' + peer.signalingState)
                        // candidates.push(data.payload.offer);
                        // if (remoteDescriptionSet) {
                        //     console.log('processing candidates...');
                        //     while (candidates.length > 0) {
                        //         if (candidates[0] !== null) {
                        //             peer.addIceCandidate(candidates[0])
                        //         }
                        //         console.log(peer.remoteDescription);
                        //         candidates.shift();
                        //     }
                        // }
                        if (data.payload.offer) {
                            peer.addIceCandidate(data.payload.offer)
                                // .then(() => {
                                //     console.log("Candidate added successfully")
                                //     console.log(data.payload.offer);
                                //     console.log(peer.remoteDescription)
                                // })
                                // .catch(e => {
                                //     console.log(data.payload.offer);
                                //     console.error("Error adding received candidate", e)});
                        } else {
                            // peer.addIceCandidate({ candidate: "" });
                        }

                        break;
                    }
                    case 'CONNECTION_RESPONSE': {

                        if (data.payload.error) {
                            log(data.payload.error);
                            return;
                        }

                        store.id = data.payload.target;
                        // console.log('set global id ' + data.payload.target);
                        const serverId = data.payload.id;
                        // console.log('got connection response (offer) from ' + data.payload.id);

                        peer.setRemoteDescription(data.payload.serverOffer).then(() => remoteDescriptionSet = true);

                        Array.from(candidates).forEach((candidate) => {
                            store.ws?.send(JSON.stringify({
                                action: 'SDP_RESPONSE',
                                payload: {
                                    target: serverId,
                                    id: store.id,
                                    offer: candidate
                                }
                            } as Message))
                        })

                        peer.onicecandidate = (e) => {
                            // console.log('candidate found');
                            store.ws?.send(JSON.stringify({
                                action: 'SDP_RESPONSE',
                                payload: {
                                    target: serverId,
                                    id: store.id,
                                    offer: e.candidate
                                }
                            } as Message))
                        }

                        dc.onopen = () => {
                            clearInterval(connection);
                            clearLastLine();
                            rl.setPrompt(``);
                            rl.resume();
                            log(`\x1b[32mConnected to ${data.payload.name} lobby!\x1b[0m ${' '.repeat(20)}`);
                            rl.setPrompt(`\x1b[36m${store.name}\x1b[0m: `);
                            rl.prompt();
                        }
                        dc.onmessage = (e) => {
                            const data = JSON.parse(e.data.toString()) as RTCMessage;
                            printMessage(data);
                        }
                        dc.onerror = (e) => {
                            console.log('DC error occured!');
                            console.log(dc.readyState);
                            console.log(e);
                        }

                        break;

                    }
                }
            })
            break;
        }
        default: {
            console.log('Unknown command: ' + command);

        }
    }
    rl.prompt();
}).on('close', () => {
    console.log('Have a great day!');
    process.exit(0);
});