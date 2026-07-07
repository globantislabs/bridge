import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { getClientIp, rateLimit } from '@/lib/crypto'
import { getOpenAITranslateKey, getOpenAITranslateModel } from '@/lib/system-settings'
import ZAI from 'z-ai-web-dev-sdk'

/**
 * Real LLM translation endpoint.
 *
 * Tries the admin-configured OpenAI key first (set via Admin Panel →
 * API Providers → "OpenAI Translate"). Falls back to the bundled ZAI SDK
 * (GLM model) if no key is configured — the ZAI SDK works out-of-the-box
 * in the dev environment with no setup required.
 *
 * For longer texts, see /api/translate/stream which uses streaming.
 */

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  nl: 'Dutch',
  ru: 'Russian',
  pl: 'Polish',
  tr: 'Turkish',
  ar: 'Arabic',
  he: 'Hebrew',
  hi: 'Hindi',
  bn: 'Bengali',
  ta: 'Tamil',
  te: 'Telugu',
  ml: 'Malayalam',
  zh: 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  vi: 'Vietnamese',
  th: 'Thai',
  id: 'Indonesian',
  ms: 'Malay',
  sv: 'Swedish',
  no: 'Norwegian',
  da: 'Danish',
  fi: 'Finnish',
  cs: 'Czech',
  el: 'Greek',
  uk: 'Ukrainian',
  ro: 'Romanian',
  hu: 'Hungarian',
  sw: 'Swahili',
  fa: 'Persian',
  ur: 'Urdu',
}

export async function GET() {
  return NextResponse.json({
    languages: Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({
      code,
      name,
    })),
  })
}

/**
 * Translate using the admin-configured OpenAI key. Returns the translated
 * string, or throws if the key is invalid / OpenAI returns an error.
 */
async function translateWithOpenAI(
  text: string,
  srcName: string,
  tgtName: string,
  tgtNameShort: string,
  apiKey: string,
  model: string
): Promise<string> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: Math.min(2000, text.length * 3),
      messages: [
        {
          role: 'system',
          content: `You are a professional real-time meeting translator. Translate the user's text from ${srcName} to ${tgtName}. Output ONLY the translated text with no quotes, no preamble, no notes. Preserve the original meaning, tone, and any proper nouns. Keep formatting (line breaks) if present. If the text is already in ${tgtNameShort}, return it unchanged.`,
        },
        { role: 'user', content: text },
      ],
    }),
  })
  if (!r.ok) {
    const errText = await r.text().catch(() => '')
    throw new Error(`OpenAI ${r.status}: ${errText.slice(0, 200)}`)
  }
  const data = await r.json()
  let translated = (data?.choices?.[0]?.message?.content ?? '').trim()
  // Strip wrapping quotes if model added them
  translated = translated.replace(/^["'""']+|["'""']+$/g, '')
  return translated
}

/**
 * Translate using the bundled ZAI SDK (GLM model). Works out-of-the-box
 * with no API key required in the dev environment.
 */
async function translateWithZAI(
  text: string,
  srcName: string,
  tgtName: string,
  tgtNameShort: string
): Promise<string> {
  const zai = await ZAI.create()
  const completion = await zai.chat.completions.create({
    model: 'glm-4.5-flash',
    messages: [
      {
        role: 'system',
        content: `You are a professional real-time meeting translator. Translate the user's text from ${srcName} to ${tgtName}. Output ONLY the translated text with no quotes, no preamble, no notes. Preserve the original meaning, tone, and any proper nouns. Keep formatting (line breaks) if present. If the text is already in ${tgtNameShort}, return it unchanged.`,
      },
      { role: 'user', content: text },
    ],
    temperature: 0.2,
    max_tokens: Math.min(2000, text.length * 3),
  })
  let translated = (completion?.choices?.[0]?.message?.content ?? '').trim()
  translated = translated.replace(/^["'""']+|["'""']+$/g, '')
  return translated
}

