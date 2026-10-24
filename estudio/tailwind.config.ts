import type { Config } from "tailwindcss";

/**
 * Todas as cores vêm de tokens CSS (variáveis em globals.css).
 * As cores de destaque (--cor-primaria / --cor-secundaria) são
 * sobrescritas pela empresa ativa.
 */
const config: Config = {
  darkMode: ["class", '[data-tema="escuro"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fundo: "rgb(var(--fundo) / <alpha-value>)",
        superficie: "rgb(var(--superficie) / <alpha-value>)",
        "superficie-2": "rgb(var(--superficie-2) / <alpha-value>)",
        borda: "rgb(var(--borda) / <alpha-value>)",
        texto: "rgb(var(--texto) / <alpha-value>)",
        "texto-2": "rgb(var(--texto-2) / <alpha-value>)",
        "texto-3": "rgb(var(--texto-3) / <alpha-value>)",
        primaria: "rgb(var(--cor-primaria) / <alpha-value>)",
        secundaria: "rgb(var(--cor-secundaria) / <alpha-value>)",
        "sobre-primaria": "rgb(var(--sobre-primaria) / <alpha-value>)",
        ia: "rgb(var(--ia) / <alpha-value>)",
        real: "rgb(var(--real) / <alpha-value>)",
        manual: "rgb(var(--manual) / <alpha-value>)",
        atrasado: "rgb(var(--atrasado) / <alpha-value>)",
      },
      fontFamily: {
        titulo: ["var(--fonte-titulo)", "Georgia", "serif"],
        texto: ["var(--fonte-texto)", "system-ui", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      screens: { xs: "360px" },
    },
  },
  plugins: [],
};

export default config;
