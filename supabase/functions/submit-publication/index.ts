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
  const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY not configured');
  }

  const serviceAccount = JSON.parse(serviceAccountJson);
  
  // Create JWT for Google OAuth
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  // Encode header and claim
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedClaim = btoa(JSON.stringify(claim)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  // Import private key
  const privateKey = serviceAccount.private_key;
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = privateKey.substring(pemHeader.length, privateKey.length - pemFooter.length).replace(/\s/g, '');
  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the JWT
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  );

  // Encode signature
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${signatureInput}.${encodedSignature}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
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

async function callN8nWebhook(timestamp: string, contentText: string | null, driveLink: string | null): Promise<void> {
  const webhookUrl = Deno.env.get('N8N_CALLBACK_WEBHOOK_URL');
  
  if (!webhookUrl) {
    console.warn('N8N_CALLBACK_WEBHOOK_URL not configured, skipping webhook call');
    return;
  }

  // Get first 80 characters of content for theme
  const theme = contentText ? contentText.substring(0, 80) : '';

  const payload = {
    data: {
      "Carimbo de data/hora": timestamp,
      "Conteudo": contentText || '',
      "foi publicado?": "não",
      "Carregar PDF": driveLink || '',
      "Tema": theme,
      "idioma": "pt-PT"
    },
    metadata: {
      source: "lovable_form",
      sheet_name: "Form_Responses",
      row: 0,
      timestamp: new Date().toISOString(),
      script_version: "lovable-1.0"
    }
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('N8N webhook failed:', error);
    // Don't throw - we don't want to fail the whole submission if webhook fails
  } else {
    console.log('N8N webhook called successfully');
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

    // Format timestamp in Portuguese format (DD/MM/YYYY HH:mm:ss)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
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

    // Call n8n webhook
    console.log('Calling n8n webhook...');
    await callN8nWebhook(timestamp, content_text || null, driveLink);
    console.log('N8N webhook called');

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
