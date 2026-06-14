import { Router }   from 'express';
import pdfParse      from 'pdf-parse/lib/pdf-parse.js';

const router = Router();

const OLLAMA_URL   = process.env.OLLAMA_URL           || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_VISION_MODEL   || 'gemma3:4b';
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

const GEMINI_DAILY_LIMIT = 1500;

// ── Gemini usage tracker (resets midnight Bangkok / ICT UTC+7) ────────────────
function todayICT() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const gemini = {
  used: 0,
  date: todayICT(),
  quotaExceeded: false,
  rateLimited: false,
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

// ── PDF text extraction ───────────────────────────────────────────────────────
async function extractPDFText(base64) {
  const buffer = Buffer.from(base64, 'base64');
  const result = await pdfParse(buffer);
  return result.text.trim();
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const PRESCR_PROMPT_TEXT = `You are a medical document parser. Read the following prescription text carefully.
Extract the information and return ONLY a valid JSON object with exactly these fields:
{
  "label": "a short label like 'Metformin 500mg — Dr. Sharma' using the primary medication and doctor",
  "doctor": "prescribing doctor full name",
  "clinic": "clinic or hospital name, empty string if not found",
  "date": "prescription date in YYYY-MM-DD format, empty string if not found",
  "medications": [
    {
      "name": "medication name",
      "dose": "dose e.g. 500mg, 1 tablet",
      "frequency": "e.g. twice daily, once at night",
      "duration": "e.g. 30 days, 2 weeks, ongoing",
      "instructions": "e.g. take with food, avoid alcohol"
    }
  ]
}
The medications array must contain ALL medications listed. If a field is not found use an empty string.
Return only the JSON object, no explanation, no markdown fences.

PRESCRIPTION TEXT:
`;

const PRESCR_PROMPT_VISION = `You are a medical document parser. Look at this prescription image carefully.
Extract the information and return ONLY a valid JSON object with exactly these fields:
{
  "label": "a short label like 'Metformin 500mg — Dr. Sharma' using the primary medication and doctor",
  "doctor": "prescribing doctor full name",
  "clinic": "clinic or hospital name, empty string if not found",
  "date": "prescription date in YYYY-MM-DD format, empty string if not found",
  "medications": [
    {
      "name": "medication name",
      "dose": "dose e.g. 500mg, 1 tablet",
      "frequency": "e.g. twice daily, once at night",
      "duration": "e.g. 30 days, 2 weeks, ongoing",
      "instructions": "e.g. take with food, avoid alcohol"
    }
  ]
}
The medications array must contain ALL medications listed. If a field is not found use an empty string.
Return only the JSON object, no explanation, no markdown fences.`;

const TEST_PROMPT_TEXT = `You are a medical document parser. Read the following medical test result report carefully.
Extract the information and return ONLY a valid JSON object with exactly these fields:
{
  "name": "test panel name e.g. CBC Blood Panel, Lipid Profile, HbA1c",
  "category": "exactly one of: Blood Test, Urine Test, X-Ray, MRI / CT, Ultrasound, ECG / EEG, Pathology, Other",
  "lab": "laboratory or hospital name",
  "date": "test date in YYYY-MM-DD format",
  "doctor": "ordering doctor full name",
  "notes": "overall summary or key findings in 1-2 sentences",
  "tests": [
    {
      "name": "individual test name e.g. Hemoglobin, WBC, Glucose",
      "value": "measured value as a string e.g. 14.5",
      "unit": "unit e.g. g/dL, mmol/L, %",
      "normalMin": "lower bound of normal range as string, empty if not available",
      "normalMax": "upper bound of normal range as string, empty if not available",
      "status": "exactly one of: normal, high, low, unknown"
    }
  ]
}
The tests array must contain ALL individual test results listed in the report.
If a field is not found use an empty string. Return only the JSON object, no explanation, no markdown fences.

REPORT TEXT:
`;

const TEST_PROMPT_VISION = `You are a medical document parser. Look at this medical test result image carefully.
Extract the information and return ONLY a valid JSON object with exactly these fields:
{
  "name": "test panel name e.g. CBC Blood Panel, Lipid Profile, HbA1c",
  "category": "exactly one of: Blood Test, Urine Test, X-Ray, MRI / CT, Ultrasound, ECG / EEG, Pathology, Other",
  "lab": "laboratory or hospital name",
  "date": "test date in YYYY-MM-DD format",
  "doctor": "ordering doctor full name",
  "notes": "overall summary or key findings in 1-2 sentences",
  "tests": [
    {
      "name": "individual test name e.g. Hemoglobin, WBC, Glucose",
      "value": "measured value as a string e.g. 14.5",
      "unit": "unit e.g. g/dL, mmol/L, %",
      "normalMin": "lower bound of normal range as string, empty if not available",
      "normalMax": "upper bound of normal range as string, empty if not available",
      "status": "exactly one of: normal, high, low, unknown"
    }
  ]
}
The tests array must contain ALL individual test results listed. Return only the JSON object, no explanation, no markdown fences.`;

const INTERPRET_PROMPT = (tests) =>
  `You are a friendly health educator. Below are out-of-range blood test results. For each one, write 1–2 plain sentences explaining what it means and when the patient should consult a doctor. Return ONLY a JSON array with no explanation:
[{ "name": "test name", "interpretation": "plain-English explanation" }]

OUT-OF-RANGE RESULTS:
${JSON.stringify(tests)}`;

// ── JSON extraction helper ────────────────────────────────────────────────────
function extractJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

// ── Ollama helpers ────────────────────────────────────────────────────────────
async function ollamaText(prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const d = await res.json();
  return extractJSON(d.message?.content || '');
}

async function ollamaVision(base64, prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt, images: [base64] }],
      stream: false,
      options: { temperature: 0.1 },
    }),
    signal: AbortSignal.timeout(90000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const d = await res.json();
  return extractJSON(d.message?.content || '');
}

