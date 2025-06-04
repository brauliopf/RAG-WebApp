import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { apiEndpoints } from '@/lib/config';
import { Conversation, MessageInput } from '@/components/chat';

interface Message {
  id: string;
  content: string;
  role: string;
  thread_id: string;
  created_at: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>('');

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      // First, try to get the most recent thread
      const { data: existingThreads, error: threadsError } = await supabase
        .from('chat_threads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (threadsError) throw threadsError;

      if (existingThreads && existingThreads.length > 0) {
        // Load the most recent thread and its messages
        const recentThread = existingThreads[0];
        setThreadId(recentThread.id);
        setThreadTitle(recentThread.title);
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
    try {
      const newTitle = `Chat ${new Date().toLocaleString()}`;
      const { data, error } = await supabase
        .from('chat_threads')
        .insert({
          title: newTitle,
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
    if (!threadId) return;

    const userMessage = await saveMessage(userInput, 'user');
    if (userMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiEndpoints.chat.query(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userInput,
          thread_id: threadId,
          use_agentic: true,
        }),
      });

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
      // Here you would typically send the report to your backend
      // For now, we'll just log it and show a success message
      console.log('Message reported:', { messageId, reason, threadId });

      // You could add an API call here to save the report to your database
      // Example:
      // await supabase
      //   .from('message_reports')
      //   .insert({
      //     message_id: messageId,
      //     thread_id: threadId,
      //     reason: reason,
      //     reported_at: new Date().toISOString(),
      //   });

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  RAG Assistant
                </h1>
              </Link>
              {threadTitle && (
                <div className="hidden md:block">
                  <span className="text-sm text-gray-500">•</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {threadTitle}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={startNewChat}>
                New Chat
              </Button>
              <Link to="/rag/admin">
                <Button variant="outline">Manage Documents</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

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
