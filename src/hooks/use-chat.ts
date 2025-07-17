import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { apiEndpoints } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { makeAuthenticatedRequest } from '@/lib/auth';
import { transcribeWithWhisper } from '@/lib/groq';

export interface Message {
  id: string;
  content: string;
  role: string;
  message_type: string;
  stt_content: string;
  thread_id: string;
  created_at: string;
}

interface Thread {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  lastMessage?: string;
  messageCount?: number;
}

interface UseChat {
  // State [text]
  messages: Message[];
  threads: Thread[];
  activeThreadId: string | null;
  activeThread: Thread | undefined;
  isLoading: boolean;
  isLoadingThreads: boolean;

  // State [audio]
  isRecording: boolean;
  isAudioSupported: boolean;
  isFinalized: boolean;
  isCanceled: boolean;
  error: string | null;
  audioBlob: Blob | null;

  // Actions [text]
  createNewThread: () => Promise<void>;
  switchToThread: (threadId: string) => Promise<void>;
  sendTextMessage: (content: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  reportMessage: (messageId: string, reason?: string) => Promise<void>;

  // Actions [audio]
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  sendAudioMessage: (audioBlob: Blob) => Promise<void>;
}

export const useChat = (): UseChat => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

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

  // Initialize chat when user is available
  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  useEffect(() => {
    console.log('###DEBUG: useEffect', isFinalized, audioBlob, isCanceled);
    if (isFinalized && audioBlob && !isCanceled) {
      console.log('###DEBUG: isFinalized', isFinalized);
      console.log('###DEBUG: audioBlob', audioBlob);
      sendAudioMessage(audioBlob);
      setIsFinalized(false);
      setIsCanceled(false);
    }
    if (isFinalized) {
      setIsCanceled(false);
      setAudioBlob(null);
    }
  }, [isFinalized, audioBlob]);

  const initializeChat = async () => {
    setIsLoadingThreads(true);
    try {
      await loadAllThreads();
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chat.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingThreads(false);
    }
  };

