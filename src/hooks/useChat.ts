import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { apiEndpoints } from '@/lib/config';
import { useAuth } from '@/contexts/AuthContext';
import { makeAuthenticatedRequest } from '@/lib/auth';

interface Message {
  id: string;
  content: string;
  role: string;
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
  // State
  messages: Message[];
  threads: Thread[];
  activeThreadId: string | null;
  activeThread: Thread | undefined;
  isLoading: boolean;
  isLoadingThreads: boolean;

  // Actions
  createNewThread: () => Promise<void>;
  switchToThread: (threadId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  renameThread: (threadId: string, newTitle: string) => Promise<void>;
  reportMessage: (messageId: string, reason?: string) => Promise<void>;
}

export const useChat = (): UseChat => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);

  // Initialize chat when user is available
  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

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

  const saveMessage = async (
    content: string,
    role: string,
    threadId: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content,
          role,
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

  const sendMessage = async (userInput: string): Promise<void> => {
    if (!activeThreadId || !user) return;

    // Save user message
    const userMessage = await saveMessage(userInput, 'user', activeThreadId);
    if (userMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }

    // Update thread title if this is the first message
    const currentThread = threads.find((t) => t.id === activeThreadId);
    if (currentThread && currentThread.title?.startsWith('Chat ')) {
      const newTitle = generateThreadTitle(userInput);
      await renameThread(activeThreadId, newTitle);
    }

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
        activeThreadId
      );
      if (errorMessage) {
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
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

  const activeThread = threads.find((t) => t.id === activeThreadId);

  return {
    // State
    messages,
    threads,
    activeThreadId,
    activeThread,
    isLoading,
    isLoadingThreads,

    // Actions
    createNewThread,
    switchToThread,
    sendMessage,
    deleteThread,
    renameThread,
    reportMessage,
  };
};
