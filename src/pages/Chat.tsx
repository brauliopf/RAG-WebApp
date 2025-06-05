import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout';
import { Conversation, MessageInput, ThreadList } from '@/components/chat';
import { useChat } from '@/hooks/useChat';

const Chat = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    messages,
    threads,
    activeThreadId,
    activeThread,
    isLoading,
    isLoadingThreads,
    createNewThread,
    switchToThread,
    sendMessage,
    deleteThread,
    renameThread,
    reportMessage,
  } = useChat();

  const handleThreadSelect = (threadId: string) => {
    switchToThread(threadId);
    // Close sidebar on mobile after selection
    setIsSidebarOpen(false);
  };

  const headerActions = [
    {
      label: 'New Chat',
      onClick: createNewThread,
      variant: 'outline' as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header subtitle="Chat" actions={headerActions} logoTo="/" />

      {/* Chat Container */}
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl">
        <div className="flex gap-6 h-[calc(100vh-200px)] md:h-[600px]">
          {/* Mobile Sidebar Toggle */}
          <Button
            variant="outline"
            size="sm"
            className="fixed top-20 left-4 z-50 md:hidden"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </Button>

          {/* Thread Sidebar */}
          <Card
            className={`
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              md:translate-x-0 transition-transform duration-300 ease-in-out
              fixed md:relative top-16 md:top-0 left-0 md:left-auto
              w-80 h-[calc(100vh-4rem)] md:h-full
              flex flex-col shadow-xl border-0 z-40
              md:z-auto
            `}
          >
            <ThreadList
              threads={threads}
              activeThreadId={activeThreadId}
              onThreadSelect={handleThreadSelect}
              onNewThread={createNewThread}
              onDeleteThread={deleteThread}
              onRenameThread={renameThread}
              isLoading={isLoadingThreads}
            />
          </Card>

          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Chat Area */}
          <Card className="flex-1 flex flex-col shadow-xl border-0 ml-0 md:ml-0">
            <Conversation
              messages={messages}
              isLoading={isLoading}
              onReportMessage={reportMessage}
            />
            <MessageInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
              disabled={!activeThreadId}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
