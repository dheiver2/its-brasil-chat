// Copia o worker do pdf.js de node_modules para /public, mantendo a versão do
// worker idêntica à do pacote pdfjs-dist instalado (evita drift de versão).
// Roda no postinstall. Cross-platform (Node puro — funciona em Windows/Linux/macOS).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const dest = join(root, "public", "pdf.worker.min.mjs");

try {
  if (existsSync(src)) {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(src, dest);
    console.log(`[sync-pdf-worker] ${src} -> ${dest}`);
  } else {
    console.warn(`[sync-pdf-worker] aviso: ${src} não encontrado (pdfjs-dist instalado?).`);
  }
} catch (e) {
  console.warn(`[sync-pdf-worker] aviso: ${e.message}`);
}
