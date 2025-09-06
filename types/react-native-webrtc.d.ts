// By re-exporting the standard WebRTC types, we ensure that
// react-native-webrtc's API is treated as compliant with the web standard.
declare module 'react-native-webrtc' {
  // Re-exporting global WebRTC types for use in the native module.
  export const RTCPeerConnection: typeof globalThis.RTCPeerConnection;
  export const mediaDevices: typeof globalThis.navigator.mediaDevices;
  export type MediaStream = globalThis.MediaStream;
  export type MediaStreamTrack = globalThis.MediaStreamTrack;
  export type RTCDataChannel = globalThis.RTCDataChannel;
  export type RTCSessionDescriptionInit = globalThis.RTCSessionDescriptionInit;
  export type RTCIceCandidateInit = globalThis.RTCIceCandidateInit;
  export type RTCTrackEvent = globalThis.RTCTrackEvent;
}
