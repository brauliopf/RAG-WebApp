# Multi-Conversation Chat Feature

## Overview

The chat application now supports multiple conversations with thread management, allowing users to maintain separate conversation contexts and easily switch between them.

## Features

### ✅ Core Functionality

- **Multiple Threads**: Users can have multiple conversation threads
- **Thread Switching**: Click on any thread to switch conversations
- **Thread Creation**: Create new conversations with the "New Chat" button
- **Thread Management**: Rename and delete threads with context menu
- **Auto-generated Titles**: Thread titles are automatically generated from the first user message
- **Persistent History**: All conversations are saved and restored on page reload

### ✅ User Interface

- **Sidebar Layout**: Thread list in a collapsible sidebar
- **Responsive Design**: Mobile-friendly with overlay sidebar
- **Active Thread Highlighting**: Current thread is visually highlighted
- **Thread Metadata**: Shows last activity time for each thread
- **Empty States**: Helpful messaging when no threads exist

### ✅ Thread Management

- **Rename Threads**: Click the menu (⋮) and select "Rename"
- **Delete Threads**: Click the menu (⋮) and select "Delete" with confirmation
- **Thread Ordering**: Most recently active threads appear at the top
- **Smart Navigation**: When deleting active thread, automatically switches to another

## Architecture

### useChat Hook

All chat logic is encapsulated in the `useChat` hook (`src/hooks/useChat.ts`):

```typescript
const {
  // State
  messages,
  threads,
  activeThreadId,
  activeThread,
  isLoading,
  isLoadingThreads,

  // Actions
  createNewThread,
  switchToThread,
  sendMessage,
  deleteThread,
  renameThread,
  reportMessage,
} = useChat();
```

### Components

- **ThreadList** (`src/components/chat/ThreadList.tsx`): Displays all user threads
- **Chat** (`src/pages/Chat.tsx`): Main chat page with two-panel layout
- **Conversation** & **MessageInput**: Existing components (unchanged)

### Database Schema

The feature uses existing Supabase tables:

- `chat_threads`: Stores conversation metadata
- `chat_messages`: Stores individual messages linked to threads

## Usage

### For Users

1. **Start New Conversation**: Click "New Chat" button
2. **Switch Conversations**: Click on any thread in the sidebar
3. **Rename Thread**: Click ⋮ menu → "Rename" → Enter new title
4. **Delete Thread**: Click ⋮ menu → "Delete" → Confirm deletion
5. **Mobile**: Use hamburger menu (☰) to toggle sidebar

### For Developers

```typescript
// Use the hook in any component
import { useChat } from '@/hooks/useChat';

const MyComponent = () => {
  const { threads, createNewThread, switchToThread } = useChat();

  return (
    <div>
      {threads.map(thread => (
        <button key={thread.id} onClick={() => switchToThread(thread.id)}>
          {thread.title}
        </button>
      ))}
    </div>
  );
};
```

## Technical Details

### State Management

- **Local State**: React useState for UI state (sidebar open/closed, editing mode)
- **Server State**: Supabase for persistent thread and message storage
- **Real-time Updates**: Thread timestamps updated on new messages

### Performance Optimizations

- **Lazy Loading**: Messages loaded only when switching to a thread
- **Optimistic Updates**: UI updates immediately, syncs with server
- **Efficient Queries**: Threads loaded once, messages loaded per thread

### Error Handling

- **Network Errors**: Graceful fallbacks with user notifications
- **Validation**: Input validation for thread titles and messages
- **Confirmation Dialogs**: Prevent accidental deletions

## Mobile Experience

### Responsive Design

- **Breakpoint**: `md:` (768px) for desktop/mobile distinction
- **Mobile Sidebar**: Slides in from left with overlay
- **Touch Friendly**: Larger touch targets and gestures
- **Auto-close**: Sidebar closes after thread selection on mobile

### Mobile-specific Features

- **Hamburger Menu**: Toggle button for sidebar access
- **Full-height Layout**: Uses viewport height for optimal mobile experience
- **Overlay**: Dark overlay when sidebar is open

## Future Enhancements

### Potential Improvements

- **Search**: Search across all threads and messages
- **Categories/Tags**: Organize threads with labels
- **Export**: Export conversations to various formats
- **Real-time Sync**: Live updates when using multiple devices
- **Thread Templates**: Pre-defined conversation starters
- **Keyboard Shortcuts**: Quick navigation and actions

### Performance Optimizations

- **Virtual Scrolling**: For users with many threads
- **Message Pagination**: Load messages in chunks for long conversations
- **Caching**: Client-side caching for frequently accessed threads

## Troubleshooting

### Common Issues

1. **Threads not loading**: Check user authentication and database permissions
2. **Messages not saving**: Verify thread_id is valid and user has access
3. **Sidebar not responsive**: Check CSS classes and breakpoint definitions

### Debug Information

The hook provides loading states and error handling:

```typescript
const { isLoading, isLoadingThreads } = useChat();

// Check browser console for detailed error logs
// All database operations include error logging
```
