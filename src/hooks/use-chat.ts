import { useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { transcribeWithWhisper } from '@/lib/groq';
import { Message, Thread, UseChat } from '@/types/chat';
import { ChatService } from '@/services/chatService';
import { ChatApiService } from '@/services/chatApiService';
import { AudioService } from '@/services/audioService';
import { useAudioRecording } from '@/hooks/use-audio-recording';
import {
  generateThreadTitle,
  updateThreadsOrder,
  shouldUpdateThreadTitle,
} from '@/utils/chatUtils';

export const useChat = (): UseChat => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Audio recording hook
  const {
    isRecording,
    isAudioSupported,
    isFinalized,
    isCanceled,
    error,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecording();

  // Initialize chat when user is available
  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  useEffect(() => {
    if (isFinalized && audioBlob && !isCanceled) {
      sendAudioMessage(audioBlob);
    }
  }, [isFinalized, audioBlob, isCanceled]);

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
      const threadsData = await ChatService.loadAllThreads(user.id);

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
      const data = await ChatService.loadMessages(threadId);
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

  const createNewThread = async (): Promise<void> => {
    if (!user) return;

    try {
      const newTitle = `Chat ${new Date().toLocaleString()}`;
      const newThread = await ChatService.createThread(user.id, newTitle);

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
      await ChatService.deleteThread(threadId);

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
      await ChatService.renameThread(threadId, newTitle);

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

  const updateThreadTitle = async (userInput: string) => {
    // Update thread title if this is the first message
    const currentThread = threads.find((t) => t.id === activeThreadId);
    if (currentThread && shouldUpdateThreadTitle(currentThread)) {
      const newTitle = generateThreadTitle(userInput);
      await renameThread(activeThreadId, newTitle);
    }
  };

  const sendTextMessage = async (userInput: string): Promise<void> => {
    if (!activeThreadId || !user) return;

    // Save user message
    const userMessage = await ChatService.saveMessage(
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
      const data = await ChatApiService.sendMessage(
        userInput,
        activeThreadId,
        true
      );

      const assistantMessage = await ChatService.saveMessage(
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
      await ChatService.updateThreadTimestamp(activeThreadId);

      // Update threads order
      setThreads((prev) => updateThreadsOrder(prev, activeThreadId));
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description:
          'Failed to send message. Please check your connection and try again.',
        variant: 'destructive',
      });

      const errorMessage = await ChatService.saveMessage(
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

  const sendAudioMessage = async (audioBlob: Blob): Promise<void> => {
    if (!activeThreadId || !user) return;

    setIsLoading(true);

    try {
      // // Upload the audio to S3
      // const uploadFileToS3Response = await AudioService.uploadFileToS3(
      //   audioBlob,
      //   activeThreadId
      // );
      // if (uploadFileToS3Response.status !== 'success') {
      //   throw new Error(`HTTP error! status: ${uploadFileToS3Response.status}`);
      // }

      // Get the transcription from the audio
      const transcription = await transcribeWithWhisper(audioBlob);

      // Save the user audio message
      const userAudioMessage = await ChatService.saveMessage(
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

      // GENERATE RESPONSE
      const data = await ChatApiService.sendMessage(
        transcription.text,
        activeThreadId,
        true
      );

      const assistantMessage = await ChatService.saveMessage(
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
      await ChatService.updateThreadTimestamp(activeThreadId);

      // Update the threads order
      setThreads((prev) => updateThreadsOrder(prev, activeThreadId));
    } catch (error) {
      console.error('Error sending audio message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send audio message. Please try again.',
        variant: 'destructive',
      });

      const errorMessage = await ChatService.saveMessage(
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
