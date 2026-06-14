import { Router } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import db from '../db.js';

const execAsync = promisify(exec);
const router = Router();

const OLLAMA_URL   = process.env.OLLAMA_URL           || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_VISION_MODEL  || 'gemma3:4b';
const GEMINI_KEY   = process.env.GEMINI_API_KEY;

// Track Gemini quota state so we stop hammering it once it's exhausted
function todayICT() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
const gemini = { quotaExceeded: false, rateLimited: false, keyInvalid: false, date: todayICT() };
function geminiReset() {
  const today = todayICT();
  if (gemini.date !== today) {
    gemini.quotaExceeded = false;
    gemini.rateLimited   = false;
    gemini.date          = today;
  }
}

function extractJSON(text) {
  if (!text) return null;
  const cleaned = text.replace(/```(?:json)?/gi, '').trim();
  try { return JSON.parse(cleaned); } catch {}
  // Greedy match — capture full outer object including nested arrays
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

function extractPageText(html, url) {
  const title = (html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '').trim();

  const metaMap = {};
  const metaRe = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  let mm;
  while ((mm = metaRe.exec(html)) !== null) metaMap[mm[1].toLowerCase()] = mm[2];
  const metaRe2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']([^"']+)["'][^>]*>/gi;
  while ((mm = metaRe2.exec(html)) !== null) metaMap[mm[2].toLowerCase()] ??= mm[1];

  const ogTitle     = metaMap['og:title'] || metaMap['twitter:title'] || '';
  const description = metaMap['og:description'] || metaMap['description'] || metaMap['twitter:description'] || '';
  const keywords    = metaMap['keywords'] || '';

  // JSON-LD — extract flat text AND any nested course lists (hasPart / itemListElement / @graph)
  const ldRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const ldChunks   = [];
  const nestedNames = [];

  const pickCourseNames = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    const lists = [obj.hasPart, obj.itemListElement, obj['@graph']].filter(Array.isArray);
    for (const list of lists) {
      for (const item of list) {
        const t = item['@type'] || '';
        if (item.name && (t.includes('Course') || t.includes('ListItem') || t === '')) {
          nestedNames.push(item.name);
        }
        // one level of recursion (catches @graph → hasPart)
        pickCourseNames(item);
      }
    }
  };

  while ((mm = ldRe.exec(html)) !== null) {
    try {
      const obj = JSON.parse(mm[1].trim());
      pickCourseNames(obj);
      const flatten = (o, depth = 0) => {
        if (depth > 4 || !o || typeof o !== 'object') return '';
        return Object.entries(o).map(([k, v]) => {
          if (typeof v === 'string' && v.length > 15 && !v.startsWith('http') && !v.startsWith('@'))
            return `${k}: ${v.slice(0, 300)}`;
          if (typeof v === 'object') return flatten(v, depth + 1);
          return '';
        }).filter(Boolean).join('\n');
      };
      const flat = flatten(obj);
      if (flat.length > 50) ldChunks.push(flat.slice(0, 1200));
    } catch {}
  }

  const headings = [...html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    .filter(h => h.length > 3 && h.length < 200)
    .slice(0, 20)
    .join(' | ');

  // Framework data blobs — Next.js (__NEXT_DATA__), Nuxt, Redux, etc.
  // These often contain the full course/module list even on JS-rendered pages.
  const frameworkTitles = [];
  const frameworkPatterns = [
    /<script[^>]+id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/i,
    /window\.__NUXT__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/i,
    /window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/i,
    /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]+?\});\s*<\/script>/i,
  ];

  for (const pattern of frameworkPatterns) {
    const fm = html.match(pattern);
    if (!fm) continue;
    const blob = fm[1].slice(0, 200000); // cap at 200 KB to avoid huge blobs

    // Pull all "title" values that look like course/module names (5–100 chars, not a URL)
    const titleRe = /"title"\s*:\s*"([^"]{5,100})"/g;
    let tm;
    while ((tm = titleRe.exec(blob)) !== null) {
      const t = tm[1].trim();
      if (!t.startsWith('http') && !frameworkTitles.includes(t)) {
        frameworkTitles.push(t);
      }
    }
    break; // only need the first matching blob
  }

  const slug = url.split('/').pop().split('?')[0].replace(/-/g, ' ');

  const parts = [
    `URL: ${url}`,
    `Slug hint: ${slug}`,
    title       && `Page title: ${title}`,
    ogTitle     && `OG title: ${ogTitle}`,
    description && `Description: ${description}`,
    keywords    && `Keywords: ${keywords}`,
    nestedNames.length > 0 &&
      `Courses found in structured data (${nestedNames.length} items):\n${nestedNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}`,
    headings    && `Headings: ${headings}`,
    ldChunks.length && `Structured data:\n${ldChunks.join('\n---\n').slice(0, 2000)}`,
    frameworkTitles.length > 0 &&
      `Page data titles (includes course names — filter out UI labels):\n${frameworkTitles.slice(0, 60).map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
  ].filter(Boolean).join('\n\n');

  return parts;
}

function coursePrompt(text) {
  return `You are a course information extractor. Analyze the text about a learning resource.

CASE 1 — If this is a CERTIFICATION BUNDLE, PROFESSIONAL CERTIFICATE, or LEARNING PATH containing MULTIPLE courses (2 or more), return:
{
  "type": "bundle",
  "bundle_name": "short certificate/program title (max 70 chars)",
  "courses": [
    { "name": "Course 1 title (max 60 chars)", "description": "one-sentence summary", "sessions": 5, "phase": 0 },
    { "name": "Course 2 title (max 60 chars)", "description": "one-sentence summary", "sessions": 5, "phase": 0 }
  ]
}

CASE 2 — If this is a SINGLE COURSE, return:
{
  "type": "single",
  "name": "short course title (max 60 chars)",
  "description": "one-sentence description of what is taught",
  "sessions": 5,
  "phase": 1
}

Rules:
- Use "bundle" if the page is for a multi-course program/specialization/certificate (even if you only know some course names — include them all).
- sessions per course: integer 3–8 (estimate based on complexity; default 5 if unknown).
- phase: 0=Foundations/Intro, 1=Building/Core, 2=Advanced/Agents, 3=Production/Capstone.
- For bundles, order courses from foundational to advanced.
- You MUST extract and return ALL courses listed. If there are 11 courses (as in "Courses found in structured data"), return all 11 of them. Do not truncate or limit the list.

Text to analyze:
${text.slice(0, 20000)}

Return ONLY the JSON object, no markdown, no explanation.`;
}

router.get('/', async (req, res) => {
  try {
    const { plan_id } = req.query;
    let q = 'SELECT * FROM courses';
    const params = [];
    if (plan_id) { q += ' WHERE plan_id = $1'; params.push(Number(plan_id)); }
    q += ' ORDER BY phase, sort_order';
    const { rows } = await db.query(q, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const fields = ['done', 'next', 'next_iso', 'url', 'name', 'phase', 'total', 'plan_id'];
  const updates = fields.filter(f => req.body[f] !== undefined);
  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  const set  = updates.map((f, i) => `${f} = $${i + 2}`).join(', ');
  const vals = updates.map(f => req.body[f]);
  try {
    const { rows } = await db.query(
      `UPDATE courses SET ${set} WHERE id = $1 RETURNING *`,
      [id, ...vals]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper to fetch url with curl fallback if Cloudflare blocks standard fetch
async function fetchPage(url) {
  try {
    const pageRes = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await pageRes.text();
    if (html.includes('Just a moment...') || html.includes('cloudflare-challenge') || html.includes('cf-browser-verification')) {
      throw new Error('Cloudflare block detected on standard fetch');
    }
    return html;
  } catch (e) {
    console.warn(`[courses/ai-import] Standard fetch failed/blocked: ${e.message}. Trying curl fallback...`);
    try {
      const isWin = process.platform === 'win32';
      const curlCmd = `curl.exe -s -L ${isWin ? '--ssl-no-revoke' : ''} -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36" "${url}"`;
      const { stdout } = await execAsync(curlCmd, { maxBuffer: 10 * 1024 * 1024 });
      if (stdout.includes('Just a moment...') || stdout.includes('cloudflare-challenge')) {
        throw new Error('Cloudflare block detected on curl fallback', { cause: e });
      }
      return stdout;
    } catch (curlErr) {
      console.warn(`[courses/ai-import] Curl fallback failed: ${curlErr.message}`);
      throw new Error(`Failed to fetch page: ${e.message} and curl fallback failed: ${curlErr.message}`, { cause: curlErr });
    }
  }
}

// POST /ai-import — extract course info from URL or name using Ollama/Gemini
router.post('/ai-import', async (req, res) => {
  const { url, name } = req.body;
  if (!url && !name) return res.status(400).json({ error: 'Provide url or name' });

  let text = name || '';
  if (url) {
    try {
      const html = await fetchPage(url);
      text = name ? `Course hint: ${name}\n\n${extractPageText(html, url)}` : extractPageText(html, url);
    } catch (e) {
      console.warn('[courses/ai-import] URL fetch failed:', e.message, '— using name only');
      text = name || url;
    }
  }

  const prompt = coursePrompt(text);

  let ollamaErr = null;
  let geminiErr = null;

  // ── 1. Ollama (local, always tried first) ────────────────────────────────
  // Pre-flight: quick ping to confirm Ollama is reachable before the slow chat call
  let ollamaReachable = false;
  try {
    const ping = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    ollamaReachable = ping.ok;
  } catch { /* not reachable */ }

  if (ollamaReachable) {
    try {
      // Generous timeout: gemma3:4b cold-start (model loading) can take 20-40 s,
      // plus inference time — 90 s is safe for the worst case.
      const r = await fetch(`${OLLAMA_URL}/api/chat`, {
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
      if (r.ok) {
        const d = await r.json();
        const data = extractJSON(d.message?.content || '');
        if (data) return res.json({ source: 'ollama', data });
        ollamaErr = 'Ollama returned unparseable response';
      } else {
        ollamaErr = `Ollama HTTP ${r.status}`;
      }
    } catch (e) {
      ollamaErr = e.name === 'TimeoutError'
        ? 'Ollama timed out — model may still be loading, try again in a moment'
        : e.message;
    }
  } else {
    ollamaErr = 'Ollama not reachable (is `ollama serve` running?)';
  }
  if (ollamaErr) console.warn('[courses/ai-import] Ollama:', ollamaErr);

  // ── 2. Gemini (cloud fallback — skipped if quota exhausted) ──────────────
  geminiReset();
  if (GEMINI_KEY && !gemini.quotaExceeded && !gemini.keyInvalid) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!r.ok) {
        const body = await r.text();
        if (r.status === 429) {
          // Quota exhausted vs per-minute rate limit
          if (body.includes('quota') || body.includes('RESOURCE_EXHAUSTED')) {
            gemini.quotaExceeded = true;
            geminiErr = 'Gemini daily quota exceeded — resets at midnight ICT';
            console.warn('[courses/ai-import] Gemini quota exceeded — will use Ollama only for remainder of day');
          } else {
            gemini.rateLimited = true;
            geminiErr = 'Gemini rate limited (per-minute) — try again shortly';
            console.warn('[courses/ai-import] Gemini rate limited');
          }
        } else if (r.status === 400 && body.includes('API_KEY')) {
          gemini.keyInvalid = true;
          geminiErr = 'Gemini API key invalid';
          console.warn('[courses/ai-import] Gemini invalid key');
        } else {
          geminiErr = `Gemini HTTP ${r.status}`;
          console.warn('[courses/ai-import] Gemini error:', body.slice(0, 300));
        }
      } else {
        const d = await r.json();
        const data = extractJSON(d.candidates?.[0]?.content?.parts?.[0]?.text || '');
        if (data) return res.json({ source: 'gemini', data });
        geminiErr = 'Gemini returned unparseable response';
        console.warn('[courses/ai-import] Gemini unparseable');
      }
    } catch (e) {
      geminiErr = e.message;
      console.warn('[courses/ai-import] Gemini fetch error:', e.message);
    }
  } else if (gemini.quotaExceeded) {
    geminiErr = 'Gemini daily quota already exceeded';
    console.warn('[courses/ai-import] Skipping Gemini — quota exhausted, using Ollama only');
  }

  // ── 3. Both failed — build a helpful error message ────────────────────────
  const isQuota     = gemini.quotaExceeded;
  const noGeminiKey = !GEMINI_KEY;
  const ollamaTimedOut = ollamaReachable && ollamaErr?.includes('timed out');

  let errorMsg;
  if (ollamaTimedOut) {
    errorMsg = `Ollama is running but took too long to respond — the model may still be loading into memory. Wait a few seconds and retry.`;
  } else if (isQuota && !ollamaReachable) {
    errorMsg = `Gemini quota exceeded and Ollama is not reachable. Run: ollama serve`;
  } else if (isQuota && ollamaErr) {
    errorMsg = `Gemini quota exceeded. Ollama responded but failed: ${ollamaErr}. Check the ${OLLAMA_MODEL} model is loaded (run: ollama pull ${OLLAMA_MODEL}).`;
  } else if (noGeminiKey) {
    errorMsg = `No AI backend available — start Ollama (ollama serve) or add GEMINI_API_KEY to .env.`;
  } else {
    errorMsg = [
      ollamaErr && `Ollama: ${ollamaErr}`,
      geminiErr && `Gemini: ${geminiErr}`,
    ].filter(Boolean).join(' · ') || 'Both AI backends failed — check server logs.';
  }

  res.status(503).json({ error: errorMsg, geminiQuotaExceeded: isQuota, ollamaTimedOut });
});

// DELETE /:id — remove a course from DB
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST / — add new course to DB
router.post('/', async (req, res) => {
  const { name, phase = 0, total = 5, sort_order, url = null, plan_id = 1 } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = `c${Date.now()}`;
  let order = sort_order;
  if (order === undefined) {
    const { rows } = await db.query('SELECT COALESCE(MAX(sort_order),0)+1 AS next FROM courses WHERE plan_id=$1', [plan_id]);
    order = rows[0].next;
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO courses (id, name, phase, total, done, next, next_iso, sort_order, url, plan_id)
       VALUES ($1, $2, $3, $4, 0, 'TBD', NULL, $5, $6, $7) RETURNING *`,
      [id, name, phase, total, order, url, plan_id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
