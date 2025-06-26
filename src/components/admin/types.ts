import { Tables } from '@/integrations/supabase/types';

// Use the proper Supabase Document type
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
