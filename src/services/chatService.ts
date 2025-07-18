import { supabase } from '@/integrations/supabase/client';
import { Message, Thread } from '@/types/chat';

export class ChatService {
  static async loadAllThreads(userId: string): Promise<Thread[]> {
    const { data: threadsData, error: threadsError } = await supabase
      .from('chat_threads')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (threadsError) throw threadsError;
    return threadsData || [];
  }

  static async loadMessages(threadId: string): Promise<Message[]> {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async createThread(userId: string, title: string): Promise<Thread> {
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({
        title,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async deleteThread(threadId: string): Promise<void> {
    // Delete messages first, then thread
    await supabase.from('chat_messages').delete().eq('thread_id', threadId);
    await supabase.from('chat_threads').delete().eq('id', threadId);
  }

  static async renameThread(threadId: string, newTitle: string): Promise<void> {
    const { error } = await supabase
      .from('chat_threads')
      .update({ title: newTitle })
      .eq('id', threadId);

    if (error) throw error;
  }

  static async updateThreadTimestamp(threadId: string): Promise<void> {
    const { error } = await supabase
      .from('chat_threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);

    if (error) throw error;
  }

  static async saveMessage(
    content: string,
    role: string,
    message_type: 'text' | 'audio',
    stt_content: string | null,
    threadId: string
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          content,
          role,
          message_type,
          stt_content: stt_content || null,
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
  }
}
