import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { DocumentUploadProps } from './types';
import { validateFileType } from './utils';
import {
  saveDocumentToSupabase,
  updateDocumentStatus,
} from './documentService';

export const DocumentUpload = ({ onDocumentAdded }: DocumentUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!validateFileType(file)) {
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

    // Update parent component
    onDocumentAdded(newDoc);

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

      // Update parent with completed status
      onDocumentAdded({ ...newDoc, status: 'completed' });

      toast({
        title: 'Document uploaded successfully',
        description: `${file.name} has been processed and added to your knowledge base.`,
      });
    } catch (error) {
      console.error('Error uploading file:', error);

      // Update document status to error
      await updateDocumentStatus(newDoc.id, 'error');

      // Update parent with error status
      onDocumentAdded({ ...newDoc, status: 'error' });

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

  return (
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
          <p className="text-gray-600 mb-4">Supports PDF and Markdown files</p>
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
  );
};
