import { supabase } from '@/integrations/supabase/client';
import { Document, DocGroup, ProfileDocGroup } from './types';
import { getFileType } from './utils';
import { makeAuthenticatedRequest } from '@/lib/auth';
import { apiEndpoints } from '@/lib/config';

export const saveDocumentToSupabase = async (
  file: File,
  status: Document['status'] = 'processing'
): Promise<Document | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
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

export const loadDocGroups = async (user_id?: string): Promise<DocGroup[]> => {
  let query = (supabase as any)
    .from('doc_groups')
    .select(
      user_id
        ? '*, pdocg:profile_doc_group!left(doc_group_id,deactivated_at)'
        : '*'
    )
    .is('deleted_at', null);

  if (user_id) {
    query = query
      .eq('pdocg.profile_id', user_id)
      .is('pdocg.deactivated_at', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as DocGroup[];
};

// Activate a doc group for a user
export const activateDocGroup = async (
  profile_id: string,
  doc_group_id: string
): Promise<ProfileDocGroup[]> => {
  // 1. Update Supabase
  const { data, error } = await (supabase as any)
    .from('profile_doc_group')
    .upsert(
      {
        profile_id,
        doc_group_id,
        activated_at: new Date().toISOString(),
        deactivated_at: null,
      },
      { onConflict: 'profile_id,doc_group_id' }
    )
    .select();
  if (error) throw error;

  // 2. Update Redis
  await syncUserDocGroupsToRedis(profile_id);

  return data as ProfileDocGroup[];
};

// Deactivate a doc group for a user
export const deactivateDocGroup = async (
  profile_id: string,
  doc_group_id: string
): Promise<ProfileDocGroup[]> => {
  const { data, error } = await (supabase as any)
    .from('profile_doc_group')
    .update({
      deactivated_at: new Date().toISOString(),
    })
    .eq('profile_id', profile_id)
    .eq('doc_group_id', doc_group_id)
    .is('deactivated_at', null) // Only update if currently active
    .select();
  if (error) throw error;

  await syncUserDocGroupsToRedis(profile_id);

  return data as ProfileDocGroup[];
};

// Sync user's active doc_group.db_id list to Redis
export const syncUserDocGroupsToRedis = async (profile_id: string) => {
  // 1. Get all active doc_group_ids
  const { data: activeGroups, error } = await supabase
    .from('profile_doc_group')
    .select('doc_group_id')
    .eq('profile_id', profile_id)
    .is('deactivated_at', null);
  if (error) throw error;

  const docGroupIds = (activeGroups || [])
    .map((g: any) => g.doc_group_id)
    .filter(Boolean);
  if (docGroupIds.length === 0) {
    // Optionally clear Redis if no groups
    await makeAuthenticatedRequest(apiEndpoints.redis.set(), {
      method: 'POST',
      body: JSON.stringify({ key: profile_id, value: '' }),
    });
    return;
  }

  // 2. Get db_ids for those groups
  const { data: docGroups, error: docGroupError } = await supabase
    .from('doc_groups')
    .select('db_id')
    .in('id', docGroupIds);
  if (docGroupError) throw docGroupError;

  const dbIds = (docGroups || []).map((g: any) => g.db_id).filter(Boolean);
  const value = dbIds.join(',');

  // 3. Update Redis
  await makeAuthenticatedRequest(apiEndpoints.redis.set(), {
    method: 'POST',
    body: JSON.stringify({ key: profile_id, value }),
  });
};
