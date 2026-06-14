import { Router }   from 'express';
import { PDFParse } from 'pdf-parse';

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
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy().catch(() => {});
  }
}

// ── Text truncation (prevents Ollama timeout on large PDFs) ──────────────────
// 10 000 chars covers ~6–8 pages of dense lab report text — more than enough.
function truncateText(text, maxChars = 10000) {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + '\n[... document truncated for length ...]';
}

// ── Prompts ───────────────────────────────────────────────────────────────────
// IMPORTANT: Do NOT put example medication names, test values, doctor names, or
// any real-world medical content inside the prompt templates. Small vision models
// (e.g. gemma3:4b) are known to copy examples from the prompt verbatim instead
// of reading the actual document — causing hallucinations.

const PRESCR_PROMPT_TEXT = `You are a strict medical document parser.

RULES — read carefully before answering:
1. Extract ONLY information that is literally present in the text below.
2. Do NOT invent, guess, or hallucinate any medication names, doses, doctors, or dates.
3. Copy medication names and doses character-for-character as they appear.
4. If any field is absent from the text, use an empty string "".
5. Return ONLY the JSON object — no explanation, no markdown, no code fences.

Output this exact JSON structure:
{
  "label": "short identifier built from the actual doctor name and first drug found in the text",
  "doctor": "prescribing doctor name as written",
  "clinic": "clinic or hospital name as written",
  "date": "prescription date in YYYY-MM-DD format",
  "medications": [
    {
      "name": "drug name exactly as written",
      "dose": "dose exactly as written",
      "frequency": "frequency exactly as written",
      "duration": "duration exactly as written",
      "instructions": "instructions exactly as written"
    }
  ]
}

PRESCRIPTION TEXT:
`;

const PRESCR_PROMPT_VISION = `You are a strict medical document parser reading a prescription image.

RULES — follow exactly:
1. Read ONLY the text physically visible/printed in this image.
2. Do NOT invent medications, doses, or any details not clearly visible.
3. Do NOT use any example from your training data — only what you see in this image.
4. If text is illegible or a field is absent, use an empty string "".
5. Copy medication names and doses exactly as they appear in the image.
6. Return ONLY the JSON object — no explanation, no markdown, no code fences.

Output this exact JSON structure:
{
  "label": "short identifier built from the actual doctor name and first drug visible in the image",
  "doctor": "prescribing doctor name as it appears in the image",
  "clinic": "clinic or hospital name as it appears",
  "date": "prescription date in YYYY-MM-DD format",
  "medications": [
    {
      "name": "drug name exactly as written in the image",
      "dose": "dose exactly as written in the image",
      "frequency": "frequency exactly as written",
      "duration": "duration exactly as written",
      "instructions": "instructions exactly as written"
    }
  ]
}`;

const TEST_PROMPT_TEXT = `You are a strict medical document parser.

RULES — read carefully before answering:
1. Extract ALL test results present in the report below.
2. For each test, you MUST generate and enhance two additional columns: "What test Checks" and "Clinical Meaning for Your Health" based on the observed value and status.
3. For status: compare the value to the normal range/biological reference interval. Set "High", "Low", or "Normal". If no range is provided, use "Normal".
4. Return ONLY the JSON object — no explanation, no markdown, no code fences.

Output this exact JSON structure:
{
  "name": "test panel name as written in the report",
  "category": "exactly one of: Blood Test, Urine Test, X-Ray, MRI / CT, Ultrasound, ECG / EEG, Pathology, Other",
  "lab": "laboratory or hospital name as written",
  "date": "test date in YYYY-MM-DD format",
  "doctor": "ordering doctor name as written",
  "notes": "brief summary of key findings",
  "tests": [
    {
      "category": "specific sub-category of the test (e.g. Hematology, Liver Function, Lipid Panel, Thyroid, Electrolytes, Kidney Function, etc.)",
      "name": "individual test name exactly as written (e.g., Hemoglobin, HbA1c, Cholesterol)",
      "value": "measured result/value exactly as written (e.g., 14.5, 6.8)",
      "unit": "unit of measurement exactly as written (e.g., g/dL, %)",
      "interval": "biological reference interval or reference range exactly as written (e.g., '13.5 - 17.5', '< 100')",
      "status": "High | Low | Normal",
      "checks": "clear, simple explanation of what this specific test checks (AI enhanced)",
      "meaning": "clinical meaning of the observed value for the patient's health, explaining what it means if it is high, low, or normal (AI enhanced)"
    }
  ]
}

REPORT TEXT:
`;

