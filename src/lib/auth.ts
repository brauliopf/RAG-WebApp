import { supabase } from '@/integrations/supabase/client';

/**
 * Get the current user's JWT token for API authentication
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

/**
 * Make an authenticated API request with proper headers
 */
export const makeAuthenticatedRequest = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

/**
 * Make an authenticated form data request (for file uploads)
 */
export const makeAuthenticatedFormRequest = async (
  url: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<Response> => {
  const token = await getAuthToken();

  if (!token) {
    throw new Error('User not authenticated');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    // Don't set Content-Type for FormData - browser will set it with boundary
    ...options.headers,
  };

  // Remove Content-Type if it exists to let browser handle it for FormData
  if (headers['Content-Type']) {
    delete headers['Content-Type'];
  }

  return fetch(url, {
    ...options,
    method: options.method || 'POST',
    headers,
    body: formData,
  });
};
