import { useRef, useEffect } from 'react';
import { Bot, User, Loader2 } from 'lucide-react';
import ReportMessageDialog from './ReportMessageDialog';
import { Message } from '@/hooks/use-chat';

interface ConversationProps {
  messages: Message[];
  isLoading: boolean;
  onReportMessage?: (messageId: string, reason?: string) => void;
}

const Conversation = ({
  messages,
  isLoading,
  onReportMessage,
}: ConversationProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleReportMessage = (messageId: string, reason?: string) => {
    if (onReportMessage) {
      onReportMessage(messageId, reason);
    }
    // If no onReportMessage handler is provided, the ReportMessageDialog
    // will still show the toast confirmation to the user
  };

  return (
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
            className={`flex w-full ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3`}
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
              className={`p-4 rounded-2xl flex-1 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {message.message_type === 'text'
                  ? message.content
                  : message.stt_content}
              </p>
              <div className="flex items-center justify-between mt-2">
                <p
                  className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}
                >
                  {new Date(message.created_at).toLocaleTimeString()}
                </p>
                {message.role === 'assistant' && (
                  <ReportMessageDialog
                    messageId={message.id}
                    onReport={handleReportMessage}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="flex items-start space-x-3 w-full">
            <div className="p-2 rounded-full bg-gray-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="p-4 rounded-2xl bg-gray-100 rounded-bl-md flex-1">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                <span className="text-gray-600">...</span>
              </div>
            </div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default Conversation;
