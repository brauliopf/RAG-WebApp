import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

interface ReportMessageDialogProps {
  messageId: string;
  onReport: (messageId: string, reason?: string) => void;
}

const ReportMessageDialog = ({
  messageId,
  onReport,
}: ReportMessageDialogProps) => {
  const [reason, setReason] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    onReport(messageId, reason.trim() || undefined);

    // Show success toast
    toast({
      title: 'Message reported',
      description: "Thank you for your feedback. We'll review this message.",
      duration: 3000,
    });

    setReason('');
    setIsOpen(false);
  };

  const handleCancel = () => {
    setReason('');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          className="ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
          title="Report this message"
        >
          <Flag className="h-3 w-3 text-gray-400 hover:text-red-500" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report Message</DialogTitle>
          <DialogDescription>
            Help us improve by reporting inappropriate or problematic content.
            Your feedback is important to us.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Reason for reporting (optional)</Label>
            <Input
              id="reason"
              placeholder="Please describe the issue..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="destructive">
            Report Message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportMessageDialog;
