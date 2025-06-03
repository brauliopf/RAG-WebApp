import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link to="/" className="flex items-center space-x-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Document Manager
                </h1>
              </Link>
            </div>
            <Link to="/rag">
              <Button variant="outline">Back to Chat</Button>
            </Link>
          </div>
        </div>
      </div>

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
