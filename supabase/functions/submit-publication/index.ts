import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SubmitRequest {
  content_text?: string;
  pdf_base64?: string;
  pdf_filename?: string;
  submitted_by: string;
}

const GOOGLE_CLIENT_ID = '650166375151-a5cmc5je2dk7u6ha152ful5m8ppf45on.apps.googleusercontent.com';
const FOLDER_ID = '1JN70ZiqOyf61nCE59yjtVeHghfRtNhzIvX5QS_Dt-Z0Y5Rst5JhYYfYQ1viVK9DryJdqXC_9';
const SHEET_ID = '1O9NdE8on_oeN7Pwp2OgsWK-aONVs2iugcgIsbvvrbN0';

async function getAccessToken(): Promise<string> {
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  
  // For server-to-server auth, we need a refresh token or service account
  // This is a placeholder - you'll need to implement proper OAuth2 flow
  throw new Error('Google OAuth2 not fully configured. Need refresh token or service account.');
}

async function uploadToDrive(pdfBase64: string, filename: string, accessToken: string): Promise<string> {
  const metadata = {
    name: filename,
    parents: [FOLDER_ID],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const pdfData = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

  const body = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: application/pdf\r\n',
    'Content-Transfer-Encoding: base64\r\n\r\n',
    pdfBase64,
    closeDelim,
  ].join('');

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Drive upload failed: ${response.status}`);
  }

  const data = await response.json();
  const fileId = data.id;

  // Make file publicly accessible
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone',
    }),
  });

  return `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
}

async function appendToSheet(timestamp: string, contentText: string | null, pdfUrl: string | null, accessToken: string): Promise<void> {
  const values = [[timestamp, 'não', contentText || '', pdfUrl || '']];

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Form_Responses:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sheets append failed: ${response.status} - ${error}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content_text, pdf_base64, pdf_filename, submitted_by }: SubmitRequest = await req.json();
    
    console.log('Received submission:', {
      has_text: !!content_text,
      has_pdf: !!pdf_base64,
      pdf_filename,
      submitted_by
    });

    // Validate that at least one field is provided
    if (!content_text && !pdf_base64) {
      return new Response(
        JSON.stringify({ error: 'Pelo menos um campo deve ser preenchido' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const timestamp = new Date().toISOString();
    let driveLink: string | null = null;

    // Get Google access token
    const accessToken = await getAccessToken();

    // Upload PDF to Google Drive if provided
    if (pdf_base64 && pdf_filename) {
      console.log('Uploading PDF to Google Drive...');
      driveLink = await uploadToDrive(pdf_base64, pdf_filename, accessToken);
      console.log('PDF uploaded:', driveLink);
    }

    // Append to Google Sheets
    console.log('Appending to Google Sheets...');
    await appendToSheet(timestamp, content_text || null, driveLink, accessToken);
    console.log('Sheet updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Publicação enviada com sucesso!',
        drive_link: driveLink
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error submitting publication:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha ao enviar a publicação',
        details: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
