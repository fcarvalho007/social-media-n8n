import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GeneratePDFRequest {
  images: string[]
  title?: string
  pageAlts?: string[]
  postId?: string
}

interface GeneratePDFResponse {
  ok: boolean
  pdfUrl?: string
  pdfBase64?: string
  pages?: number
  sizeMB?: number
  stage?: 'parse' | 'fetch' | 'compose' | 'upload' | 'unknown'
  code?: number
  message?: string
  details?: Array<{ index: number; url: string; reason: string }>
  meta?: Record<string, unknown>
}

const GETLATE_BASE_URL = Deno.env.get('GETLATE_BASE_URL') || 'https://getlate.dev/api'
const IMAGE_TIMEOUT_MS = 15000
const GLOBAL_TIMEOUT_MS = 90000

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 200 })
  }

  const globalStart = Date.now()

  try {
    const { images, title, pageAlts, postId }: GeneratePDFRequest = await req.json()

    if (!images || !Array.isArray(images) || images.length < 2) {
      return new Response(
        JSON.stringify({ ok: false, stage: 'parse', code: 422, message: 'LinkedIn carousel requires at least 2 pages', details: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (images.length > 300) {
      return new Response(
        JSON.stringify({ ok: false, stage: 'parse', code: 422, message: `Too many pages (${images.length})`, details: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    const pdf = await PDFDocument.create()
    const pageWidth = 595.28
    const pageHeight = 841.89
    const margin = 28.35

    const alts = pageAlts && pageAlts.length === images.length
      ? pageAlts
      : images.map((_, i) => `Slide ${i + 1}/${images.length}`)

    for (let i = 0; i < images.length; i++) {
      if (Date.now() - globalStart > GLOBAL_TIMEOUT_MS) {
        return new Response(
          JSON.stringify({ ok: false, stage: 'fetch', code: 408, message: 'Global timeout exceeded (90s)', details: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }

      const url = images[i]
      try {
        const controller = new AbortController()
        const to = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)
        const resp = await fetch(url, { signal: controller.signal })
        clearTimeout(to)
        if (!resp.ok) {
          return new Response(
            JSON.stringify({ ok: false, stage: 'fetch', code: resp.status, message: `Failed to fetch image ${i + 1}`, details: [{ index: i, url, reason: `http-${resp.status}` }] }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
          )
        }
        const buf = new Uint8Array(await resp.arrayBuffer())
        const isPng = url.toLowerCase().endsWith('.png')
        const img = isPng ? await pdf.embedPng(buf) : await pdf.embedJpg(buf)

        const page = pdf.addPage([pageWidth, pageHeight])
        const imgAspect = img.width / img.height
        const maxWidth = pageWidth - 2 * margin
        const maxHeight = pageHeight - 2 * margin - 42.52
        let w = maxWidth
        let h = w / imgAspect
        if (h > maxHeight) {
          h = maxHeight
          w = h * imgAspect
        }
        const x = (pageWidth - w) / 2
        const y = (pageHeight - h - 42.52) / 2

        page.drawImage(img, { x, y, width: w, height: h })

        const pageNumberText = `${i + 1} / ${images.length}`
        page.drawText(pageNumberText, { x: pageWidth / 2 - (pageNumberText.length * 10 * 0.3) / 2, y: 14.17, size: 10, color: rgb(0.5, 0.5, 0.5) })
      } catch (e) {
        const reason = e instanceof Error && e.name === 'AbortError' ? 'timeout' : (e as Error)?.message || 'fetch-error'
        return new Response(
          JSON.stringify({ ok: false, stage: 'fetch', code: 500, message: `Failed to process image ${i + 1}`, details: [{ index: i, url, reason }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
    }

    const bytes = await pdf.save()
    const sizeMB = bytes.length / (1024 * 1024)

    if (sizeMB > 100) {
      return new Response(
        JSON.stringify({ ok: false, stage: 'compose', code: 413, message: `PDF exceeds 100 MB (${sizeMB.toFixed(2)} MB)`, meta: { pages: images.length, sizeMB: parseFloat(sizeMB.toFixed(2)) } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      )
    }

    if (sizeMB >= 5) {
      const token = Deno.env.get('GETLATE_API_TOKEN')
      if (!token) {
        return new Response(
          JSON.stringify({ ok: false, stage: 'upload', code: 500, message: 'Getlate API token not configured', details: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }

      try {
        const form = new FormData()
        const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' })
        const filename = `${postId || title || 'carousel'}.pdf`
        form.append('file', blob, filename)
        const up = await fetch(`${GETLATE_BASE_URL}/v1/media`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: form })
        const text = await up.text()
        if (!up.ok) {
          return new Response(
            JSON.stringify({ ok: false, stage: 'upload', code: up.status, message: 'Failed to upload PDF to /v1/media', details: [{ reason: 'api-error' }], meta: { bodyFirst300: text.slice(0, 300) } }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
          )
        }
        const data = text ? JSON.parse(text) : {}
        const pdfUrl = data.url || (data.files && data.files[0]?.url)
        if (!pdfUrl) {
          return new Response(
            JSON.stringify({ ok: false, stage: 'upload', code: 500, message: 'No URL returned from media upload' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
          )
        }
        return new Response(
          JSON.stringify({ ok: true, pdfUrl, pages: images.length, sizeMB: parseFloat(sizeMB.toFixed(2)), meta: { postId, t_compose: Date.now() - globalStart } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      } catch (e) {
        return new Response(
          JSON.stringify({ ok: false, stage: 'upload', code: 500, message: 'Exception uploading PDF', details: [{ reason: (e as Error)?.message || 'error' }] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
      }
    }

    // Small PDFs: return base64
    let b64 = ''
    for (let i = 0; i < bytes.length; i += 8192) {
      const chunk = bytes.slice(i, i + 8192)
      b64 += String.fromCharCode(...chunk)
    }
    b64 = btoa(b64)

    return new Response(
      JSON.stringify({ ok: true, pdfBase64: b64, pages: images.length, sizeMB: parseFloat(sizeMB.toFixed(2)), meta: { postId, t_compose: Date.now() - globalStart } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  } catch (e) {
    const err = e instanceof Error ? e : new Error('Unknown error')
    console.error('[EDGE] Uncaught:', err.message)
    return new Response(
      JSON.stringify({ ok: false, stage: 'unknown', code: 500, message: err.message, details: [], meta: { edge: 'generate-carousel-pdf-lite', ts: new Date().toISOString() } }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    )
  }
})