import { WebSocket } from "ws";

export type Store = {
    ws: WebSocket | undefined,
    id: number,
    name: string,
    lobbyID: string,
    connection: Map<number, {
        peer: RTCPeerConnection,
        dc: RTCDataChannel | undefined,
    }>
}