import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

// Simplified VAD implementation for demo purposes
export default function useVoiceActivityDetection() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for timers and counters
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activityCounter = useRef(0);
  const silenceThreshold = 1500; // 1.5 seconds of silence to consider speech ended
  
  // Mock implementation for demo purposes
  // In a real app, this would use audio analysis to detect voice activity
  const startListening = () => {
    setError(null);
    setIsListening(true);
    console.log('Started listening for voice activity');
    
    // Simulate random voice detection for demo
    if (Platform.OS === 'web') {
      // For web, we'll just use a simple timer to simulate voice detection
      const detectInterval = setInterval(() => {
        // Randomly detect voice activity
        const hasActivity = Math.random() > 0.7;
        
        if (hasActivity) {
          handleVoiceDetected();
        }
      }, 500);
      
      return () => {
        clearInterval(detectInterval);
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
        }
      };
    }
    
    return () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
    };
  };
  
  const stopListening = () => {
    setIsListening(false);
    setIsSpeaking(false);
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
      silenceTimer.current = null;
    }
    activityCounter.current = 0;
    console.log('Stopped listening for voice activity');
  };
  
  // Handle voice activity detection
  const handleVoiceDetected = () => {
    // If not already speaking, start speaking state
    if (!isSpeaking) {
      setIsSpeaking(true);
      console.log('Voice activity started');
    }
    
    // Reset silence timer
    if (silenceTimer.current) {
      clearTimeout(silenceTimer.current);
    }
    
    // Set new silence timer
    silenceTimer.current = setTimeout(() => {
      // Speech ended after silence threshold
      setIsSpeaking(false);
      console.log('Voice activity ended');
    }, silenceThreshold) as ReturnType<typeof setTimeout>;
    
    // Increment activity counter
    activityCounter.current += 1;
  };
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (silenceTimer.current) {
        clearTimeout(silenceTimer.current);
      }
    };
  }, []);
  
  return {
    isListening,
    isSpeaking,
    error,
    startListening,
    stopListening,
    // For testing/demo purposes
    simulateVoiceDetected: handleVoiceDetected
  };
}