import { useState, useEffect, useCallback, useRef } from 'react';

// Extend the global Window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export type SpeechState = 'idle' | 'listening' | 'transcribing' | 'error' | 'unsupported';

export function useSpeechRecognition() {
  const [state, setState] = useState<SpeechState>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setState('unsupported');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setState('listening');
      setErrorMsg(null);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'not-allowed') {
        setErrorMsg('Microphone access denied. Please allow microphone permissions.');
      } else {
        setErrorMsg(`Microphone error: ${event.error}`);
      }
      setState('error');
    };

    recognition.onend = () => {
      if (recognitionRef.current) {
        // If it stopped unexpectedly, but we meant to be listening, we could auto-restart.
        // But for simplicity and minimalism, we'll just set it to idle.
        setState('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (state === 'unsupported' || !recognitionRef.current) return;
    setTranscript('');
    setErrorMsg(null);
    try {
      recognitionRef.current.start();
      setState('listening');
    } catch (e) {
      console.error('Failed to start speech recognition', e);
    }
  }, [state]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    setState('transcribing');
    recognitionRef.current.stop();
    // After a brief delay for final events, return to idle
    setTimeout(() => {
      setState(prev => prev === 'transcribing' ? 'idle' : prev);
    }, 1000);
  }, []);

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening();
    } else {
      startListening();
    }
  }, [state, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    state,
    transcript,
    errorMsg,
    toggleListening,
    resetTranscript,
    isSupported: state !== 'unsupported'
  };
}