  const loadAllThreads = async () => {
    if (!user) return;

    try {
      const { data: threadsData, error: threadsError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (threadsError) throw threadsError;

      if (threadsData && threadsData.length > 0) {
        setThreads(threadsData);
        // Auto-select the most recent thread
        const mostRecentThread = threadsData[0];
        setActiveThreadId(mostRecentThread.id);
        await loadMessages(mostRecentThread.id);
      } else {
        // No existing threads, create a new one
        await createNewThread();
      }
    } catch (error) {
      console.error('Error loading threads:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat threads.',
        variant: 'destructive',
      });
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error',
        description: 'Failed to load chat history.',
        variant: 'destructive',
      });
    }
  };

  const generateThreadTitle = (firstMessage: string): string => {
    // Generate a meaningful title from the first message
    const words = firstMessage.trim().split(' ');
    if (words.length <= 6) {
      return firstMessage;
    }
    return words.slice(0, 6).join(' ') + '...';
  };

  const updateThreadTimestamp = async (threadId: string) => {
    try {
      await supabase
        .from('chat_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);
    } catch (error) {
      console.error('Error updating thread timestamp:', error);
    }
  };

  const createNewThread = async (): Promise<void> => {
    if (!user) return;

    try {
      const newTitle = `Chat ${new Date().toLocaleString()}`;
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          title: newTitle,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const newThread = data;
      setThreads((prev) => [newThread, ...prev]);
      setActiveThreadId(newThread.id);
      setMessages([]);

      toast({
        title: 'New chat created',
        description: 'Started a new conversation.',
      });
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat thread.',
        variant: 'destructive',
      });
    }
  };

  const switchToThread = async (threadId: string): Promise<void> => {
    if (threadId === activeThreadId) return;

    setActiveThreadId(threadId);
    await loadMessages(threadId);
  };

  const deleteThread = async (threadId: string): Promise<void> => {
    try {
      // Delete messages first, then thread
      await supabase.from('chat_messages').delete().eq('thread_id', threadId);
      await supabase.from('chat_threads').delete().eq('id', threadId);

      // Update local state
      setThreads((prev) => prev.filter((t) => t.id !== threadId));

      // If we deleted the active thread, switch to another one or create new
      if (threadId === activeThreadId) {
        const remainingThreads = threads.filter((t) => t.id !== threadId);
        if (remainingThreads.length > 0) {
          await switchToThread(remainingThreads[0].id);
        } else {
          await createNewThread();
        }
      }

      toast({
        title: 'Thread deleted',
        description: 'The conversation has been deleted.',
      });
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete thread.',
        variant: 'destructive',
      });
    }
  };

  const renameThread = async (
    threadId: string,
    newTitle: string
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ title: newTitle })
        .eq('id', threadId);

      if (error) throw error;

      // Update local state
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === threadId ? { ...thread, title: newTitle } : thread
        )
      );

      toast({
        title: 'Thread renamed',
        description: 'The conversation title has been updated.',
      });
    } catch (error) {
      console.error('Error renaming thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to rename thread.',
        variant: 'destructive',
      });
    }
  };

  const reportMessage = async (
    messageId: string,
    reason?: string
  ): Promise<void> => {
    try {
      console.log('Message reported:', {
        messageId,
        reason,
        threadId: activeThreadId,
      });

      toast({
        title: 'Report submitted',
        description:
          'Thank you for your feedback. We will review this message.',
      });
    } catch (error) {
      console.error('Error reporting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const saveMessage = async (
    content: string,
    role: string,
    message_type: 'text' | 'audio',
    stt_content: string | null,
    threadId: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content,
          role,
          message_type,
          stt_content: stt_content || null,
          thread_id: threadId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const updateThreadTitle = async (userInput: string) => {
    // Update thread title if this is the first message
    const currentThread = threads.find((t) => t.id === activeThreadId);
    if (currentThread && currentThread.title?.startsWith('Chat ')) {
      const newTitle = generateThreadTitle(userInput);
      await renameThread(activeThreadId, newTitle);
    }
  };

  const sendTextMessage = async (userInput: string): Promise<void> => {
    if (!activeThreadId || !user) return;

    // Save user message
    const userMessage = await saveMessage(
      userInput,
      'user',
      'text',
      null,
      activeThreadId
    );
    if (userMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }

    // Update thread title if this is the first message
    await updateThreadTitle(userInput);

    setIsLoading(true);

    try {
      // Use authenticated request with JWT token
      const response = await makeAuthenticatedRequest(
        apiEndpoints.chat.query(),
        {
          method: 'POST',
          body: JSON.stringify({
            query: userInput,
            thread_id: activeThreadId,
            use_agentic: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = await saveMessage(
        data.answer ||
          "I apologize, but I couldn't generate a response. Please try again.",
        'assistant',
        'text',
        null,
        activeThreadId
      );

      if (assistantMessage) {
        setMessages((prev) => [...prev, assistantMessage]);
      }

      // Update thread timestamp
      await updateThreadTimestamp(activeThreadId);

      // Update threads order
      setThreads((prev) => {
        const updated = [...prev];
        const threadIndex = updated.findIndex((t) => t.id === activeThreadId);
        if (threadIndex > 0) {
          const [thread] = updated.splice(threadIndex, 1);
          updated.unshift({ ...thread, updated_at: new Date().toISOString() });
        }
        return updated;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description:
          'Failed to send message. Please check your connection and try again.',
        variant: 'destructive',
      });

      const errorMessage = await saveMessage(
        "I'm having trouble connecting right now. Please try again in a moment.",
        'assistant',
        'text',
        '',
        activeThreadId
      );
      if (errorMessage) {
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFileToS3 = useCallback(
    async (file_blob: Blob, threadId: string) => {
      const fileName = `${threadId}-${Date.now()}.mp3`;

      // get presigned url from the FastAPI endpoint
      const presigned_url_response = await makeAuthenticatedRequest(
        apiEndpoints.app.s3.uploadUrl(),
        {
          method: 'POST',
          body: JSON.stringify({
            bucket_name: 'audio-rag',
            object_name: fileName,
            expiration: 3600,
            region_name: 'us-east-1',
          }),
        }
      );

      if (!presigned_url_response.ok) {
        throw new Error(`HTTP error! status: ${presigned_url_response.status}`);
      }

      const presigned_url_data = await presigned_url_response.json();
      const presignedUrl = presigned_url_data.presigned_url;

      // upload the audio blob to the presigned url
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file_blob,
      });

      if (!uploadResponse.ok) {
        throw new Error(`HTTP error! status: ${uploadResponse.status}`);
      }

      return {
        status: 'success',
        event: 'upload_file_to_s3',
        metadata: presigned_url_data,
      };
    },
    []
  );

  const sendAudioMessage = async (audioBlob: Blob): Promise<void> => {
    if (!activeThreadId || !user) return;

    setIsLoading(true);
    // Upload the audio to S3
    console.log('###DEBUG: Send audio');
    // upload audio to s3 and save to DB
    const uploadFileToS3Response = await uploadFileToS3(
      audioBlob,
      activeThreadId
    );
    if (uploadFileToS3Response.status !== 'success') {
      throw new Error(`HTTP error! status: ${uploadFileToS3Response.status}`);
    }

    console.log('###DEBUG: uploadFileToS3Response', uploadFileToS3Response);

    // Get the transcription from the audio
    const transcription = await transcribeWithWhisper(audioBlob);
    console.log('###DEBUG: transcription', transcription);

    // Save the user audio message
    const userAudioMessage = await saveMessage(
      '__AUDIO__',
      'user',
      'audio',
      transcription.text,
      activeThreadId
    );
    if (userAudioMessage) {
      setMessages((prev) => [...prev, userAudioMessage]);
    }

    await updateThreadTitle(transcription.text);

    setIsLoading(true);

    // GENERATE RESPONSE
    try {
      // Use authenticated request with JWT token
      const response = await makeAuthenticatedRequest(
        apiEndpoints.chat.query(),
        {
          method: 'POST',
          body: JSON.stringify({
            query: transcription.text,
            thread_id: activeThreadId,
            use_agentic: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage = await saveMessage(
        data.answer ||
          "I apologize, but I couldn't generate a response. Please try again.",
        'assistant',
        'text',
        null,
        activeThreadId
      );

      if (assistantMessage) {
        setMessages((prev) => [...prev, assistantMessage]);
      }

      // Update the thread timestamp
      await updateThreadTimestamp(activeThreadId);

      // Update the threads order
      setThreads((prev) => {
        const updated = [...prev];
        const threadIndex = updated.findIndex((t) => t.id === activeThreadId);
        if (threadIndex > 0) {
          const [thread] = updated.splice(threadIndex, 1);
          updated.unshift({ ...thread, updated_at: new Date().toISOString() });
        }
        return updated;
      });
    } catch (error) {
      console.error('Error sending audio message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send audio message. Please try again.',
        variant: 'destructive',
      });

      const errorMessage = await saveMessage(
        "I'm having trouble connecting right now. Please try again in a moment.",
        'assistant',
        'text',
        '',
        activeThreadId
      );
      if (errorMessage) {
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

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
        console.log('###DEBUG: set audioblob', blob);
        setAudioBlob(blob);
        setIsRecording(false);
        setIsFinalized(true);
        cleanup();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      console.log('###DEBUG: Begin recording');
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to start recording'
      );
      cleanup();
    }
  }, [isAudioSupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      console.log('###DEBUG: Stop recording');
      return audioBlob;
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    setIsCanceled(true);
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setAudioBlob(null);
      setIsRecording(false);
      chunksRef.current = [];
    }
    cleanup();
  }, [isRecording]);

  const cleanup = useCallback(() => {
    // Stop all tracks to release microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return {
    // State
    messages,
    threads,
    activeThreadId,
    activeThread,
    isLoading,
    isLoadingThreads,
    isRecording,
    isAudioSupported,
    isFinalized,
    isCanceled,
    error,
    audioBlob,

    // Actions
    createNewThread,
    switchToThread,
    sendTextMessage,
    sendAudioMessage,
    deleteThread,
    renameThread,
    reportMessage,
    startRecording,
    stopRecording,
    cancelRecording,
  };
};
