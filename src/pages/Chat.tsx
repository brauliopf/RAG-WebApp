
import { useState, useEffect } from 'react';
import { Plus, Cloud } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { apiEndpoints } from '@/lib/config';
import { Header } from '@/components/layout';
import { Conversation, MessageInput } from '@/components/chat';
import { useAuth } from '@/contexts/AuthContext';
import { makeAuthenticatedRequest } from '@/lib/auth';

interface Message {
  id: string;
  content: string;
  role: string;
  thread_id: string;
  created_at: string;
}

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>('');

  useEffect(() => {
    if (user) {
      initializeChat();
    }
  }, [user]);

  const initializeChat = async () => {
    try {
      // First, try to get the most recent thread for the user
      const { data: existingThreads, error: threadsError } = await supabase
        .from('chat_threads')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (threadsError) throw threadsError;

      if (existingThreads && existingThreads.length > 0) {
        // Load the most recent thread and its messages
        const recentThread = existingThreads[0];
        setThreadId(recentThread.id);
        setThreadTitle(recentThread.title || 'New Chat');
        await loadMessages(recentThread.id);
      } else {
        // No existing threads, create a new one
        await createNewThread();
      }
    } catch (error) {
      console.error('Error initializing chat:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chat.',
        variant: 'destructive',
      });
    }
  };

  const createNewThread = async () => {
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
      setThreadId(data.id);
      setThreadTitle(newTitle);
      // Clear messages for new thread
      setMessages([]);
    } catch (error) {
      console.error('Error creating thread:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chat thread.',
        variant: 'destructive',
      });
    }
  };

  const loadMessages = async (currentThreadId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('thread_id', currentThreadId)
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

  const saveMessage = async (content: string, role: string) => {
    if (!threadId) return;

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

  const handleSendMessage = async (userInput: string) => {
    if (!threadId || !user) return;

    const userMessage = await saveMessage(userInput, 'user');
    if (userMessage) {
      setMessages((prev) => [...prev, userMessage]);
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
            thread_id: threadId,
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
        'assistant'
      );

      if (assistantMessage) {
        setMessages((prev) => [...prev, assistantMessage]);
      }
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
        'assistant'
      );
      if (errorMessage) {
        setMessages((prev) => [...prev, errorMessage]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = async () => {
    await createNewThread();
  };

  const handleReportMessage = async (messageId: string, reason?: string) => {
    try {
      console.log('Message reported:', { messageId, reason, threadId });

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

  const headerActions = [
    {
      label: 'New Chat',
      onClick: startNewChat,
      variant: 'outline' as const,
      mobileIcon: (
        <div className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <Cloud className="h-4 w-4" />
        </div>
      ),
      icon: (
        <div className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <Cloud className="h-4 w-4" />
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header subtitle={threadTitle} actions={headerActions} logoTo="/" />

      {/* Chat Container */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="h-[600px] flex flex-col shadow-xl border-0">
          <Conversation
            messages={messages}
            isLoading={isLoading}
            onReportMessage={handleReportMessage}
          />
          <MessageInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={!threadId}
          />
        </Card>
      </div>
    </div>
  );
};

export default Chat;
