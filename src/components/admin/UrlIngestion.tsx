import { useState } from 'react';
import { Link as LinkIcon, Clock, Plus, X } from 'lucide-react';
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
import { UrlIngestionProps } from './types';
import { saveUrlToSupabase, updateDocumentStatus } from './documentService';

export const UrlIngestion = ({ onDocumentAdded }: UrlIngestionProps) => {
  const [urlInput, setUrlInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isIngestingUrl, setIsIngestingUrl] = useState(false);

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
    const newDoc = await saveUrlToSupabase(urlInput.trim(), finalTags);
    if (!newDoc) {
      toast({
        title: 'Error',
        description: 'Failed to save URL to database.',
        variant: 'destructive',
      });
      setIsIngestingUrl(false);
      return;
    }

    // Update parent component
    onDocumentAdded(newDoc);

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
      await updateDocumentStatus(
        newDoc.id,
        'completed',
        `pinecone_${Date.now()}`
      );

      // Update parent with completed status
      onDocumentAdded({ ...newDoc, status: 'completed' });

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

      // Update document status to error
      await updateDocumentStatus(newDoc.id, 'error');

      // Update parent with error status
      onDocumentAdded({ ...newDoc, status: 'error' });

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
    <Card className="mb-8 shadow-xl border-0">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <LinkIcon className="h-6 w-6" />
          Ingest from URL
        </CardTitle>
        <CardDescription>
          Add content from web pages to your knowledge base by providing a URL
          and optional tags.
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
            <Label htmlFor="tag-input">Target HTML Classes (optional)</Label>
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
  );
};
