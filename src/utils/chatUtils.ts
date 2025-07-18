import { Thread } from '@/types/chat';

export const generateThreadTitle = (firstMessage: string): string => {
  // Generate a meaningful title from the first message
  const words = firstMessage.trim().split(' ');
  if (words.length <= 6) {
    return firstMessage;
  }
  return words.slice(0, 6).join(' ') + '...';
};

export const updateThreadsOrder = (
  threads: Thread[],
  activeThreadId: string
): Thread[] => {
  const updated = [...threads];
  const threadIndex = updated.findIndex((t) => t.id === activeThreadId);
  if (threadIndex > 0) {
    const [thread] = updated.splice(threadIndex, 1);
    updated.unshift({ ...thread, updated_at: new Date().toISOString() });
  }
  return updated;
};

export const shouldUpdateThreadTitle = (thread: Thread): boolean => {
  return thread.title?.startsWith('Chat ') || false;
};
