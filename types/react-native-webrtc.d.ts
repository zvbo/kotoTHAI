declare module 'react-native-webrtc' {
  // 最小类型声明，满足当前项目在原生端的动态引入与使用
  export const RTCPeerConnection: any;
  export const mediaDevices: {
    getUserMedia: (constraints: any) => Promise<any>;
  };
  export type MediaStream = any;
  export type RTCDataChannel = any;
  export type RTCSessionDescriptionInit = any;
  export type RTCIceCandidateInit = any;
}