const TEST_PROMPT_VISION = `You are a strict medical document parser reading a lab result image.

RULES — follow exactly:
1. Read ALL test results physically visible in this image.
2. For each test, you MUST generate and enhance two additional columns: "What test Checks" and "Clinical Meaning for Your Health" based on the observed value and status.
3. For status: compare the value to the reference range/biological reference interval. Set "High", "Low", or "Normal". If no range is shown, use "Normal".
4. Return ONLY the JSON object — no explanation, no markdown, no code fences.

Output this exact JSON structure:
{
  "name": "test panel name as visible in the image",
  "category": "exactly one of: Blood Test, Urine Test, X-Ray, MRI / CT, Ultrasound, ECG / EEG, Pathology, Other",
  "lab": "laboratory or hospital name as visible",
  "date": "test date in YYYY-MM-DD format",
  "doctor": "ordering doctor name as visible",
  "notes": "brief summary of key findings",
  "tests": [
    {
      "category": "specific sub-category of the test (e.g. Hematology, Liver Function, Lipid Panel, Thyroid, Electrolytes, Kidney Function, etc.)",
      "name": "individual test name exactly as visible",
      "value": "measured result/value exactly as visible",
      "unit": "unit of measurement exactly as visible",
      "interval": "biological reference interval or reference range exactly as visible",
      "status": "High | Low | Normal",
      "checks": "clear, simple explanation of what this specific test checks (AI enhanced)",
      "meaning": "clinical meaning of the observed value for the patient's health, explaining what it means if it is high, low, or normal (AI enhanced)"
    }
  ]
}`;

