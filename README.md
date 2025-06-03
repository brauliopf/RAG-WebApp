# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/0998c2f4-3721-4f4b-aa37-cb2f3e49f708

## Configuration

This project uses environment variables for configuration. All API URLs are centralized in `src/lib/config.ts` for easy management.

### Development Setup

1. Create a `.env.local` file in the root directory:

```bash
# Development Configuration
VITE_API_BASE_URL=http://0.0.0.0:8000
```

2. For production, update the `VITE_API_BASE_URL` to your production API URL:

```bash
# Production Configuration
VITE_API_BASE_URL=https://your-production-api.com
```

### Available Environment Variables

- `VITE_API_BASE_URL`: The base URL for your API server
  - **Development**: `http://0.0.0.0:8000`
  - **Production**: `https://your-production-api.com`

### API Endpoints

The following endpoints are automatically configured based on your `VITE_API_BASE_URL`:

- **Chat**: `${VITE_API_BASE_URL}/api/v1/query`
- **Document Upload**: `${VITE_API_BASE_URL}/api/v1/documents/ingest_file`
- **URL Ingestion**: `${VITE_API_BASE_URL}/api/v1/documents/ingest_url`
- **Document Deletion**: `${VITE_API_BASE_URL}/api/v1/documents/delete`

### Usage in Code

Import and use the centralized configuration:

```typescript
import { apiEndpoints } from '@/lib/config';

// Example: Making a chat query
const response = await fetch(apiEndpoints.chat.query(), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ question: 'Hello' }),
});

// Example: Uploading a document
const response = await fetch(apiEndpoints.documents.ingestFile(), {
  method: 'POST',
  body: formData,
});
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/0998c2f4-3721-4f4b-aa37-cb2f3e49f708) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/0998c2f4-3721-4f4b-aa37-cb2f3e49f708) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
