import { apiEndpoints } from '@/lib/config';
import { makeAuthenticatedRequest } from '@/lib/auth';

export class ChatApiService {
  static async sendMessage(
    query: string,
    threadId: string,
    useAgentic: boolean = true
  ) {
    const response = await makeAuthenticatedRequest(apiEndpoints.chat.query(), {
      method: 'POST',
      body: JSON.stringify({
        query,
        thread_id: threadId,
        use_agentic: useAgentic,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}
