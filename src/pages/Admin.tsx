import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Header } from '@/components/layout';
import { useAuth } from '@/contexts/AuthContext';
import {
  DocumentUpload,
  UrlIngestion,
  DocumentsList,
  Document,
  loadDocuments,
  CuratedDocGroups,
  activateDocGroup,
  deactivateDocGroup,
} from '@/components/admin';

const Admin = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    if (user) {
      loadDocumentsData();
    }
  }, [user]);

  const loadDocumentsData = async () => {
    try {
      const docs = await loadDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents.',
        variant: 'destructive',
      });
    }
  };

  const handleDocumentAdded = (document: Document) => {
    setDocuments((prev) => {
      // Check if document already exists (for status updates)
      const existingIndex = prev.findIndex((doc) => doc.id === document.id);
      if (existingIndex >= 0) {
        // Update existing document
        const updated = [...prev];
        updated[existingIndex] = document;
        return updated;
      } else {
        // Add new document
        return [document, ...prev];
      }
    });
  };

  const handleDocumentDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleDocumentUpdated = (document: Document) => {
    setDocuments((prev) =>
      prev.map((doc) => (doc.id === document.id ? document : doc))
    );
  };

  const headerActions = [
    {
      label: 'Back to Chat',
      to: '/rag',
      variant: 'outline' as const,
      icon: <MessageSquare className="h-4 w-4" />,
    },
  ];

  return (
    <div className="h-full min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      <Header
        subtitle="Knowledge Base Manager"
        actions={headerActions}
        logoTo="/"
      />

      <div className="container mx-auto px-6 py-8 max-w-6xl flex-1">
        {/* Curated Document Groups Section */}
        <CuratedDocGroups
          onActivate={async (group) => {
            if (!user) return;
            try {
              await activateDocGroup(user.id, group.id);
            } catch (error) {
              console.error('Error activating group:', error);
            }
          }}
          onDeactivate={async (group) => {
            if (!user) return;
            try {
              await deactivateDocGroup(user.id, group.id);
            } catch (error) {
              console.error('Error deactivating group:', error);
            }
          }}
        />
        {/* Document Upload Section */}
        <DocumentUpload
          onDocumentAdded={handleDocumentAdded}
          documents={documents}
        />

        {/* URL Ingestion Section */}
        <UrlIngestion onDocumentAdded={handleDocumentAdded} />

        {/* Documents List Section */}
        <DocumentsList
          documents={documents}
          onDocumentDeleted={handleDocumentDeleted}
          onDocumentUpdated={handleDocumentUpdated}
        />
      </div>
    </div>
  );
};

export default Admin;