export async function POST(req: NextRequest) {
  const started = Date.now()
  const user = await getSessionUser(req)
  // Allow anonymous trial but with stricter rate limits
  const rateKey = `translate:${user?.id ?? getClientIp(req)}`
  const rl = rateLimit(rateKey, user ? 60 : 10)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limited', resetIn: rl.resetIn },
      { status: 429, headers: { 'Retry-After': String(rl.resetIn) } }
    )
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const { text, sourceLang = 'en', targetLang = 'es' } = body as {
    text: string
    sourceLang?: string
    targetLang?: string
  }
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }
  if (text.length > 4000) {
    return NextResponse.json(
      { error: 'text too long (max 4000 chars)' },
      { status: 413 }
    )
  }
  if (sourceLang === targetLang) {
    return NextResponse.json({
      translated: text,
      sourceLang,
      targetLang,
      latencyMs: Date.now() - started,
      confidence: 1,
      cached: false,
      engine: 'passthrough',
    })
  }

  const srcName = LANGUAGE_NAMES[sourceLang] ?? sourceLang
  const tgtName = LANGUAGE_NAMES[targetLang] ?? targetLang

  let translated = ''
  let confidence = 0.95
  let engine = 'zai' // default fallback
  let openaiError: string | null = null

  // ── Try admin-configured OpenAI key first ──────────────────────────────
  try {
    const apiKey = await getOpenAITranslateKey()
    if (apiKey) {
      const model = await getOpenAITranslateModel()
      translated = await translateWithOpenAI(
        text, srcName, tgtName, tgtName, apiKey, model
      )
      engine = 'openai'
      confidence = Math.max(0.85, 0.98 - text.length / 8000)
    }
  } catch (e: any) {
    // OpenAI key was set but the call failed — log and fall through to ZAI
    console.error('[translate] OpenAI error (falling back to ZAI):', e?.message ?? e)
    openaiError = e?.message ?? String(e)
  }

  // ── Fall back to ZAI SDK (works in dev with no key) ────────────────────
  if (!translated) {
    try {
      translated = await translateWithZAI(text, srcName, tgtName, tgtName)
      engine = openaiError ? 'zai-fallback' : 'zai'
      confidence = Math.max(0.7, 0.95 - text.length / 8000)
    } catch (err: any) {
      console.error('[translate] ZAI error:', err?.message ?? err)
      // Fall through to mock fallback below — never fail the API call
    }
  }

  // ── Last-resort mock fallback (offline phrasebook) ─────────────────────
  // If both OpenAI and ZAI are down, return a known-good canned translation
  // for common greetings so the UI doesn't show "Translation failed".
  // For other inputs, return the original text with a `mock` engine flag
  // so the UI can show a hint to the user.
  if (!translated) {
    const mock = mockTranslate(text, sourceLang, targetLang)
    if (mock) {
      translated = mock
      engine = 'mock'
      confidence = 0.4
    } else {
      // No mock available — return original text so UI doesn't break
      translated = text
      engine = 'passthrough-fallback'
      confidence = 0
    }
  }

  // Log activity
  if (user) {
    db.activityLog
      .create({
        data: {
          userId: user.id,
          action: 'translate',
          metaJson: JSON.stringify({
            sourceLang,
            targetLang,
            chars: text.length,
            latencyMs: Date.now() - started,
            engine,
          }),
          ipAddress: getClientIp(req),
          severity: 'info',
        },
      })
      .catch(() => {})
  }

  return NextResponse.json({
    translated,
    sourceLang,
    targetLang,
    latencyMs: Date.now() - started,
    confidence,
    cached: false,
    engine,
  })
}

/* ─── Offline phrasebook (mock fallback) ────────────────────────────────────
 * Tiny built-in translation map for common meeting phrases. Used only when
 * both OpenAI and ZAI SDK are unavailable. Returns null if no mock is
 * available, so the caller can fall back to passthrough.
 */
const PHRASEBOOK: Record<string, Record<string, string>> = {
  en_es: {
    'hello': 'Hola',
    'hi': 'Hola',
    'good morning': 'Buenos días',
    'good afternoon': 'Buenas tardes',
    'good evening': 'Buenas noches',
    'how are you': '¿Cómo estás?',
    'how are you today': '¿Cómo estás hoy?',
    'thank you': 'Gracias',
    'thanks': 'Gracias',
    'sorry': 'Lo siento',
    'excuse me': 'Disculpe',
    'yes': 'Sí',
    'no': 'No',
    'please': 'Por favor',
    'goodbye': 'Adiós',
    'bye': 'Adiós',
    'see you later': 'Hasta luego',
    'can you hear me': '¿Puedes oírme?',
    'can you see me': '¿Puedes verme?',
    'i agree': 'Estoy de acuerdo',
    'i disagree': 'No estoy de acuerdo',
    'let\'s start': 'Empecemos',
    'let\'s begin': 'Empecemos',
    'any questions': '¿Alguna pregunta?',
  },
  en_fr: {
    'hello': 'Bonjour',
    'hi': 'Salut',
    'thank you': 'Merci',
    'yes': 'Oui',
    'no': 'Non',
    'goodbye': 'Au revoir',
    'how are you': 'Comment allez-vous ?',
  },
  en_de: {
    'hello': 'Hallo',
    'hi': 'Hallo',
    'thank you': 'Danke',
    'yes': 'Ja',
    'no': 'Nein',
    'goodbye': 'Auf Wiedersehen',
  },
  en_hi: {
    'hello': 'नमस्ते',
    'hi': 'नमस्ते',
    'thank you': 'धन्यवाद',
    'yes': 'हाँ',
    'no': 'नहीं',
    'goodbye': 'अलविदा',
  },
  en_zh: {
    'hello': '你好',
    'hi': '你好',
    'thank you': '谢谢',
    'yes': '是',
    'no': '不',
    'goodbye': '再见',
  },
  en_ja: {
    'hello': 'こんにちは',
    'hi': 'こんにちは',
    'thank you': 'ありがとう',
    'yes': 'はい',
    'no': 'いいえ',
    'goodbye': 'さようなら',
  },
}

function mockTranslate(
  text: string,
  sourceLang: string,
  targetLang: string
): string | null {
  const key = `${sourceLang}_${targetLang}`
  const book = PHRASEBOOK[key]
  if (!book) return null
  const normalized = text.trim().toLowerCase().replace(/[?.!]+$/, '').trim()
  if (book[normalized]) return book[normalized]
  // Try matching first sentence
  const firstSentence = normalized.split(/[.!?]/)[0].trim()
  if (book[firstSentence]) return book[firstSentence]
  return null
}
