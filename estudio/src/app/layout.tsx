import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";

const fonteTexto = Figtree({ subsets: ["latin"], variable: "--fonte-texto", display: "swap" });
const fonteTitulo = Fraunces({
  subsets: ["latin"],
  variable: "--fonte-titulo",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  title: { default: "Estúdio", template: "%s · Estúdio" },
  description: "Planejamento de Instagram, tarefas da equipe e resultados para várias empresas.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#141211" },
  ],
};

/* Aplica o tema antes da primeira pintura para não piscar. */
const scriptTema = `
(function(){try{var t=localStorage.getItem('estudio:tema')||'sistema';
if(t==='sistema'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'escuro':'claro'}
document.documentElement.setAttribute('data-tema',t)}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${fonteTexto.variable} ${fonteTitulo.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