// ── Gemini helper ─────────────────────────────────────────────────────────────
async function tryGemini(prompt, base64, mimeType) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY not set');
  geminiReset();
  if (gemini.quotaExceeded) throw new Error('Gemini daily quota already exceeded');
  if (gemini.keyInvalid)    throw new Error('Gemini API key invalid');

  // Build parts — if base64 provided, include the file; otherwise text-only
  const parts = [{ text: prompt }];
  if (base64 && mimeType) {
    parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(30000),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) {
      if (body.includes('RESOURCE_EXHAUSTED') || body.includes('quota')) {
        gemini.quotaExceeded = true;
        console.warn('[extract] Gemini daily quota exceeded');
      } else {
        gemini.rateLimited = true;
        console.warn('[extract] Gemini rate limited (per-minute)');
      }
    } else if (res.status === 400 && body.includes('API_KEY')) {
      gemini.keyInvalid = true;
      console.warn('[extract] Gemini invalid API key');
    } else {
      console.warn(`[extract] Gemini HTTP ${res.status}:`, body.slice(0, 300));
    }
    throw new Error(`Gemini HTTP ${res.status}`);
  }

  gemini.used++;
  gemini.rateLimited = false;
  const d = await res.json();
  return extractJSON(d.candidates?.[0]?.content?.parts?.[0]?.text || '');
}

// ── Status route ──────────────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  geminiReset();

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

  const geminiState = () => {
    if (!GEMINI_KEY)           return 'unconfigured';
    if (gemini.keyInvalid)     return 'invalid_key';
    if (gemini.quotaExceeded)  return 'quota_exceeded';
    if (gemini.rateLimited)    return 'rate_limited';
    return 'active';
  };

  res.json({
    ollama: ollamaStatus,
    gemini: {
      configured: Boolean(GEMINI_KEY),
      model: 'gemini-2.0-flash',
      state: geminiState(),
      used: gemini.used,
      limit: GEMINI_DAILY_LIMIT,
      pct: Math.round((gemini.used / GEMINI_DAILY_LIMIT) * 100),
      resetsAt: `${gemini.date}T17:00:00Z`,
    },
    anyActive: ollamaStatus.active || geminiState() === 'active',
    primary: ollamaStatus.active ? 'ollama' : (geminiState() === 'active' ? 'gemini' : 'none'),
  });
});

