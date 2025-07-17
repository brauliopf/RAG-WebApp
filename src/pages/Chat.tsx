import { useState } from 'react';
import { Plus, MessageSquare, Menu, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout';
import { Conversation, MessageInput, ThreadList } from '@/components/chat';
import { useChat } from '@/hooks/use-chat';

const Chat = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const {
    messages,
    audioBlob,
    activeThreadId,
    threads,
    isLoading,
    isLoadingThreads,
    isRecording,
    isAudioSupported,
    isCanceled,
    error,
    sendTextMessage,
    sendAudioMessage,
    createNewThread,
    switchToThread,
    deleteThread,
    renameThread,
    reportMessage,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useChat();

  const handleThreadSelect = (threadId: string) => {
    switchToThread(threadId);
    setIsSidebarOpen(false);
  };

  const headerActions = [
    {
      label: 'New Chat',
      onClick: createNewThread,
      variant: 'outline' as const,
      mobileIcon: (
        <div className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <MessageSquare className="h-4 w-4" />
        </div>
      ),
      icon: (
        <div className="flex items-center space-x-1">
          <Plus className="h-4 w-4" />
          <MessageSquare className="h-4 w-4" />
        </div>
      ),
    },
  ];

  return (
    <div className="h-full min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <Header subtitle="Chat" actions={headerActions} logoTo="/" />

      {/* Chat Container */}
      <div className="container mx-auto px-4 md:px-6 py-4 md:py-8 max-w-7xl flex-1 flex flex-col">
        <div className="flex gap-6 flex-1 min-h-0">
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
              w-80 h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)]
              flex flex-col shadow-xl border-0 z-40
              md:z-auto overflow-hidden
            `}
          >
            <div className="flex-1 overflow-y-auto">
              <ThreadList
                threads={threads}
                activeThreadId={activeThreadId}
                onThreadSelect={handleThreadSelect}
                onNewThread={createNewThread}
                onDeleteThread={deleteThread}
                onRenameThread={renameThread}
                isLoading={isLoadingThreads}
              />
            </div>
          </Card>

          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Chat Area */}
          <Card className="flex-1 flex flex-col shadow-xl border-0 ml-0 md:ml-0 min-h-0 h-[calc(100vh-4rem)] md:h-[calc(100vh-8rem)]">
            <div className="flex-1 overflow-y-auto">
              <Conversation
                messages={messages}
                isLoading={isLoading}
                onReportMessage={reportMessage}
              />
            </div>
            <MessageInput
              onSendAudio={sendAudioMessage}
              onSendMessage={sendTextMessage}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onCancelRecording={cancelRecording}
              isLoading={isLoading}
              disabled={!activeThreadId}
              threadId={activeThreadId}
              isRecording={isRecording}
              isAudioSupported={isAudioSupported}
              error={error}
              audioBlob={audioBlob}
              isCanceled={isCanceled}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Chat;
