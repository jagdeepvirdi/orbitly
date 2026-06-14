export function parseRecipeText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;

  let title = lines[0].replace(/^recipe[:\s]+/i, '').trim() || 'Untitled Recipe';
  let ingredients = [];
  let steps = [];
  let servings = '';

  const ingIdx  = lines.findIndex(l => /^ingredients?[:\s]*$/i.test(l));
  const stepIdx = lines.findIndex(l => /^(instructions?|directions?|method|steps?|preparation)[:\s]*$/i.test(l));
  const servIdx = lines.findIndex(l => /^(serves?|servings?)[:\s]/i.test(l));

  if (servIdx !== -1)
    servings = lines[servIdx].replace(/^(serves?|servings?)[:\s]+/i, '').trim();

  if (ingIdx !== -1) {
    const end = (stepIdx > ingIdx) ? stepIdx : lines.length;
    ingredients = lines.slice(ingIdx + 1, end)
      .map(l => l.replace(/^[-•*✓✗\d.]+\s*/, '').trim())
      .filter(l => l && !/^(ingredients?|instructions?|steps?|method)$/i.test(l));
  }

  if (stepIdx !== -1) {
    steps = lines.slice(stepIdx + 1)
      .map((l, i) => ({ n: i + 1, text: l.replace(/^\d+[.)]\s*/, '').trim() }))
      .filter(s => s.text && !/^(ingredients?|instructions?|steps?)$/i.test(s.text));
  }

  if (!ingredients.length && !steps.length && lines.length > 1) {
    const bullets   = lines.slice(1).filter(l => /^[-•*]/.test(l));
    const numbered  = lines.slice(1).filter(l => /^\d+[.)]\s/.test(l));
    ingredients = bullets.map(l => l.replace(/^[-•*]\s*/, ''));
    steps = numbered.map((l, i) => ({ n: i + 1, text: l.replace(/^\d+[.)]\s*/, '') }));
  }

  return { title, ingredients, steps, servings };
}

export async function extractTextFromPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
  ).href;
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let p = 1; p <= pdf.numPages; p++) {
    const page    = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map(i => i.str).join(' ') + '\n';
  }
  return text.trim();
}
