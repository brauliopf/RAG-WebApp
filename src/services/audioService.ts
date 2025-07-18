import { apiEndpoints } from '@/lib/config';
import { makeAuthenticatedRequest } from '@/lib/auth';

export class AudioService {
  static async uploadFileToS3(file_blob: Blob, threadId: string) {
    const fileName = `${threadId}-${Date.now()}.mp3`;

    // get presigned url from the FastAPI endpoint
    const presigned_url_response = await makeAuthenticatedRequest(
      apiEndpoints.app.s3.uploadUrl(),
      {
        method: 'POST',
        body: JSON.stringify({
          bucket_name: 'audio-rag',
          object_name: fileName,
          expiration: 3600,
          region_name: 'us-east-1',
        }),
      }
    );

    if (!presigned_url_response.ok) {
      throw new Error(`HTTP error! status: ${presigned_url_response.status}`);
    }

    const presigned_url_data = await presigned_url_response.json();
    const presignedUrl = presigned_url_data.presigned_url;

    // upload the audio blob to the presigned url
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file_blob,
    });

    if (!uploadResponse.ok) {
      throw new Error(`HTTP error! status: ${uploadResponse.status}`);
    }

    return {
      status: 'success',
      event: 'upload_file_to_s3',
      metadata: presigned_url_data,
    };
  }
}
