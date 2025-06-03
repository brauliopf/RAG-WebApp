
import { useState, useEffect } from "react";
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  status: "processing" | "completed" | "error";
  created_at: string;
  pinecone_id?: string;
}

const Admin = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const documentsWithStatus = data.map(doc => ({
        ...doc,
        status: doc.pinecone_id ? 'completed' as const : 'processing' as const
      }));

      setDocuments(documentsWithStatus);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents.",
        variant: "destructive",
      });
    }
  };

  const saveDocumentToSupabase = async (file: File, status: Document['status'] = 'processing') => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          title: file.name,
          file_type: file.type || 'text/markdown',
          file_size: file.size,
          content: '', // Will be filled by the API
          pinecone_id: status === 'completed' ? `pinecone_${Date.now()}` : null
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

  const updateDocumentStatus = async (id: string, status: Document['status'], pinecone_id?: string) => {
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

      setDocuments(prev => prev.map(doc => 
        doc.id === id ? { ...doc, status, pinecone_id } : doc
      ));
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
        title: "Invalid file type",
        description: "Please upload only PDF or Markdown files.",
        variant: "destructive",
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
    setDocuments(prev => [newDoc, ...prev]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch("https://agentic-rag-api.onrender.com/api/v1/documents/ingest_file", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Update document status to completed
      await updateDocumentStatus(newDoc.id, 'completed', `pinecone_${Date.now()}`);

      toast({
        title: "Document uploaded successfully",
        description: `${file.name} has been processed and added to your knowledge base.`,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      
      // Update document status to error
      await updateDocumentStatus(newDoc.id, 'error');

      toast({
        title: "Upload failed",
        description: "There was an error processing your document. Please try again.",
        variant: "destructive",
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
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast({
        title: "Document deleted",
        description: "The document has been removed from your knowledge base.",
      });
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document.",
        variant: "destructive",
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
            <CardTitle className="text-2xl">Upload Documents</CardTitle>
            <CardDescription>
              Add PDF or Markdown files to your knowledge base. Files will be processed and made available for chat queries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setDragActive(true)}
              onDragLeave={() => setDragActive(false)}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop files here or click to upload</h3>
              <p className="text-gray-600 mb-4">Supports PDF and Markdown files</p>
              <Label htmlFor="file-upload">
                <Button variant="outline" disabled={isUploading} className="cursor-pointer">
                  {isUploading ? "Uploading..." : "Choose Files"}
                </Button>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.md,.markdown"
                  onChange={handleInputChange}
                  className="hidden"
                  disabled={isUploading}
                />
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card className="shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl">Your Documents</CardTitle>
            <CardDescription>
              Manage your uploaded documents and their processing status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No documents uploaded</h3>
                <p className="text-gray-500">Upload your first document to get started.</p>
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
                          {formatFileSize(doc.file_size)} • Uploaded {new Date(doc.created_at).toLocaleDateString()}
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
                        onClick={() => deleteDocument(doc.id, doc.title)}
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
    </div>
  );
};

export default Admin;
