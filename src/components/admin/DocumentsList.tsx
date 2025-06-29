import { useState } from 'react';
import {
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Link as LinkIcon,
  Folder,
  Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { DocumentsListProps, Document } from './types';
import { formatFileSize } from './utils';
import { deleteDocumentFromSupabase } from './documentService';
import { apiEndpoints } from '@/lib/config';
import { makeAuthenticatedRequest } from '@/lib/auth';

export const DocumentsList = ({
  documents,
  onDocumentDeleted,
}: DocumentsListProps) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const deleteDocument = async (id: string, title: string) => {
    try {
      // First, try to delete from the backend API
      try {
        const response = await makeAuthenticatedRequest(
          apiEndpoints.documents.delete(),
          {
            method: 'POST',
            body: JSON.stringify({
              doc_id: title,
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            `Backend deletion failed with status: ${response.status}`
          );
          // Continue with Supabase deletion even if backend fails
        }
      } catch (apiError) {
        console.warn('Backend API deletion failed:', apiError);
        // Continue with Supabase deletion even if backend fails
      }

      // Soft delete in Supabase database by setting deleted_at timestamp
      await deleteDocumentFromSupabase(id);

      // Notify parent component
      onDocumentDeleted(id);

      toast({
        title: 'Document deleted',
        description: 'The document has been removed from your knowledge base.',
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete document.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (document: Document) => {
    setDocumentToDelete(document);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    await deleteDocument(documentToDelete.id, documentToDelete.title);
    setIsDeleting(false);
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setDocumentToDelete(null);
  };

  return (
    <>
      <Card className="shadow-xl border-0">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Your Knowledge Base
          </CardTitle>
          <CardDescription>
            Manage your uploaded documents and their processing status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                No documents uploaded
              </h3>
              <p className="text-gray-500">
                Upload your first document to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    {doc.file_type === 'collection' ? (
                      <Folder className="h-8 w-8 text-blue-600" />
                    ) : doc.file_type === 'url' ? (
                      <a
                        href={doc.title}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <LinkIcon className="h-8 w-8 text-blue-600 hover:text-blue-800 transition-colors" />
                      </a>
                    ) : (
                      <FileText className="h-8 w-8 text-blue-600" />
                    )}
                    <div>
                      <h4 className="font-semibold break-all line-clamp-2 max-w-2xs overflow-hidden text-ellipsis">
                        {doc.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Uploaded{' '}
                        {doc.created_at
                          ? new Date(doc.created_at).toLocaleDateString()
                          : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-row w-full md:w-auto justify-end md:items-center md:ml-4 mt-2 md:mt-0">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(doc.status)}
                      <span className="text-sm capitalize">{doc.status}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(doc)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Do you want to proceed with removing{' '}
              <span className="font-semibold">{documentToDelete?.title}</span>{' '}
              from your knowledge base?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={cancelDelete}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
