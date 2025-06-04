# Chat Components

## Message Reporting Functionality

The chat system now includes the ability for users to report inappropriate or problematic assistant messages.

### Features

- **Flag Icon**: A small flag icon appears next to the timestamp of every assistant message
- **Report Dialog**: Clicking the flag opens a dialog where users can optionally provide a reason for reporting
- **Toast Confirmation**: Users receive immediate feedback when a report is submitted
- **Optional Reason**: Users can provide additional context, but it's not required

### Components

#### ReportMessageDialog

A dialog component that handles the reporting interface.

**Props:**

- `messageId: string` - The ID of the message being reported
- `onReport: (messageId: string, reason?: string) => void` - Callback function when a report is submitted

#### Conversation (Updated)

The main conversation component now includes reporting functionality.

**New Props:**

- `onReportMessage?: (messageId: string, reason?: string) => void` - Optional callback to handle message reports

### Usage Example

```tsx
import { Conversation } from '@/components/chat';

const handleReportMessage = async (messageId: string, reason?: string) => {
  // Handle the report - save to database, send to moderation system, etc.
  console.log('Message reported:', { messageId, reason });

  // Show success feedback
  toast({
    title: 'Report submitted',
    description: 'Thank you for your feedback.',
  });
};

<Conversation
  messages={messages}
  isLoading={isLoading}
  onReportMessage={handleReportMessage}
/>;
```

### Implementation Notes

- Only assistant messages show the report flag (user messages cannot be reported)
- The flag icon is subtle (gray) and becomes red on hover
- Reports are handled through the `onReportMessage` callback
- If no callback is provided, the dialog will still show toast confirmation
- The dialog automatically closes after submission
- Form state is reset when the dialog closes

### Database Schema (Suggested)

If you want to persist reports to a database, consider a table like:

```sql
CREATE TABLE message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id),
  thread_id UUID REFERENCES chat_threads(id),
  reason TEXT,
  reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' -- pending, reviewed, resolved
);
```

### Styling

The report functionality uses existing UI components and follows the app's design system:

- Uses Radix UI Dialog for the modal
- Consistent with existing button and input styling
- Hover states and transitions for better UX
- Accessible with proper ARIA labels and keyboard navigation
