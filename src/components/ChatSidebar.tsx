
import { useState, useEffect } from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  currentThreadId: string | null;
  onThreadSelect: (threadId: string) => void;
  onNewThread: () => void;
}

const ChatSidebar = ({ currentThreadId, onThreadSelect, onNewThread }: ChatSidebarProps) => {
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  useEffect(() => {
    loadThreads();
  }, []);

  const loadThreads = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_threads')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setThreads(data || []);
    } catch (error) {
      console.error('Error loading threads:', error);
      toast({
        title: "Error",
        description: "Failed to load chat threads.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateThreadTitle = async (threadId: string, newTitle: string) => {
    try {
      const { error } = await supabase
        .from('chat_threads')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('id', threadId);

      if (error) throw error;
      
      setThreads(prev => prev.map(thread => 
        thread.id === threadId 
          ? { ...thread, title: newTitle, updated_at: new Date().toISOString() }
          : thread
      ));
      
      setEditingId(null);
      setEditTitle("");
    } catch (error) {
      console.error('Error updating thread title:', error);
      toast({
        title: "Error",
        description: "Failed to update thread title.",
        variant: "destructive",
      });
    }
  };

  const deleteThread = async (threadId: string) => {
    try {
      // Delete messages first
      await supabase
        .from('chat_messages')
        .delete()
        .eq('thread_id', threadId);

      // Then delete the thread
      const { error } = await supabase
        .from('chat_threads')
        .delete()
        .eq('id', threadId);

      if (error) throw error;
      
      setThreads(prev => prev.filter(thread => thread.id !== threadId));
      
      // If we deleted the current thread, create a new one
      if (threadId === currentThreadId) {
        onNewThread();
      }
      
      toast({
        title: "Success",
        description: "Thread deleted successfully.",
      });
    } catch (error) {
      console.error('Error deleting thread:', error);
      toast({
        title: "Error",
        description: "Failed to delete thread.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (thread: ChatThread) => {
    setEditingId(thread.id);
    setEditTitle(thread.title || "");
  };

  const handleKeyPress = (e: React.KeyboardEvent, threadId: string) => {
    if (e.key === 'Enter') {
      updateThreadTitle(threadId, editTitle);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditTitle("");
    }
  };

  if (isLoading) {
    return (
      <div className="w-80 bg-gray-50 border-r p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 border-r flex flex-col h-full">
      <div className="p-4 border-b">
        <Button 
          onClick={onNewThread} 
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Chat
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {threads.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No chat threads yet</p>
            <p className="text-sm">Create your first chat!</p>
          </div>
        ) : (
          threads.map((thread) => (
            <Card 
              key={thread.id} 
              className={`p-3 cursor-pointer transition-all hover:shadow-md group ${
                currentThreadId === thread.id 
                  ? "bg-blue-100 border-blue-300" 
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => onThreadSelect(thread.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {editingId === thread.id ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, thread.id)}
                      onBlur={() => updateThreadTitle(thread.id, editTitle)}
                      className="text-sm h-8"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="font-medium text-sm truncate"
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        startEditing(thread);
                      }}
                    >
                      {thread.title || "Untitled Chat"}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(thread.updated_at || thread.created_at).toLocaleDateString()}
                  </div>
                </div>
                
                <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteThread(thread.id);
                    }}
                    className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
