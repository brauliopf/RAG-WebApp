export interface Message {
  id: string;
  content: string;
  role: string;
  message_type: string;
  stt_content: string;
  thread_id: string;
  created_at: string;
}

export interface Thread {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
  user_id: string | null;
  lastMessage?: string;
  messageCount?: number;
}

export interface UseChat {
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
