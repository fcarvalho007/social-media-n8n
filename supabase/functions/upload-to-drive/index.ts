import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  file: string; // base64 encoded
  filename: string;
  mimeType: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, filename, mimeType }: UploadRequest = await req.json();
    
    const clientId = '650166375151-a5cmc5je2dk7u6ha152ful5m8ppf45on.apps.googleusercontent.com';
    const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
    const folderId = '1JN70ZiqOyf61nCE59yjtVeHghfRtNhzIvX5QS_Dt-Z0Y5Rst5JhYYfYQ1viVK9DryJdqXC_9';

    if (!clientSecret) {
      throw new Error('GOOGLE_CLIENT_SECRET not configured');
    }

    // For now, we'll use a service approach or stored refresh token
    // In a production app, you'd want to implement OAuth flow properly
    // This is a simplified version that assumes you have a refresh token
    
    console.log('Attempting to upload file to Google Drive:', filename);

    // Decode base64 file
    const fileData = Uint8Array.from(atob(file), c => c.charCodeAt(0));

    // Create multipart upload request
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const metadata = {
      name: filename,
      mimeType: mimeType,
      parents: [folderId]
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + mimeType + '\r\n' +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      file +
      close_delim;

    // Note: This requires a valid access token
    // For MVP, we'll return an error suggesting to use Supabase Storage instead
    
    return new Response(
      JSON.stringify({
        error: 'Google Drive integration requires OAuth setup. Please use Supabase Storage instead or configure OAuth flow.',
        suggestion: 'Upload to Supabase Storage and let n8n handle Google Drive upload'
      }),
      {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error uploading to Google Drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
