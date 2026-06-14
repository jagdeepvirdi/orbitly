import { Router } from 'express';

const router = Router();

const OLLAMA_URL   = process.env.OLLAMA_URL          || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_VISION_MODEL  || 'gemma3:4b';
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

const GEMINI_DAILY_LIMIT = 1500; // free tier RPD

// ── Gemini usage tracker (in-memory, resets at midnight Bangkok / ICT UTC+7) ──
function todayICT() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const gemini = {
  used: 0,
  date: todayICT(),
  quotaExceeded: false,
  rateLimited: false,   // true when hit per-minute limit (temporary)
  keyInvalid: false,
};

function geminiReset() {
  const today = todayICT();
  if (gemini.date !== today) {
    gemini.used          = 0;
    gemini.date          = today;
    gemini.quotaExceeded = false;
    gemini.rateLimited   = false;
  }
}

// ── prompts ───────────────────────────────────────────────────────────────────

const PRESCR_PROMPT = `You are a medical document parser. Look at this prescription image carefully.
Extract the information and return ONLY a valid JSON object with exactly these fields (empty string if not found):
{
  "label": "a short label like 'Metformin 500mg — Dr. Sharma' using the primary medication and doctor",
  "doctor": "prescribing doctor full name",
  "date": "prescription date in YYYY-MM-DD format"
}
Return only the JSON object, no explanation, no markdown fences.`;

const TEST_PROMPT = `You are a medical document parser. Look at this medical test result carefully.
Extract the information and return ONLY a valid JSON object with exactly these fields (empty string if not found):
{
  "name": "test name e.g. CBC Blood Panel, HbA1c, Chest X-Ray",
  "category": "exactly one of: Blood Test, Urine Test, X-Ray, MRI / CT, Ultrasound, ECG / EEG, Pathology, Other",
  "lab": "laboratory or hospital name",
  "date": "test date in YYYY-MM-DD format",
  "doctor": "ordering doctor full name",
  "notes": "key findings and values e.g. HbA1c: 6.8%, WBC: 7.2 x10^9/L, all within normal range"
}
Return only the JSON object, no explanation, no markdown fences.`;

// ── helpers ───────────────────────────────────────────────────────────────────

function extractJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*?\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function tryOllama(base64, prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt, images: [base64] }],
      stream: false,
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const d = await res.json();
  return extractJSON(d.message?.content || '');
}

async function tryGemini(base64, mimeType, prompt) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY not set');
  geminiReset();

  if (gemini.quotaExceeded) throw new Error('Gemini daily quota already exceeded');
  if (gemini.keyInvalid)    throw new Error('Gemini API key invalid');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ]}],
        generationConfig: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      // Distinguish daily quota vs per-minute rate limit from error body
      if (body.includes('RESOURCE_EXHAUSTED') || body.includes('quota')) {
        gemini.quotaExceeded = true;
        console.warn('[extract] Gemini daily quota exceeded — switching permanently to Ollama');
      } else {
        gemini.rateLimited = true;
        console.warn('[extract] Gemini rate limited (per-minute) — will retry on next request');
      }
    } else if (res.status === 400 && body.includes('API_KEY')) {
      gemini.keyInvalid = true;
      console.warn('[extract] Gemini invalid API key:', body.slice(0, 200));
    } else {
      console.warn(`[extract] Gemini HTTP ${res.status}:`, body.slice(0, 300));
    }
    throw new Error(`Gemini HTTP ${res.status}`);
  }

  // Success — count the call and clear transient rate-limit flag
  gemini.used++;
  gemini.rateLimited = false;
  const d = await res.json();
  return extractJSON(d.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

// ── status route ──────────────────────────────────────────────────────────────

router.get('/status', async (req, res) => {
  geminiReset();

  // Ollama live check
  const ollamaStatus = { active: false, model: OLLAMA_MODEL, modelLoaded: false };
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json();
      ollamaStatus.active      = true;
      ollamaStatus.modelLoaded = (d.models || []).some(m =>
        m.name.startsWith(OLLAMA_MODEL.split(':')[0])
      );
    }
  } catch { /* Ollama offline */ }

  // Gemini derived state
  const geminiState = () => {
    if (!GEMINI_KEY)            return 'unconfigured';
    if (gemini.keyInvalid)      return 'invalid_key';
    if (gemini.quotaExceeded)   return 'quota_exceeded';
    if (gemini.rateLimited)     return 'rate_limited';
    return 'active';
  };

  const geminiStatus = {
    configured: Boolean(GEMINI_KEY),
    model: 'gemini-1.5-flash',
    state: geminiState(),                     // 'active' | 'quota_exceeded' | 'rate_limited' | 'invalid_key' | 'unconfigured'
    used: gemini.used,
    limit: GEMINI_DAILY_LIMIT,
    pct: Math.round((gemini.used / GEMINI_DAILY_LIMIT) * 100),
    resetsAt: `${gemini.date}T17:00:00Z`,    // midnight ICT = 17:00 UTC
  };

  res.json({
    ollama: ollamaStatus,
    gemini: geminiStatus,
    anyActive: ollamaStatus.active || geminiStatus.state === 'active',
    primary: ollamaStatus.active ? 'ollama' : (geminiStatus.state === 'active' ? 'gemini' : 'none'),
  });
});

// ── extract route ─────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { fileBase64, mimeType = 'image/jpeg', extractType } = req.body;
  if (!fileBase64 || !extractType) {
    return res.status(400).json({ error: 'Missing fileBase64 or extractType' });
  }

  const base64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  const prompt  = extractType === 'prescription' ? PRESCR_PROMPT : TEST_PROMPT;

  // 1 — Ollama (local, GPU, private) — always tried first
  try {
    const data = await tryOllama(base64, prompt);
    if (data) {
      console.log(`[extract] ✓ Ollama (${OLLAMA_MODEL})`);
      return res.json({ source: 'ollama', model: OLLAMA_MODEL, data });
    }
    console.warn('[extract] Ollama returned unparseable response');
  } catch (e) {
    console.warn('[extract] Ollama failed:', e.message);
  }

  // 2 — Gemini Flash (cloud fallback)
  try {
    const data = await tryGemini(base64, mimeType, prompt);
    if (data) {
      console.log(`[extract] ✓ Gemini Flash (${gemini.used}/${GEMINI_DAILY_LIMIT} today)`);
      return res.json({ source: 'gemini', model: 'gemini-1.5-flash', data, geminiUsed: gemini.used });
    }
    console.warn('[extract] Gemini returned unparseable response');
  } catch (e) {
    console.warn('[extract] Gemini failed:', e.message);
  }

  res.status(503).json({
    error: 'Both AI backends unavailable. Check Ollama is running or verify GEMINI_API_KEY in .env.',
    geminiState: gemini.quotaExceeded ? 'quota_exceeded' : gemini.keyInvalid ? 'invalid_key' : 'failed',
  });
});

export default router;
