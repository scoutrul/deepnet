import { appConfig } from '../../config/appConfig'

export interface BatchTranscriptionOptions {
  model?: string
  language?: string
  punctuate?: boolean
  smart_format?: boolean
}

export interface BatchTranscriptionResult {
  transcript: string
  confidence: number
}

export async function transcribeBlobWithDeepgram(blob: Blob, options: BatchTranscriptionOptions = {}): Promise<BatchTranscriptionResult> {
  const apiKey = appConfig.deepgram.apiKey
  if (!apiKey || apiKey.length < 10) {
    throw new Error('DeepGram API ключ не настроен')
  }

  const model = options.model || appConfig.deepgram.model || 'nova-2'
  const language = options.language || appConfig.deepgram.language || 'ru'
  const punctuate = options.punctuate ?? (appConfig.deepgram.punctuate === true)
  const smart_format = options.smart_format ?? (appConfig.deepgram.smart_format === true)

  const params = new URLSearchParams()
  params.set('model', model)
  params.set('language', language)
  if (punctuate) params.set('punctuate', 'true')
  if (smart_format) params.set('smart_format', 'true')

  const url = `https://api.deepgram.com/v1/listen?${params.toString()}`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': blob.type || 'application/octet-stream'
    },
    body: blob
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DeepGram HTTP ${res.status}: ${text || res.statusText}`)
  }

  const json = await res.json()
  const alt = json?.results?.channels?.[0]?.alternatives?.[0]
  const transcript = (alt?.transcript || '').trim()
  const confidence = typeof alt?.confidence === 'number' ? alt.confidence : 0
  return { transcript, confidence }
}
