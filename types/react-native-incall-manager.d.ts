declare module 'react-native-incall-manager' {
  interface InCallManagerStatic {
    start(options?: { media: 'audio' | 'video' }): void;
    stop(): void;
    setForceSpeakerphoneOn(enabled: boolean): void;
  }

  const InCallManager: InCallManagerStatic;
  export default InCallManager;
}
