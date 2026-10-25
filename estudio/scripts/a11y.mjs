/**
 * Auditoria de acessibilidade (axe, WCAG 2.1 A/AA), rolagem horizontal em
 * 360px e erros de console em todas as telas, nos temas claro e escuro, como
 * Dono e como Leitor. Precisa do app rodando com ESTUDIO_PREVIEW=1
 * (a rota /dev-preview monta cada tela com dados de exemplo, sem login).
 *
 *   ESTUDIO_PREVIEW=1 npm run build && ESTUDIO_PREVIEW=1 npm start   (num terminal)
 *   npm run test:a11y                                                  (noutro)
 */
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const BASE = process.env.ESTUDIO_URL ?? "http://localhost:3000";
const TELAS = ["inicio", "sugestoes", "calendario", "calendario-dia", "calendario&abrir=c1", "calendario&abrir=gerar-mes", "tarefas", "tarefas&abrir=t1", "painel", "painel&abrir=registrar", "marca", "empresa-nova"];
const LARGURAS = [360, 1280];

const browser = await chromium.launch();
const falhas = [];
let total = 0;
for (const tema of ["claro", "escuro"]) {
  for (const papel of ["dono", "leitor"]) {
    for (const tela of TELAS) {
      if (papel === "leitor" && tela.includes("abrir=")) continue;
      for (const largura of LARGURAS) {
        if (tema === "escuro" && largura === 360) continue;
        total++;
        const ctx = await browser.newContext({ viewport: { width: largura, height: 800 } });
        const page = await ctx.newPage();
        const erros = [];
        page.on("console", (m) => m.type() === "error" && erros.push(m.text().slice(0, 160)));
        page.on("pageerror", (e) => erros.push("pageerror " + e.message.slice(0, 160)));
        await page.goto(`${BASE}/dev-preview?tela=${tela}&papel=${papel}`, { waitUntil: "networkidle" });
        if (tema === "escuro") await page.evaluate(() => document.documentElement.setAttribute("data-tema", "escuro"));
        await page.waitForTimeout(300);
        const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        const viol = r.violations.map((v) => `${v.id} (${v.impact}) x${v.nodes.length}: ${v.nodes[0].target[0]}`);
        const problemas = [...viol, ...erros, ...(scrollW > largura ? [`rolagem horizontal: ${scrollW}px > ${largura}px`] : [])];
        if (problemas.length) falhas.push(`${tema} · ${papel} · ${tela} @${largura}\n  ${problemas.join("\n  ")}`);
        await ctx.close();
      }
    }
  }
}
await browser.close();
if (falhas.length) {
  console.error(`\n${falhas.length} de ${total} combinações com problemas:\n\n${falhas.join("\n\n")}`);
  process.exit(1);
}
console.log(`Acessibilidade OK: ${total} combinações (telas × papéis × larguras × temas) sem violações, sem erros de console e sem rolagem horizontal.`);