const INTERPRET_PROMPT = (tests) =>
  `You are a friendly health educator. Below are out-of-range blood test results from a patient's report.
For each result, write 1–2 plain sentences explaining what it means in simple language and whether the patient should consult a doctor soon.
Return ONLY a JSON array — no explanation, no markdown:
[{ "name": "exact test name from input", "interpretation": "plain-English explanation" }]

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
async function ollamaText(prompt, timeoutMs = 180000) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      format: 'json',
      options: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const d = await res.json();
  const raw = d.message?.content || '';
  console.log(`[ollama] raw response (first 300): ${raw.slice(0, 300)}`);
  return extractJSON(raw);
}

async function ollamaVision(base64, prompt) {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: 'user', content: prompt, images: [base64] }],
      stream: false,
      format: 'json',
      options: { temperature: 0 },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const d = await res.json();
  const raw = d.message?.content || '';
  console.log(`[ollama] raw vision response (first 300): ${raw.slice(0, 300)}`);
  return extractJSON(raw);
}

// ── Gemini helper with model failover chain ──────────────────────────────────
const GEMINI_MODELS = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash'
];

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

  let lastError = null;
  for (const model of GEMINI_MODELS) {
    console.log(`[extract] Attempting Gemini model: ${model}`);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { 
              temperature: 0.1,
              responseMimeType: 'application/json'
            },
          }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (!res.ok) {
        const body = await res.text();
        console.warn(`[extract] Gemini model ${model} returned HTTP ${res.status}:`, body.slice(0, 200));
        
        if (res.status === 429) {
          if (body.includes('RESOURCE_EXHAUSTED') || body.includes('quota')) {
            // This specific model is out of quota; continue to try other models
            continue;
          } else {
            gemini.rateLimited = true;
          }
        } else if (res.status === 400 && body.includes('API_KEY')) {
          gemini.keyInvalid = true;
          throw new Error('Gemini API key invalid');
        }
        lastError = new Error(`Gemini HTTP ${res.status} for ${model}`);
        continue;
      }

      gemini.used++;
      gemini.rateLimited = false;
      const d = await res.json();
      const extracted = extractJSON(d.candidates?.[0]?.content?.parts?.[0]?.text || '');
      if (extracted) {
        return { data: extracted, modelUsed: model };
      }
      lastError = new Error(`Gemini returned unparseable JSON for ${model}`);
    } catch (e) {
      console.warn(`[extract] Gemini model ${model} failed:`, e.message);
      lastError = e;
    }
  }

  // If we reach here, all models in the chain failed
  if (lastError && (lastError.message.includes('429') || lastError.message.includes('quota') || lastError.message.includes('RESOURCE_EXHAUSTED'))) {
    gemini.quotaExceeded = true;
  }
  throw lastError || new Error('All Gemini models failed');
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

  const isGeminiActive = geminiState() === 'active';

  res.json({
    ollama: ollamaStatus,
    gemini: {
      configured: Boolean(GEMINI_KEY),
      model: 'gemini-flash-latest (with failover chain)',
      state: geminiState(),
      used: gemini.used,
      limit: GEMINI_DAILY_LIMIT,
      pct: Math.round((gemini.used / GEMINI_DAILY_LIMIT) * 100),
      resetsAt: `${gemini.date}T17:00:00Z`,
    },
    anyActive: ollamaStatus.active || isGeminiActive,
    primary: isGeminiActive ? 'gemini' : (ollamaStatus.active ? 'ollama' : 'none'),
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

  // ── Step 2: choose prompt mode and build prompt ───────────────────────────
  const useTextMode = isPDF && pdfText && pdfText.length > 50;

  // Truncate before sending — 10 000 chars covers any real-world blood report
  const safeText     = useTextMode ? truncateText(pdfText, 10000) : null;
  const textPrompt   = useTextMode ? (prescr ? PRESCR_PROMPT_TEXT + safeText : TEST_PROMPT_TEXT + safeText) : null;
  const visionPrompt = prescr ? PRESCR_PROMPT_VISION : TEST_PROMPT_VISION;

  if (useTextMode) {
    console.log(`[extract] text mode — ${safeText.length} chars (original ${pdfText.length})`);
  } else {
    console.log(`[extract] vision mode — mimeType: ${mimeType}`);
  }

  // Determine if Gemini is available to use
  geminiReset();
  const geminiAvailable = GEMINI_KEY && !gemini.quotaExceeded && !gemini.keyInvalid;

  // ── Step 3: try Gemini first if available ─────────────────────────────────
  if (geminiAvailable) {
    try {
      const result = useTextMode
        ? await tryGemini(textPrompt, null, null)
        : await tryGemini(visionPrompt, base64, mimeType);

      if (result && result.data) {
        console.log(`[extract] ✓ Gemini (${gemini.used}/${GEMINI_DAILY_LIMIT}) — ${useTextMode ? 'text' : 'vision'} mode using ${result.modelUsed}`);
        return res.json({
          source: 'gemini', model: result.modelUsed,
          mode: useTextMode ? 'text' : 'vision',
          geminiUsed: gemini.used,
          data: result.data,
          ...(pdfText ? { extractedTextLength: pdfText.length } : {}),
        });
      }
      console.warn('[extract] Gemini returned unparseable JSON — falling back to Ollama');
    } catch (e) {
      console.warn('[extract] Gemini failed, falling back to Ollama:', e.message);
    }
  }

  // ── Step 4: try Ollama (fallback or primary if Gemini unconfigured/exhausted) ──
  try {
    const data = useTextMode
      ? await ollamaText(textPrompt)
      : await ollamaVision(base64, visionPrompt);

    if (data) {
      console.log(`[extract] ✓ Ollama (${OLLAMA_MODEL}) — ${useTextMode ? 'text' : 'vision'} mode`);
      return res.json({
        source: 'ollama', model: OLLAMA_MODEL,
        mode: useTextMode ? 'text' : 'vision',
        data,
        ...(pdfText ? { extractedTextLength: pdfText.length } : {}),
      });
    }
    console.warn('[extract] Ollama returned unparseable JSON');
  } catch (e) {
    console.warn('[extract] Ollama failed:', e.message, e.cause?.code || '');
  }

  res.status(503).json({
    error: 'Both AI backends unavailable. Check Ollama is running or verify GEMINI_API_KEY in .env.',
    geminiState: gemini.quotaExceeded ? 'quota_exceeded' : gemini.keyInvalid ? 'invalid_key' : 'failed',
    pdfTextExtracted: Boolean(pdfText),
    pdfTextLength: pdfText?.length,
  });
});

// ── Interpretation route (second AI call for out-of-range blood results) ──────
router.post('/interpret', async (req, res) => {
  const { tests } = req.body; // [{ name, value, unit, status }]
  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: 'tests array required' });
  }
  const outOfRange = tests.filter(t => t.status === 'high' || t.status === 'low' || t.status === 'High' || t.status === 'Low');
  if (outOfRange.length === 0) return res.json({ interpretations: [] });

  const prompt = INTERPRET_PROMPT(outOfRange);

  geminiReset();
  const geminiAvailable = GEMINI_KEY && !gemini.quotaExceeded && !gemini.keyInvalid;

  if (geminiAvailable) {
    try {
      const result = await tryGemini(prompt, null, null);
      if (result && Array.isArray(result.data)) {
        return res.json({ source: 'gemini', interpretations: result.data, model: result.modelUsed });
      }
    } catch (e) {
      console.warn('[interpret] Gemini failed, falling back to Ollama:', e.message);
    }
  }

  try {
    const r = await ollamaText(prompt);
    if (Array.isArray(r)) return res.json({ source: 'ollama', interpretations: r });
  } catch (e) {
    console.warn('[interpret] Ollama failed:', e.message);
  }

  res.status(503).json({ error: 'Interpretation unavailable', interpretations: [] });
});

export default router;
