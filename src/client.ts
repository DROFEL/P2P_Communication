import { WebSocket } from "ws";
import { Request, RequestZod } from "./types/Request";
// import { RTCPeerConnection, RTCDataChannel } from 'wrtc';
import wrtc from 'wrtc';
import { Message } from "./types/Message";

const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    autoCommit: true
});

type Store = {
    ws: WebSocket | undefined,
    name: string,
    connection: Map<string, {
        peer: RTCPeerConnection,
        dc: RTCDataChannel | undefined,
    }>
}
const store: Store = {
    name: `user${Math.floor(Math.random() * 1000)}`,
    connection: new Map<string, {
        peer: RTCPeerConnection,
        dc: RTCDataChannel | undefined,
    }>(),
} as Store;

function clearLastLine() {
    readline.moveCursor(process.stdout, 0, -2);
    rl.clearLine(process.stdout, 0);
}

console.log('\x1b[33mIncorrect address format! it has to be ws://*\x1b[0m');
console.log('Input signaling server address: ');

rl.on('line', (input: string) => {

    const command: string[] = input.split(' ')

    if (store.ws === undefined) {

        if (command[0] === 'localhost') {
            store.ws = new WebSocket('ws://localhost:9080');
        } else if (command[0] === 'default') {
            store.ws = new WebSocket('ws://localhost:9080')
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
            rl.resume()
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
        readline.moveCursor(process.stdout, 0, -2);
        rl.clearLine(process.stdout, 0);
        Array.from(store.connection).forEach(([_, connection]) => {
            connection.dc?.send(`${store.name}: ${input}`)
        })
        return
    }

    switch (command[0]) {
        case '/server': {
            command[1] && (store.name = command[1])
            store.ws?.send(JSON.stringify({
                action: 'SERVER_INIT',
                payload: {}
            } as Message))

            store.ws?.on('message', (message: string) => {
                const data: Message = JSON.parse(message.toString());
                switch (data.action) {
                    case 'CONNECTION_REQUEST': {

                        const peer = new wrtc.RTCPeerConnection();

                        const dc = peer.createDataChannel('dataChannel');
                        dc.onopen = () => {
                            console.log(`${data.payload.name} connected!`);
                        }
                        dc.onmessage = (e) => {
                            console.log(`${e.data}`);
                            Array.from(store.connection).forEach((connection) => {
                                connection[1].dc?.send(e.data)
                            })
                        }
                        store.connection.set(data.payload.name, {
                            peer: peer,
                            dc: dc,
                        })

                        peer.onicecandidate = (e) => {
                            if (!e.candidate) {
                                store.ws?.send(JSON.stringify({
                                    action: 'SDP_RESPONSE',
                                    payload: {
                                        target: data.payload.name,
                                        name: 'server',
                                        offer: peer.localDescription
                                    }
                                } as Message))
                            }
                        }

                        peer.createOffer().then((offer) => {
                            peer.setLocalDescription(offer).then(() => {
                                console.log('local description set');
                            })
                        })
                        break;
                    }
                    case 'SDP_RESPONSE': {
                        console.log('got sdp response from ' + data.payload.name);

                        store.connection.get(data.payload.name)?.peer.setRemoteDescription(data.payload.offer).then(() => {
                            console.log('remote description set');
                        })
                        break;
                    }
                    default: {
                        console.log('Unrecognized action type!')
                    }
                }
            });

            break;
        }
        case '/connect': {
            store.ws?.send(JSON.stringify({
                action: 'CONNECTION_REQUEST',
                payload: {
                    name: command[1]
                }
            } as Message))

            store.name = command[1];

            store.ws?.on('message', (message: string) => {
                const data: Message = JSON.parse(message.toString());
                switch (data.action) {
                    case 'SDP_RESPONSE': {
                        console.log('got initial offer from server');

                        const peer = new wrtc.RTCPeerConnection();
                        peer.ondatachannel = (e) => {
                            const dc = e.channel;
                            dc.onopen = () => {
                                console.log(`${data.payload.name} connected!`);
                            }
                            dc.onmessage = (e) => {
                                console.log(e.data);
                            }
                            store.connection.set('server', {
                                peer: peer,
                                dc: dc,
                            });
                        }

                        let candidatesent = false;
                        peer.onicecandidate = (e) => {
                            if (!e.candidate && !candidatesent) {
                                candidatesent = true;
                                store.ws?.send(JSON.stringify({
                                    action: 'SDP_RESPONSE',
                                    payload: {
                                        target: 'server',
                                        name: store.name,
                                        offer: peer.localDescription
                                    }
                                } as Message))
                            }
                        }

                        peer.setRemoteDescription(data.payload.offer).then(() => {
                            console.log('remote description set');

                            peer.createAnswer().then((answer) => {
                                console.log('answer created');

                                peer.setLocalDescription(answer).then(() => {
                                    console.log('local description set');
                                });

                            })
                        })

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

});
