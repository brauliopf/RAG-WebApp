import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { Header } from '@/components/layout';
import {
  DocumentUpload,
  UrlIngestion,
  DocumentsList,
  Document,
  loadDocuments,
} from '@/components/admin';

const Admin = () => {
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocumentsData();
  }, []);

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
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <Header
        subtitle="Knowledge Base Manager"
        actions={headerActions}
        logoTo="/"
      />

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Document Upload Section */}
        <DocumentUpload onDocumentAdded={handleDocumentAdded} />

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
