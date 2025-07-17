import { useState, useEffect } from 'react';
import { Send, Loader2, Mic, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onSendAudio: (audioBlob: Blob, threadId: string) => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
  threadId: string;
  isLoading: boolean;
  disabled?: boolean;
  isRecording: boolean;
  isAudioSupported: boolean;
  isCanceled: boolean;
  error: string | null;
  audioBlob: Blob | null;
}

const MessageInput = ({
  onSendMessage,
  onSendAudio,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  threadId,
  isLoading,
  disabled = false,
  isRecording,
  isAudioSupported,
  error: audioError,
  audioBlob,
  isCanceled = false,
}: MessageInputProps) => {
  const [textInputValue, setTextInputValue] = useState('');

  const handleSendText = () => {
    if (!textInputValue.trim()) return;
    onSendMessage(textInputValue);
    setTextInputValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleStartVoiceInput = async () => {
    await onStartRecording();
  };

  const handleCancelVoiceInput = () => {
    onCancelRecording();
  };

  const handleSubmitVoiceInput = () => {
    // stop the media Recorder
    // the recorder has a callback that sets the audioBlob
    onStopRecording();
  };

  return (
    <div className="border-t p-6">
      {audioError && (
        <div className="mb-2 text-sm text-red-600 bg-red-50 p-2 rounded">
          {audioError}
        </div>
      )}
      <div className="flex space-x-3">
        <div className="flex-1">
          <Input
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your documents..."
            className="flex-1 text-base py-3"
            disabled={isLoading || disabled || isRecording}
          />
        </div>
        <Button
          onClick={handleSendText}
          disabled={
            !textInputValue.trim() || isLoading || disabled || isRecording
          }
          className="bg-blue-600 hover:bg-blue-700 px-6"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
        <div className="items-center justify-center">
          {isRecording ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                onClick={handleCancelVoiceInput}
                disabled={isLoading || disabled}
                className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full w-10 h-10 p-0 transition-colors"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSubmitVoiceInput}
                disabled={isLoading || disabled}
                className="bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 rounded-full w-10 h-10 p-0 transition-colors animate-pulse"
                variant="ghost"
              >
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleStartVoiceInput}
              disabled={isLoading || disabled || !isAudioSupported}
              className="bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 rounded-full w-10 h-10 p-0 transition-colors disabled:opacity-50"
              variant="ghost"
              title={
                !isAudioSupported
                  ? 'Audio recording not supported'
                  : 'Start voice recording'
              }
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
