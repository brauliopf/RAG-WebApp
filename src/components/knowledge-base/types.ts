import { Tables } from '@/integrations/supabase/types';

export type Document = Tables<'documents'> & {
  status: 'processing' | 'completed' | 'error';
};

export interface DocumentUploadProps {
  onDocumentAdded: (document: Document) => void;
  documents?: Document[];
}

export interface UrlIngestionProps {
  onDocumentAdded: (document: Document) => void;
}

export interface DocumentsListProps {
  documents: Document[];
  onDocumentDeleted: (id: string) => void;
  onDocumentUpdated: (document: Document) => void;
}

export type DocGroup = {
  id: string;
  group_name: string;
  source_link?: string | null;
};

// Represents a user-group activation record
export type ProfileDocGroup = {
  id: string;
  profile_id: string;
  doc_group_id: string;
  activated_at: string | null;
  deactivated_at: string | null;
};
