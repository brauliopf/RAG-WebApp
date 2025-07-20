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
  loadDocuments as loadAllDocuments,
} from '@/components/knowledge-base';
import { supabase } from '@/integrations/supabase/client';

const FEATURE_FLAG_KEY = 'add_content_collections';

const KnowledgeBase = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeCollectionIds, setActiveCollectionIds] = useState<string[]>([]);
  const [showCollectionToggles, setShowCollectionToggles] = useState(false);
  const [flagLoading, setFlagLoading] = useState(true);

  useEffect(() => {
    setFlagLoading(true);
    supabase
      .from('feature_flags')
      .select('enabled')
      .eq('key', FEATURE_FLAG_KEY)
      .single()
      .then(({ data }) => {
        setShowCollectionToggles(!!data?.enabled);
        setFlagLoading(false);
      });
  }, []);

  useEffect(() => {
    if (user) {
      loadDocumentsData();
    }
  }, [user]);

  const loadDocumentsData = async () => {
    try {
      const docs = await loadDocuments(user.id);
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

  const handleActivateCollection = async (group: any) => {
    if (!user) return;
    await activateDocGroup(user.id, group.id);
    setActiveCollectionIds((prev) =>
      prev.includes(group.id) ? prev : [...prev, group.id]
    );
  };

  const handleDeactivateCollection = async (collectionId: string) => {
    if (!user) return;
    // Extract group id from collectionId (format: 'collection-{group.id}')
    const match = collectionId.match(/^collection-(\d+)$/);
    if (!match) return;
    const groupId = match[1];
    await deactivateDocGroup(user.id, groupId);
    setActiveCollectionIds((prev) => prev.filter((id) => id !== groupId));
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
        {/* Documents List Section */}
        <div className="flex flex-col">
          <DocumentsList
            documents={documents}
            onDocumentDeleted={(id) => {
              if (id.startsWith('collection-')) {
                handleDeactivateCollection(id);
              } else {
                handleDocumentDeleted(id);
              }
            }}
            onDocumentUpdated={handleDocumentUpdated}
          />
          {/* Curated Document Groups Section (feature flag controlled) */}
          {flagLoading ? (
            <div className="text-gray-400 py-8">Loading feature flags...</div>
          ) : showCollectionToggles ? (
            <CuratedDocGroups
              onActivate={handleActivateCollection}
              onDeactivate={async (group) => {
                if (!user) return;
                await deactivateDocGroup(user.id, group.id);
                setActiveCollectionIds((prev) =>
                  prev.filter((id) => id !== group.id)
                );
                setDocuments((prev) =>
                  prev.filter((doc) => doc.id !== `collection-${group.id}`)
                );
              }}
              selectedGroups={activeCollectionIds}
            />
          ) : null}
        </div>
        {/* Document Upload Section */}
        <DocumentUpload
          onDocumentAdded={handleDocumentAdded}
          documents={documents}
        />
        {/* URL Ingestion Section */}
        {/* <UrlIngestion onDocumentAdded={handleDocumentAdded} /> */}
      </div>
    </div>
  );
};

export default KnowledgeBase;
