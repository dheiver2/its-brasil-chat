import type { Metadata } from "next";
import "highlight.js/styles/github-dark.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ítala — ITS Brasil",
  description: "Ítala, a assistente virtual inteligente da ITS Brasil — internet de fibra, links dedicados e conectividade corporativa.",
  icons: { icon: "/logo-its.png" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, title: "Ítala", statusBarStyle: "default" },
};

// HTML sempre dinâmico → não é cacheado como estático (sem s-maxage de 1 ano).
// Combinado com o Cache-Control "no-cache" do next.config, garante que cada
// deploy seja servido fresco, puxando os assets hasheados novos. Os assets em
// /_next/static seguem imutáveis (cache longo, seguro). Resolve o cache em todo
// deploy sem hard reload manual.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{})})}`
        }} />
      </body>
    </html>
  );
}