// ── Main extract route ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { fileBase64, mimeType = 'image/jpeg', extractType } = req.body;
  if (!fileBase64 || !extractType) {
    return res.status(400).json({ error: 'Missing fileBase64 or extractType' });
  }

  const base64 = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  const isPDF  = mimeType === 'application/pdf';
  const isImg  = mimeType.startsWith('image/');

  const prescr = extractType === 'prescription';

  // ── Step 1: extract text from PDF (so any LLM can read it, not just vision) ─
  let pdfText = null;
  if (isPDF) {
    try {
      pdfText = await extractPDFText(base64);
      console.log(`[extract] PDF text extracted: ${pdfText.length} chars`);
    } catch (e) {
      console.warn('[extract] pdf-parse failed:', e.message);
    }
  }

  // ── Step 2: choose prompt mode ────────────────────────────────────────────
  // Text mode: PDF with extracted text, or a text prompt appended with PDF content
  // Vision mode: image files passed directly to multimodal model
  const useTextMode = isPDF && pdfText && pdfText.length > 50;

  const textPrompt = useTextMode
    ? (prescr ? PRESCR_PROMPT_TEXT + pdfText : TEST_PROMPT_TEXT + pdfText)
    : null;
  const visionPromptText = prescr ? PRESCR_PROMPT_VISION : TEST_PROMPT_VISION;

  // ── Step 3: try Ollama ────────────────────────────────────────────────────
  try {
    const data = useTextMode
      ? await ollamaText(textPrompt)
      : await ollamaVision(base64, visionPromptText);

    if (data) {
      console.log(`[extract] ✓ Ollama (${OLLAMA_MODEL}) — ${useTextMode ? 'text' : 'vision'} mode`);
      return res.json({
        source: 'ollama', model: OLLAMA_MODEL,
        mode: useTextMode ? 'text' : 'vision',
        data,
        ...(pdfText ? { extractedTextLength: pdfText.length } : {}),
      });
    }
    console.warn('[extract] Ollama returned unparseable response');
  } catch (e) {
    console.warn('[extract] Ollama failed:', e.message);
  }

  // ── Step 4: Gemini fallback ───────────────────────────────────────────────
  try {
    // For text mode: send only the text prompt (no inline_data); Gemini handles both
    const data = useTextMode
      ? await tryGemini(textPrompt, null, null)
      : await tryGemini(visionPromptText, base64, mimeType);

    if (data) {
      console.log(`[extract] ✓ Gemini (${gemini.used}/${GEMINI_DAILY_LIMIT}) — ${useTextMode ? 'text' : 'vision'} mode`);
      return res.json({
        source: 'gemini', model: 'gemini-2.0-flash',
        mode: useTextMode ? 'text' : 'vision',
        geminiUsed: gemini.used,
        data,
        ...(pdfText ? { extractedTextLength: pdfText.length } : {}),
      });
    }
    console.warn('[extract] Gemini returned unparseable response');
  } catch (e) {
    console.warn('[extract] Gemini failed:', e.message);
  }

  res.status(503).json({
    error: 'Both AI backends unavailable. Check Ollama is running or verify GEMINI_API_KEY in .env.',
    geminiState: gemini.quotaExceeded ? 'quota_exceeded' : gemini.keyInvalid ? 'invalid_key' : 'failed',
    pdfTextExtracted: Boolean(pdfText),
  });
});

// ── Interpretation route (second AI call for out-of-range blood results) ──────
router.post('/interpret', async (req, res) => {
  const { tests } = req.body; // [{ name, value, unit, status }]
  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: 'tests array required' });
  }
  const outOfRange = tests.filter(t => t.status === 'high' || t.status === 'low');
  if (outOfRange.length === 0) return res.json({ interpretations: [] });

  const prompt = INTERPRET_PROMPT(outOfRange);

  try {
    const r = await ollamaText(prompt);
    if (Array.isArray(r)) return res.json({ source: 'ollama', interpretations: r });
  } catch (e) {
    console.warn('[interpret] Ollama failed:', e.message);
  }

  try {
    const r = await tryGemini(prompt, null, null);
    if (Array.isArray(r)) return res.json({ source: 'gemini', interpretations: r });
  } catch (e) {
    console.warn('[interpret] Gemini failed:', e.message);
  }

  res.status(503).json({ error: 'Interpretation unavailable', interpretations: [] });
});

export default router;
