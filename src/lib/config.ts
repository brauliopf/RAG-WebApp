// Environment configuration
const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.DEV
      ? 'http://0.0.0.0:8000'
      : import.meta.env.VITE_API_BASE_URL,
    endpoints: {
      documents: {
        delete: '/api/v1/documents/delete',
        ingestFile: '/api/v1/documents/ingest_file',
        ingestUrl: '/api/v1/documents/ingest_url',
        list: '/api/v1/documents',
      },
      chat: {
        query: '/api/v1/query',
      },
      app: {
        s3: {
          uploadUrl: '/api/v1/s3/uploadUrl',
        },
        redis: {
          set: '/api/v1/redis/set',
        },
      },
    },
  },

  // Environment info
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
} as const;

// Helper function to build full API URLs
export const getApiUrl = (endpoint: string): string => {
  return `${config.api.baseUrl}${endpoint}`;
};

// Specific API endpoint getters
export const apiEndpoints = {
  documents: {
    delete: () => getApiUrl(config.api.endpoints.documents.delete),
    ingestFile: () => getApiUrl(config.api.endpoints.documents.ingestFile),
    ingestUrl: () => getApiUrl(config.api.endpoints.documents.ingestUrl),
    list: () => getApiUrl(config.api.endpoints.documents.list),
  },
  chat: {
    query: () => getApiUrl(config.api.endpoints.chat.query),
  },
  app: {
    s3: {
      uploadUrl: () => getApiUrl(config.api.endpoints.app.s3.uploadUrl),
    },
    redis: {
      set: () => getApiUrl(config.api.endpoints.app.redis.set),
    },
  },
};

export default config;
