import { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Bot,
  Link as LinkIcon,
  X,
  Plus,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

// Use the proper Supabase Document type
type Document = Tables<'documents'> & {
  status: 'processing' | 'completed' | 'error';
};

const Admin = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(
    null
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // URL ingestion state
  const [urlInput, setUrlInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isIngestingUrl, setIsIngestingUrl] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .is('deleted_at', null) // Only load non-deleted documents
        .order('created_at', { ascending: false });

      if (error) throw error;

      const documentsWithStatus = data.map((doc) => ({
        ...doc,
        status: doc.pinecone_id
          ? ('completed' as const)
          : ('processing' as const),
      }));

      setDocuments(documentsWithStatus);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error',
        description: 'Failed to load documents.',
        variant: 'destructive',
      });
    }
  };

  const saveDocumentToSupabase = async (
    file: File,
    status: Document['status'] = 'processing'
  ) => {
    try {
      // Map MIME types to database-compatible file types
      const getFileType = (file: File): string => {
        if (file.type === 'application/pdf') return 'pdf';
        if (file.type === 'text/markdown' || file.name.endsWith('.md'))
          return 'md';
        if (file.type === 'text/plain') return 'md'; // Treat plain text as markdown
        // Default fallback
        return 'md';
      };

      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          file_type: getFileType(file),
          file_size: file.size,
          pinecone_id: null,
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

  const updateDocumentStatus = async (
    id: string,
    status: Document['status'],
    pinecone_id?: string
  ) => {
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

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id ? { ...doc, status, pinecone_id } : doc
        )
      );
    } catch (error) {
      console.error('Error updating document:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/markdown', 'text/plain'];
    const isMarkdown = file.name.endsWith('.md');

    if (!allowedTypes.includes(file.type) && !isMarkdown) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload only PDF or Markdown files.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);

    // Save to Supabase first
    const newDoc = await saveDocumentToSupabase(file, 'processing');
    if (!newDoc) {
      setIsUploading(false);
      return;
    }

    // Update local state
    setDocuments((prev) => [newDoc, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file_content', file);

      const response = await fetch(
        'http://0.0.0.0:8000/api/v1/documents/ingest_file',
        // 'https://agentic-rag-api.onrender.com/api/v1/documents/ingest_file',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update document status to completed
      await updateDocumentStatus(
        newDoc.id,
        'completed',
        `pinecone_${Date.now()}`
      );

      toast({
        title: 'Document uploaded successfully',
        description: `${file.name} has been processed and added to your knowledge base.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);

      // Update document status to error
      await updateDocumentStatus(newDoc.id, 'error');

      toast({
        title: 'Upload failed',
        description:
          'There was an error processing your document. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const deleteDocument = async (id: string, title: string) => {
    try {
      // First, try to delete from the backend API
      try {
        const response = await fetch(
          `http://0.0.0.0:8000/api/v1/documents/delete`,
          // `https://agentic-rag-api.onrender.com/api/v1/documents/${id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
      // This preserves the record for potential recovery while hiding it from normal queries
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Remove from local state
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const handleTagInput = (value: string) => {
    // Check if user typed a comma
    if (value.includes(',')) {
      const parts = value.split(',');
      const newTags = parts
        .slice(0, -1) // All parts except the last one
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0 && !tags.includes(tag)); // Only non-empty, unique tags

      // Add new tags to the existing tags
      if (newTags.length > 0) {
        setTags((prev) => [...prev, ...newTags]);
      }

      // Keep only the text after the last comma as the current input
      const remainingText = parts[parts.length - 1];
      setTagInput(remainingText);
    } else {
      ``;
      // No comma, just update the input normally
      setTagInput(value);
    }
  };

  const handleTagInputBlur = () => {
    // Add the current input as a tag when leaving the input field
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags((prev) => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((tag) => tag !== tagToRemove));
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!urlInput.trim()) {
      toast({
        title: 'URL Required',
        description: 'Please enter a valid URL.',
        variant: 'destructive',
      });
      return;
    }

    // Add current tag input if it exists
    let finalTags = [...tags];
    if (tagInput.trim() && !finalTags.includes(tagInput.trim())) {
      finalTags.push(tagInput.trim());
    }

    setIsIngestingUrl(true);

    // Save URL to Supabase first
    let newDoc: Document | null = null;
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: urlInput.trim(),
          file_type: 'url',
          file_size: 0, // Empty size for URLs
          metadata: finalTags.length > 0 ? finalTags.join(',') : null,
          pinecone_id: null,
        })
        .select()
        .single();

      if (error) throw error;

      newDoc = { ...data, status: 'processing' as const };

      // Update local state to show the new document
      setDocuments((prev) => [newDoc!, ...prev]);
    } catch (error) {
      console.error('Error saving URL to Supabase:', error);
      toast({
        title: 'Error',
        description: 'Failed to save URL to database.',
        variant: 'destructive',
      });
      setIsIngestingUrl(false);
      return;
    }

    try {
      const response = await fetch(
        'http://0.0.0.0:8000/api/v1/documents/ingest_url',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              url: urlInput.trim(),
              metadata: {
                classes: finalTags.join(','),
              },
            },
          ]),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update document status to completed
      if (newDoc) {
        await updateDocumentStatus(
          newDoc.id,
          'completed',
          `pinecone_${Date.now()}`
        );
      }

      // Clear form
      setUrlInput('');
      setTagInput('');
      setTags([]);

      toast({
        title: 'URL ingested successfully',
        description:
          'The URL content has been processed and added to your knowledge base.',
      });
    } catch (error) {
      console.error('Error ingesting URL:', error);

      // Update document status to error if we have the document
      if (newDoc) {
        await updateDocumentStatus(newDoc.id, 'error');
      }

      toast({
        title: 'URL ingestion failed',
        description: 'There was an error processing the URL. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsIngestingUrl(false);
    }
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
        {/* Upload Section */}
        <Card className="mb-8 shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Upload Documents
            </CardTitle>
            <CardDescription>
              Add PDF or Markdown files to your knowledge base. Files will be
              processed and made available for chat queries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Drop files here or click to upload
              </h3>
              <p className="text-gray-600 mb-4">
                Supports PDF and Markdown files
              </p>
              <div>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.md,.markdown"
                  onChange={handleInputChange}
                  className="hidden"
                  disabled={isUploading}
                />
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" disabled={isUploading} asChild>
                    <span>{isUploading ? 'Uploading...' : 'Choose Files'}</span>
                  </Button>
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* URL Ingestion Section */}
        <Card className="mb-8 shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <LinkIcon className="h-6 w-6" />
              Ingest from URL
            </CardTitle>
            <CardDescription>
              Add content from web pages to your knowledge base by providing a
              URL and optional tags.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <Label htmlFor="url-input">URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isIngestingUrl}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="tag-input">
                  Target HTML Classes (optional)
                </Label>
                <div className="mt-1">
                  <Input
                    id="tag-input"
                    type="text"
                    placeholder="Enter HTML classes separated by commas..."
                    value={tagInput}
                    onChange={(e) => handleTagInput(e.target.value)}
                    onBlur={handleTagInputBlur}
                    disabled={isIngestingUrl}
                  />
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:bg-blue-200 rounded-full p-0.5"
                            disabled={isIngestingUrl}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isIngestingUrl || !urlInput.trim()}
                className="w-full"
              >
                {isIngestingUrl ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Processing URL...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Ingest URL
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Your Documents
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
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">{doc.title}</h4>
                        <p className="text-sm text-gray-600">
                          {formatFileSize(doc.file_size)} • Uploaded{' '}
                          {doc.created_at
                            ? new Date(doc.created_at).toLocaleDateString()
                            : 'Unknown date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(doc.status)}
                        <span className="text-sm capitalize">{doc.status}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(doc)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
      </div>

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
    </div>
  );
};

export default Admin;
