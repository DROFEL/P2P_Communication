// import {
//     RTCPeerConnection,
//     RTCSessionDescription,
//     RTCIceCandidate,
//     RTCDataChannel
//     // ... any other WebRTC types you plan to use
//   } from 'lib.dom';
  
declare module 'wrtc' {
export = {
    RTCPeerConnection: RTCPeerConnection,
    RTCSessionDescription: RTCSessionDescription,
    RTCIceCandidate: RTCIceCandidate,
    RTCDataChannel: RTCDataChannel,
    // ... any other WebRTC exports you plan to use
};
}

  