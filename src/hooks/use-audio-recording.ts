import { useState, useCallback, useRef } from 'react';

export interface UseAudioRecording {
  isRecording: boolean;
  isAudioSupported: boolean;
  isFinalized: boolean;
  isCanceled: boolean;
  error: string | null;
  audioBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
}

export const useAudioRecording = (): UseAudioRecording => {
  const [isRecording, setIsRecording] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const isAudioSupported = Boolean(
    navigator.mediaDevices?.getUserMedia && window.MediaRecorder
  );
  const [error, setError] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanup = useCallback(() => {
    // Stop all tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    if (!isAudioSupported) {
      setError('Audio recording is not supported in this browser');
      return;
    }

    try {
      setError(null);
      setAudioBlob(null);
      chunksRef.current = [];

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;

      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop event
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: 'audio/webm;codecs=opus',
        });
        setAudioBlob(blob);
        setIsRecording(false);
        setIsFinalized(true);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to start recording'
      );
      cleanup();
    }
  }, [isAudioSupported, cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      return audioBlob;
    }
  }, [isRecording, audioBlob]);

  const cancelRecording = useCallback(() => {
    setIsCanceled(true);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setAudioBlob(null);
      setIsRecording(false);
      chunksRef.current = [];
    }
    cleanup();
  }, [isRecording, cleanup]);

  return {
    isRecording,
    isAudioSupported,
    isFinalized,
    isCanceled,
    error,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
