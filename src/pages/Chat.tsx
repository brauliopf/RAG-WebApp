import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { apiEndpoints } from '@/lib/config';

interface Message {
  id: string;
  content: string;
  role: string;
  thread_id: string;
  created_at: string;
}

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadTitle, setThreadTitle] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const sendMessage = async () => {
    if (!inputValue.trim() || !threadId) return;

    const userMessage = await saveMessage(inputValue, 'user');
    if (userMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }

    const userInput = inputValue;
    setInputValue('');
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = async () => {
    await createNewThread();
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
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-16 w-16 text-blue-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  Welcome to RAG Assistant
                </h3>
                <p className="text-gray-500">
                  Start a conversation by asking questions about your documents.
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}
                >
                  <div
                    className={`p-2 rounded-full ${message.role === 'user' ? 'bg-blue-600 ml-3' : 'bg-gray-600 mr-3'}`}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div
                    className={`p-4 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-800 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}
                    >
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-full bg-gray-600">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-100 rounded-bl-md">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                      <span className="text-gray-600">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-6">
            <div className="flex space-x-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your documents..."
                className="flex-1 text-base py-3"
                disabled={isLoading || !threadId}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading || !threadId}
                className="bg-blue-600 hover:bg-blue-700 px-6"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
