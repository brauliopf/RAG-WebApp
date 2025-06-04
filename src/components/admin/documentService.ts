import { supabase } from '@/integrations/supabase/client';
import { Document } from './types';
import { getFileType } from './utils';

export const saveDocumentToSupabase = async (
  file: File,
  status: Document['status'] = 'processing'
): Promise<Document | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: file.name,
        file_type: getFileType(file),
        file_size: file.size,
        pinecone_id: null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, status };
  } catch (error) {
    console.error('Error saving document:', error);
    return null;
  }
};

export const saveUrlToSupabase = async (
  url: string,
  tags: string[]
): Promise<Document | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('documents')
      .insert({
        title: url.trim(),
        file_type: 'url',
        file_size: 0, // Empty size for URLs
        metadata: tags.length > 0 ? tags.join(',') : null,
        pinecone_id: null,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, status: 'processing' as const };
  } catch (error) {
    console.error('Error saving URL to Supabase:', error);
    return null;
  }
};

export const updateDocumentStatus = async (
  id: string,
  status: Document['status'],
  pinecone_id?: string
): Promise<void> => {
  try {
    const updateData: any = {};
    if (pinecone_id) {
      updateData.pinecone_id = pinecone_id;
    }

    const { error } = await supabase
      .from('documents')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating document:', error);
  }
};

export const deleteDocumentFromSupabase = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
};

export const loadDocuments = async (): Promise<Document[]> => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .is('deleted_at', null) // Only load non-deleted documents
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((doc) => ({
    ...doc,
    status: doc.pinecone_id ? ('completed' as const) : ('processing' as const),
  }));
};
