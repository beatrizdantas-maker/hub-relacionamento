/**
 * Desenho das peças em canvas (navegador). Tudo é gerado a partir do texto
 * estruturado e da identidade da marca: cores, logo, fontes e @perfil.
 * Tamanhos do Instagram: feed 1080×1350 (4:5), stories e Reels 1080×1920.
 */
import { contraste, hexParaRgb } from "@/lib/cores";
import type { CenaVideo, SlidePeca, TelaStory } from "@/lib/tipos/database";

export const FEED = { w: 1080, h: 1350 };
export const VERTICAL = { w: 1080, h: 1920 };

export interface Marca {
  nome: string;
  perfil: string | null;
  primaria: string;   // #RRGGBB
  secundaria: string; // #RRGGBB
  logo: CanvasImageSource | null;
  fonteTitulo: string; // família CSS
  fonteTexto: string;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const CLARO = "#FAF9F6";
const ESCURO = "#1C1917";

/** Texto escuro ou claro sobre a cor, pelo maior contraste. */
export function corSobreHex(hex: string): string {
  const rgb = hexParaRgb(hex) ?? [124, 58, 237];
  return contraste(rgb, [28, 25, 23]) > contraste(rgb, [255, 255, 255]) ? ESCURO : "#FFFFFF";
}

function comAlfa(hex: string, a: number): string {
  const [r, g, b] = hexParaRgb(hex) ?? [0, 0, 0];
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function escurecer(hex: string, f: number): string {
  const [r, g, b] = hexParaRgb(hex) ?? [0, 0, 0];
  return `rgb(${Math.round(r * (1 - f))}, ${Math.round(g * (1 - f))}, ${Math.round(b * (1 - f))})`;
}

const fonte = (peso: number, tam: number, familia: string) => `${peso} ${Math.round(tam)}px ${familia}`;

/** Quebra o texto em linhas que cabem na largura (respeita quebras de linha). */
export function quebrarLinhas(ctx: Ctx, texto: string, larguraMax: number): string[] {
  const linhas: string[] = [];
  for (const paragrafo of texto.split(/\n+/)) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    let atual = "";
    for (const palavra of palavras) {
      const tentativa = atual ? `${atual} ${palavra}` : palavra;
      if (ctx.measureText(tentativa).width <= larguraMax) { atual = tentativa; continue; }
      if (atual) linhas.push(atual);
      if (ctx.measureText(palavra).width <= larguraMax) { atual = palavra; continue; }
      // Palavra maior que a linha: quebra por letras.
      let pedaco = "";
      for (const letra of palavra) {
        if (ctx.measureText(pedaco + letra).width > larguraMax && pedaco) { linhas.push(pedaco); pedaco = letra; } else pedaco += letra;
      }
      atual = pedaco;
    }
    if (atual) linhas.push(atual);
  }
  return linhas;
}

/** Acha o maior tamanho de fonte (entre max e min) em que o texto cabe na caixa. */
export function caber(ctx: Ctx, texto: string, o: { familia: string; peso: number; max: number; min: number; largura: number; altura: number; entrelinha?: number }) {
  const entre = o.entrelinha ?? 1.15;
  let tam = o.max;
  let linhas: string[] = [];
  for (; tam >= o.min; tam -= 2) {
    ctx.font = fonte(o.peso, tam, o.familia);
    linhas = quebrarLinhas(ctx, texto, o.largura);
    if (linhas.length * tam * entre <= o.altura) break;
  }
  if (tam < o.min) {
    tam = o.min;
    ctx.font = fonte(o.peso, tam, o.familia);
    linhas = quebrarLinhas(ctx, texto, o.largura);
    const maxLinhas = Math.max(1, Math.floor(o.altura / (tam * entre)));
    if (linhas.length > maxLinhas) { linhas = linhas.slice(0, maxLinhas); linhas[maxLinhas - 1] = linhas[maxLinhas - 1].replace(/\s*\S*$/, "") + "…"; }
  }
  return { tam, linhas, altura: linhas.length * tam * entre, entre };
}

function escrever(ctx: Ctx, linhas: string[], x: number, y: number, tam: number, entre: number, alinhar: CanvasTextAlign = "left") {
  ctx.textAlign = alinhar;
  ctx.textBaseline = "top";
  linhas.forEach((l, i) => ctx.fillText(l, x, y + i * tam * entre));
}

function retanguloArredondado(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Selo com fundo na cor secundária. Devolve a altura usada. */
function selo(ctx: Ctx, texto: string, x: number, y: number, larguraMax: number, m: Marca, tam = 40, alinhar: "left" | "center" = "left"): number {
  const r = caber(ctx, texto, { familia: m.fonteTexto, peso: 700, max: tam, min: 26, largura: larguraMax - 56, altura: tam * 1.2 * 3 });
  ctx.font = fonte(700, r.tam, m.fonteTexto);
  const largura = Math.min(larguraMax, Math.max(...r.linhas.map((l) => ctx.measureText(l).width)) + 56);
  const altura = r.altura + 36;
  const x0 = alinhar === "center" ? x - largura / 2 : x;
  ctx.fillStyle = m.secundaria;
  retanguloArredondado(ctx, x0, y, largura, altura, Math.min(36, altura / 2));
  ctx.fill();
  ctx.fillStyle = corSobreHex(m.secundaria);
  escrever(ctx, r.linhas, alinhar === "center" ? x : x0 + 28, y + 18, r.tam, r.entre, alinhar);
  return altura;
}

/** Logo (ou inicial) + @perfil no rodapé. */
function assinatura(ctx: Ctx, m: Marca, x: number, y: number, cor: string, tamanho = 72) {
  if (m.logo) {
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    retanguloArredondado(ctx, x, y, tamanho, tamanho, 16);
    ctx.fill();
    ctx.clip();
    const img = m.logo as HTMLImageElement;
    const iw = img.naturalWidth || img.width || tamanho, ih = img.naturalHeight || img.height || tamanho;
    const esc = Math.min((tamanho - 12) / iw, (tamanho - 12) / ih);
    ctx.drawImage(m.logo, x + (tamanho - iw * esc) / 2, y + (tamanho - ih * esc) / 2, iw * esc, ih * esc);
    ctx.restore();
  } else {
    ctx.fillStyle = m.secundaria;
    retanguloArredondado(ctx, x, y, tamanho, tamanho, 16);
    ctx.fill();
    ctx.fillStyle = corSobreHex(m.secundaria);
    ctx.font = fonte(700, tamanho * 0.5, m.fonteTitulo);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(m.nome.trim().charAt(0).toUpperCase(), x + tamanho / 2, y + tamanho / 2 + 2);
  }
  ctx.fillStyle = cor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = fonte(700, 32, m.fonteTexto);
  ctx.fillText(m.nome, x + tamanho + 20, y + tamanho / 2 - (m.perfil ? 18 : 0));
  if (m.perfil) {
    ctx.font = fonte(500, 28, m.fonteTexto);
    ctx.globalAlpha = 0.8;
    ctx.fillText(`@${m.perfil}`, x + tamanho + 20, y + tamanho / 2 + 20);
    ctx.globalAlpha = 1;
  }
}

function fundoMarca(ctx: Ctx, w: number, h: number, m: Marca, deslocamento = 0) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, m.primaria);
  g.addColorStop(1, escurecer(m.primaria, 0.28));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = comAlfa(m.secundaria, 0.22);
  ctx.beginPath();
  ctx.arc(w * 0.92 + Math.sin(deslocamento) * 40, h * 0.08 + Math.cos(deslocamento) * 30, w * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = comAlfa("#FFFFFF", 0.06);
  ctx.beginPath();
  ctx.arc(w * 0.05 - Math.cos(deslocamento) * 30, h * 0.95, w * 0.3, 0, Math.PI * 2);
  ctx.fill();
}

// ---------- Carrossel ----------

export function desenharSlide(ctx: Ctx, s: SlidePeca, indice: number, total: number, m: Marca) {
  const { w, h } = FEED;
  const margem = 96;
  const largura = w - margem * 2;
  ctx.clearRect(0, 0, w, h);

  if (s.papel === "capa" || s.papel === "fechamento") {
    fundoMarca(ctx, w, h, m, indice);
    const cor = corSobreHex(m.primaria);
    ctx.fillStyle = cor;
    ctx.globalAlpha = 0.85;
    ctx.font = fonte(700, 30, m.fonteTexto);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(s.papel === "capa" ? m.nome.toUpperCase() : "PARA LEVAR", margem, margem);
    ctx.globalAlpha = 1;

    const topo = 190, base = h - margem - 72 - 60;
    const t = caber(ctx, s.titulo, { familia: m.fonteTitulo, peso: 700, max: s.papel === "capa" ? 116 : 92, min: 52, largura, altura: 560, entrelinha: 1.08 });
    const tx = s.texto ? caber(ctx, s.texto, { familia: m.fonteTexto, peso: 500, max: 44, min: 30, largura, altura: base - topo - t.altura - 200, entrelinha: 1.3 }) : null;
    const altDestaque = s.destaque ? 110 : 0;
    const bloco = t.altura + (tx ? 40 + tx.altura : 0) + (s.destaque ? 48 + altDestaque : 0);
    let y = Math.max(topo, topo + (base - topo - bloco) / 2);
    ctx.fillStyle = cor;
    ctx.font = fonte(700, t.tam, m.fonteTitulo);
    escrever(ctx, t.linhas, margem, y, t.tam, t.entre);
    y += t.altura + 40;
    if (tx) {
      ctx.font = fonte(500, tx.tam, m.fonteTexto);
      ctx.globalAlpha = 0.92;
      escrever(ctx, tx.linhas, margem, y, tx.tam, tx.entre);
      ctx.globalAlpha = 1;
      y += tx.altura + 48;
    }
    if (s.destaque) selo(ctx, s.destaque, margem, Math.min(y, base - altDestaque), largura, m, 40);
    assinatura(ctx, m, margem, h - margem - 72, cor);
    if (s.papel === "capa" && total > 1) {
      ctx.fillStyle = cor;
      ctx.font = fonte(700, 32, m.fonteTexto);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText("Arraste  →", w - margem, h - margem - 36);
    }
    return;
  }

  // Slide de conteúdo: fundo claro
  ctx.fillStyle = CLARO;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = m.primaria;
  ctx.fillRect(0, 0, w, 18);
  // número do slide
  ctx.fillStyle = m.primaria;
  retanguloArredondado(ctx, margem, margem, 120, 64, 32);
  ctx.fill();
  ctx.fillStyle = corSobreHex(m.primaria);
  ctx.font = fonte(700, 30, m.fonteTexto);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${String(indice + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`, margem + 60, margem + 33);

  const topo = margem + 110, base = h - margem - 60;
  const t = caber(ctx, s.titulo, { familia: m.fonteTitulo, peso: 700, max: 84, min: 46, largura, altura: 360, entrelinha: 1.1 });
  const d = s.destaque ? caber(ctx, s.destaque, { familia: m.fonteTexto, peso: 700, max: 40, min: 28, largura: largura - 70, altura: 130, entrelinha: 1.25 }) : null;
  const altDestaque = d ? d.altura + 48 : 0;
  const tx = s.texto ? caber(ctx, s.texto, { familia: m.fonteTexto, peso: 500, max: 50, min: 30, largura, altura: base - topo - t.altura - 40 - (d ? altDestaque + 44 : 0), entrelinha: 1.38 }) : null;
  const bloco = t.altura + (tx ? 40 + tx.altura : 0) + (d ? 44 + altDestaque : 0);
  let y = Math.max(topo, topo + (base - topo - bloco) / 2);
  ctx.fillStyle = escurecer(m.primaria, 0.15);
  ctx.font = fonte(700, t.tam, m.fonteTitulo);
  escrever(ctx, t.linhas, margem, y, t.tam, t.entre);
  y += t.altura + 40;

  if (tx) {
    ctx.fillStyle = ESCURO;
    ctx.font = fonte(500, tx.tam, m.fonteTexto);
    escrever(ctx, tx.linhas, margem, y, tx.tam, tx.entre);
    y += tx.altura + 44;
  }
  if (d) {
    const alt = altDestaque;
    ctx.fillStyle = comAlfa(m.secundaria, 0.18);
    retanguloArredondado(ctx, margem, y, largura, alt, 20);
    ctx.fill();
    ctx.fillStyle = m.secundaria;
    ctx.fillRect(margem, y, 12, alt);
    ctx.fillStyle = ESCURO;
    ctx.font = fonte(700, d.tam, m.fonteTexto);
    escrever(ctx, d.linhas, margem + 40, y + 24, d.tam, d.entre);
  }
  // rodapé: pontos de progresso + @perfil
  const yRodape = h - margem + 10;
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = i === indice ? m.primaria : comAlfa(ESCURO, 0.18);
    ctx.beginPath();
    ctx.arc(margem + 10 + i * 30, yRodape, i === indice ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = comAlfa(ESCURO, 0.7);
  ctx.font = fonte(600, 28, m.fonteTexto);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(m.perfil ? `@${m.perfil}` : m.nome, w - margem, yRodape);
}

// ---------- Post estático ----------

export function desenharEstatico(ctx: Ctx, p: { titulo: string; texto: string; destaque: string | null; rodape: string | null }, m: Marca) {
  const { w, h } = FEED;
  const margem = 100;
  const largura = w - margem * 2;
  fundoMarca(ctx, w, h, m, 1);
  const cor = corSobreHex(m.primaria);
  let y = 210;
  if (p.destaque) y += selo(ctx, p.destaque, margem, margem, largura, m, 38) - 20;
  const t = caber(ctx, p.titulo, { familia: m.fonteTitulo, peso: 700, max: 120, min: 56, largura, altura: 640, entrelinha: 1.06 });
  ctx.fillStyle = cor;
  ctx.font = fonte(700, t.tam, m.fonteTitulo);
  escrever(ctx, t.linhas, margem, y + 40, t.tam, t.entre);
  y += 40 + t.altura + 44;
  if (p.texto) {
    const tx = caber(ctx, p.texto, { familia: m.fonteTexto, peso: 500, max: 46, min: 30, largura, altura: h - y - 300, entrelinha: 1.3 });
    ctx.font = fonte(500, tx.tam, m.fonteTexto);
    ctx.globalAlpha = 0.92;
    escrever(ctx, tx.linhas, margem, y, tx.tam, tx.entre);
    ctx.globalAlpha = 1;
  }
  assinatura(ctx, m, margem, h - margem - 72, cor);
  if (p.rodape) {
    ctx.font = fonte(700, 34, m.fonteTexto);
    ctx.fillStyle = cor;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const r = caber(ctx, p.rodape, { familia: m.fonteTexto, peso: 700, max: 34, min: 24, largura: 460, altura: 90, entrelinha: 1.2 });
    ctx.font = fonte(700, r.tam, m.fonteTexto);
    r.linhas.forEach((l, i) => ctx.fillText(l, w - margem, h - margem - 36 - (r.linhas.length - 1 - i) * r.tam * 1.2));
  }
}

// ---------- Stories ----------

export function desenharTelaStory(ctx: Ctx, tela: TelaStory, indice: number, total: number, m: Marca, temaDoPost?: string | null) {
  const { w, h } = VERTICAL;
  const margem = 96;
  const largura = w - margem * 2;
  fundoMarca(ctx, w, h, m, indice * 0.8);
  const cor = corSobreHex(m.primaria);
  // barras de progresso dos stories
  for (let i = 0; i < total; i++) {
    ctx.fillStyle = comAlfa(cor === "#FFFFFF" ? "#FFFFFF" : ESCURO, i <= indice ? 0.9 : 0.3);
    const larg = (w - 64 - (total - 1) * 10) / total;
    retanguloArredondado(ctx, 32 + i * (larg + 10), 40, larg, 8, 4);
    ctx.fill();
  }
  assinatura(ctx, m, 48, 80, cor, 64);

  let y = 520;
  if (tela.texto) {
    const t = caber(ctx, tela.texto, { familia: m.fonteTitulo, peso: 700, max: 84, min: 44, largura, altura: 520, entrelinha: 1.12 });
    ctx.fillStyle = cor;
    ctx.font = fonte(700, t.tam, m.fonteTitulo);
    escrever(ctx, t.linhas, w / 2, y, t.tam, t.entre, "center");
    y += t.altura + 60;
  }

  if (tela.tipo === "Compartilhar post") {
    const cw = 640, ch = 800, x = (w - cw) / 2;
    ctx.fillStyle = "#FFFFFF";
    retanguloArredondado(ctx, x, y, cw, ch, 32);
    ctx.fill();
    ctx.fillStyle = m.primaria;
    retanguloArredondado(ctx, x + 32, y + 32, cw - 64, ch - 200, 20);
    ctx.fill();
    ctx.fillStyle = corSobreHex(m.primaria);
    const tt = caber(ctx, temaDoPost || "Post de hoje", { familia: m.fonteTitulo, peso: 700, max: 56, min: 32, largura: cw - 140, altura: ch - 300, entrelinha: 1.1 });
    ctx.font = fonte(700, tt.tam, m.fonteTitulo);
    escrever(ctx, tt.linhas, w / 2, y + 80, tt.tam, tt.entre, "center");
    ctx.fillStyle = ESCURO;
    ctx.font = fonte(600, 30, m.fonteTexto);
    ctx.textAlign = "center";
    ctx.fillText("Toque para ver o post", w / 2, y + ch - 110);
    return;
  }

  const i = tela.interacao;
  if (i && (i.pergunta || i.opcoes?.length)) {
    const opcoes = i.opcoes?.filter(Boolean) ?? [];
    const pw = 760, x = (w - pw) / 2;
    const p = caber(ctx, i.pergunta || tela.tipo, { familia: m.fonteTexto, peso: 700, max: 46, min: 30, largura: pw - 80, altura: 180, entrelinha: 1.2 });
    const alt = 60 + p.altura + (opcoes.length ? 30 + opcoes.length * 104 : tela.tipo === "Caixa de pergunta" ? 140 : tela.tipo.startsWith("Slider") ? 120 : 0) + 30;
    ctx.fillStyle = "#FFFFFF";
    retanguloArredondado(ctx, x, y, pw, alt, 36);
    ctx.fill();
    ctx.fillStyle = ESCURO;
    ctx.font = fonte(700, p.tam, m.fonteTexto);
    escrever(ctx, p.linhas, w / 2, y + 40, p.tam, p.entre, "center");
    let yy = y + 40 + p.altura + 30;
    if (opcoes.length) {
      opcoes.forEach((o) => {
        ctx.fillStyle = comAlfa(m.primaria, 0.12);
        retanguloArredondado(ctx, x + 40, yy, pw - 80, 84, 24);
        ctx.fill();
        ctx.fillStyle = escurecer(m.primaria, 0.2);
        ctx.font = fonte(700, 36, m.fonteTexto);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(o.slice(0, 40), w / 2, yy + 44);
        yy += 104;
      });
    } else if (tela.tipo === "Caixa de pergunta") {
      ctx.fillStyle = comAlfa(ESCURO, 0.08);
      retanguloArredondado(ctx, x + 40, yy, pw - 80, 100, 24);
      ctx.fill();
      ctx.fillStyle = comAlfa(ESCURO, 0.5);
      ctx.font = fonte(500, 32, m.fonteTexto);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Escreva aqui…", w / 2, yy + 50);
    } else if (tela.tipo.startsWith("Slider")) {
      ctx.fillStyle = comAlfa(ESCURO, 0.12);
      retanguloArredondado(ctx, x + 60, yy + 40, pw - 120, 16, 8);
      ctx.fill();
      ctx.font = fonte(400, 64, m.fonteTexto);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.emoji || "😍", x + pw / 2, yy + 46);
    }
  }
}

// ---------- Vídeo (Reels de texto) ----------

const suave = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/**
 * Desenha um quadro do vídeo. `tCena` = segundos desde o início da cena;
 * `tTotal`/`duracao` controlam a barra de progresso.
 */
export function desenharQuadroVideo(ctx: Ctx, cena: CenaVideo, indice: number, total: number, tCena: number, tTotal: number, duracao: number, m: Marca) {
  const { w, h } = VERTICAL;
  const margem = 90;
  const largura = w - margem * 2;
  fundoMarca(ctx, w, h, m, tTotal * 0.6);
  const cor = corSobreHex(m.primaria);

  // barra de progresso
  ctx.fillStyle = comAlfa(cor === "#FFFFFF" ? "#FFFFFF" : ESCURO, 0.25);
  retanguloArredondado(ctx, 48, 56, w - 96, 10, 5);
  ctx.fill();
  ctx.fillStyle = cor;
  retanguloArredondado(ctx, 48, 56, Math.max(10, (w - 96) * Math.min(1, tTotal / duracao)), 10, 5);
  ctx.fill();

  // entrada e saída do texto
  // A primeira cena já começa visível: o Instagram costuma usar o primeiro quadro como capa.
  const entrada = indice === 0 ? 1 : suave(tCena / 0.45);
  const ultima = indice === total - 1;
  const saida = ultima ? 1 : 1 - suave((tCena - (cena.segundos - 0.3)) / 0.3);
  ctx.globalAlpha = Math.max(0, Math.min(entrada, saida));
  const deslocY = (1 - entrada) * 60;

  const t = caber(ctx, cena.texto, { familia: m.fonteTitulo, peso: 700, max: 104, min: 54, largura, altura: 900, entrelinha: 1.14 });
  ctx.font = fonte(700, t.tam, m.fonteTitulo);
  const yInicio = (h - t.altura) / 2 - 40 + deslocY;
  const destaque = new Set((cena.destaque ?? "").toLowerCase().split(/\s+/).map((p) => p.replace(/[^\p{L}\p{N}]/gu, "")).filter(Boolean));
  const espaco = ctx.measureText(" ").width;
  t.linhas.forEach((linha, li) => {
    const palavras = linha.split(" ");
    const larguras = palavras.map((p) => ctx.measureText(p).width);
    const total = larguras.reduce((a, b) => a + b, 0) + espaco * (palavras.length - 1);
    const y = yInicio + li * t.tam * t.entre;
    const xs: number[] = [];
    let x = (w - total) / 2;
    palavras.forEach((_, pi) => { xs.push(x); x += larguras[pi] + espaco; });
    const marcada = palavras.map((p) => destaque.has(p.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")));
    // Uma caixa por sequência de palavras destacadas.
    for (let pi = 0; pi < palavras.length; pi++) {
      if (!marcada[pi]) continue;
      let fim = pi;
      while (fim + 1 < palavras.length && marcada[fim + 1]) fim++;
      ctx.fillStyle = m.secundaria;
      retanguloArredondado(ctx, xs[pi] - 14, y - t.tam * 0.06, xs[fim] + larguras[fim] - xs[pi] + 28, t.tam * 1.12, 14);
      ctx.fill();
      pi = fim;
    }
    palavras.forEach((p, pi) => {
      ctx.fillStyle = marcada[pi] ? corSobreHex(m.secundaria) : cor;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText(p, xs[pi], y);
    });
  });
  ctx.globalAlpha = 1;
  assinatura(ctx, m, margem, h - 260, cor, 80);
}
