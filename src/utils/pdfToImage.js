/**
 * Renders the first page of a PDF file to a JPEG data URL.
 * Used before sending PDFs to Ollama (which only handles images).
 * Gemini can handle PDF inline_data directly, but JPEG works for both.
 */
export async function pdfFirstPageToJpeg(file) {
  const pdfjsLib = await import('pdfjs-dist');

  // Point to the bundled worker — Vite resolves the ?url import
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const pdf  = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2 }); // scale 2 = good legibility
  const canvas   = document.createElement('canvas');
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;

  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  return canvas.toDataURL('image/jpeg', 0.88);
}
