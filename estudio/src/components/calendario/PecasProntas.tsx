"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clapperboard, Copy, Download, Film, Pencil, ScrollText, Sparkles, XCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { salvarPecas } from "@/app/(app)/calendario/acoes";
import { ROTULO_MODO, duracaoVideo, modoPadrao, modosPossiveis, type ModoPeca } from "@/lib/pecas/esquemas";
import { baixar, baixarZip, gerarVideo, imagensDaPeca, nomeBase, prepararMarca, previasDoVideo, type DadosMarca, type Imagem } from "@/lib/pecas/exportar";
import type { Conteudo, Pecas } from "@/lib/tipos/database";
import type { Marca } from "@/lib/pecas/desenho";
import { Teleprompter } from "./Teleprompter";

/**
 * Peças prontas do conteúdo: a IA escreve, o sistema desenha. Carrossel e
 * estático viram PNG; Reels de texto vira MP4; Reels com pessoa vira roteiro
 * falado com teleprompter.
 */
export function PecasProntas({ empresaId, conteudo, marca, podeEditar }: { empresaId: string; conteudo: Conteudo; marca: DadosMarca; podeEditar: boolean }) {
  const router = useRouter();
  const [pecas, setPecas] = useState<Pecas | null>(conteudo.pecas ?? null);
  const [modo, setModo] = useState<ModoPeca>(conteudo.pecas?.tipo ?? modoPadrao(conteudo.formato, conteudo.tipo));
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<{ texto: string; detalhes: string[] } | null>(null);
  const [marcaPronta, setMarcaPronta] = useState<Marca | null>(null);
  const [imagens, setImagens] = useState<Imagem[]>([]);
  const [previasVideo, setPreviasVideo] = useState<string[]>([]);
  const [video, setVideo] = useState<{ url: string; blob: Blob } | null>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [teleprompter, setTeleprompter] = useState(false);
  const [editando, setEditando] = useState(false);
  const [salvando, iniciarSalvar] = useTransition();
  const controlador = useRef<AbortController | null>(null);
  const base = useMemo(() => nomeBase(conteudo.data, conteudo.tema), [conteudo.data, conteudo.tema]);
  const modos = modosPossiveis(conteudo.formato);

  useEffect(() => () => controlador.current?.abort(), []);
  useEffect(() => () => { if (video) URL.revokeObjectURL(video.url); }, [video]);

  useEffect(() => {
    let vivo = true;
    prepararMarca(marca).then((m) => vivo && setMarcaPronta(m));
    return () => { vivo = false; };
  }, [marca]);

  // Redesenha as prévias quando a peça muda.
  useEffect(() => {
    if (!marcaPronta || !pecas) { setImagens([]); setPreviasVideo([]); return; }
    let vivo = true;
    if (pecas.tipo === "carrossel" || pecas.tipo === "estatico") imagensDaPeca(pecas, marcaPronta, base).then((i) => vivo && setImagens(i)).catch((e) => vivo && setErro({ texto: (e as Error).message, detalhes: [] }));
    else setImagens([]);
    setPreviasVideo(pecas.tipo === "video" ? previasDoVideo(pecas.cenas, marcaPronta) : []);
    setVideo(null);
    return () => { vivo = false; };
  }, [pecas, marcaPronta, base]);

  async function gerar() {
    setErro(null);
    const ac = new AbortController();
    controlador.current = ac;
    setGerando(true);
    try {
      const r = await fetch("/api/ia/peca", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ empresaId, conteudoId: conteudo.id, modo }), signal: ac.signal });
      const corpo = (await r.json().catch(() => ({}))) as { pecas?: Pecas; erro?: string; detalhes?: string[] };
      if (!r.ok || !corpo.pecas) setErro({ texto: corpo.erro ?? `Erro ${r.status} ao gerar.`, detalhes: corpo.detalhes ?? [] });
      else { setPecas(corpo.pecas); setEditando(false); router.refresh(); }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErro({ texto: "Não foi possível falar com o servidor.", detalhes: [] });
    } finally {
      setGerando(false);
      controlador.current = null;
    }
  }

  async function produzirVideo() {
    if (!pecas || pecas.tipo !== "video" || !marcaPronta) return;
    setErro(null);
    const ac = new AbortController();
    controlador.current = ac;
    setProgresso(0);
    try {
      const blob = await gerarVideo(pecas.cenas, marcaPronta, setProgresso, ac.signal);
      setVideo({ url: URL.createObjectURL(blob), blob });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErro({ texto: (e as Error).message || "Não foi possível gerar o vídeo.", detalhes: [] });
    } finally {
      setProgresso(null);
      controlador.current = null;
    }
  }

  const salvarEdicao = useCallback(() => {
    if (!pecas) return;
    setErro(null);
    iniciarSalvar(async () => {
      const r = await salvarPecas(empresaId, conteudo.id, pecas);
      if (!r.ok) return setErro({ texto: r.erro, detalhes: [] });
      setEditando(false);
      router.refresh();
    });
  }, [pecas, empresaId, conteudo.id, router]);

  function copiarRoteiro() {
    if (!pecas || pecas.tipo !== "roteiro_falado") return;
    const texto = pecas.cenas.map((c) => `[${c.inicio_s}s–${c.fim_s}s] ${c.enquadramento}\n${c.fala}${c.texto_na_tela ? `\nTexto na tela: ${c.texto_na_tela}` : ""}`).join("\n\n");
    navigator.clipboard?.writeText(texto).catch(() => undefined);
  }

  return (
    <section className="space-y-3 border-t border-borda pt-3" aria-labelledby="pecas-prontas">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="pecas-prontas" className="flex items-center gap-1.5 text-sm font-semibold"><Clapperboard className="h-4 w-4" aria-hidden /> Peças prontas</h3>
        {pecas && <Selo tom="ia">Sugestão da IA</Selo>}
      </div>

      {modos.length > 1 && podeEditar && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-superficie-2 p-1" role="radiogroup" aria-label="Tipo de peça">
          {modos.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={modo === m} onClick={() => setModo(m)} className={`rounded-lg px-2 py-2 text-xs font-medium ${modo === m ? "bg-superficie text-texto shadow-sm" : "text-texto-2"}`}>
              {m === "video" ? "Vídeo gerado pelo sistema" : "Roteiro para gravar com pessoa"}
            </button>
          ))}
        </div>
      )}

      {podeEditar && !gerando && (
        <Botao type="button" variante={pecas ? "secundaria" : "primaria"} tamanho="sm" onClick={gerar} className="w-full sm:w-auto">
          <Sparkles className="h-4 w-4" aria-hidden /> {pecas && pecas.tipo === modo ? "Refazer com IA" : `Produzir ${modo === "carrossel" ? "carrossel" : modo === "estatico" ? "post" : modo === "video" ? "vídeo" : "roteiro"} com IA`}
        </Botao>
      )}
      {gerando && (
        <div role="status" className="flex items-center justify-between gap-2 rounded-xl border border-ia/40 bg-ia/10 p-3 text-sm">
          <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-ia border-t-transparent" aria-hidden /> Pensando… ({ROTULO_MODO[modo]})</span>
          <Botao variante="secundaria" tamanho="sm" onClick={() => controlador.current?.abort()}><XCircle className="h-4 w-4" aria-hidden /> Cancelar</Botao>
        </div>
      )}
      {erro && (
        <Aviso tipo="erro">
          {erro.texto}
          {erro.detalhes.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs">{erro.detalhes.map((d, i) => <li key={i}>{d}</li>)}</ul>}
        </Aviso>
      )}
      {!pecas && !gerando && (
        <p className="text-xs text-texto-2">
          {conteudo.formato === "Reels"
            ? "Escolha se este Reels será um vídeo de texto gerado aqui (MP4 pronto) ou gravado por alguém da equipe (roteiro com a fala palavra por palavra e teleprompter)."
            : "A IA escreve o texto e o sistema desenha as imagens no tamanho do feed (1080×1350), com as cores e a logo da marca."}
        </p>
      )}

      {pecas && (pecas.tipo === "carrossel" || pecas.tipo === "estatico") && (
        <div className="space-y-2">
          {imagens.length === 0 ? (
            <p className="text-xs text-texto-2">Desenhando…</p>
          ) : (
            <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" aria-label="Imagens geradas">
              {imagens.map((im, i) => (
                <li key={im.nome} className="w-36 shrink-0 snap-start">
                  <button type="button" onClick={() => baixar(im.blob, im.nome)} className="block w-full overflow-hidden rounded-lg border border-borda" aria-label={`Baixar imagem ${i + 1}`}>
                    <img src={im.previa} alt={`Imagem ${i + 1} de ${imagens.length}`} className="block aspect-[4/5] w-full object-cover" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Botao type="button" tamanho="sm" onClick={() => (imagens.length === 1 ? baixar(imagens[0].blob, imagens[0].nome) : baixarZip(imagens, `${base}.zip`))} disabled={!imagens.length}>
              <Download className="h-4 w-4" aria-hidden /> {imagens.length === 1 ? "Baixar imagem (PNG)" : `Baixar ${imagens.length} imagens (ZIP)`}
            </Botao>
            {podeEditar && <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => setEditando((v) => !v)}><Pencil className="h-4 w-4" aria-hidden /> {editando ? "Fechar edição" : "Editar textos"}</Botao>}
          </div>
          {editando && <EdicaoPeca pecas={pecas} onChange={setPecas} onSalvar={salvarEdicao} salvando={salvando} />}
        </div>
      )}

      {pecas?.tipo === "video" && (
        <div className="space-y-2">
          <p className="text-xs text-texto-2 tabular">{pecas.cenas.length} cenas · {Math.round(duracaoVideo(pecas.cenas))} segundos · 1080×1920</p>
          {video ? (
            <video src={video.url} controls playsInline className="mx-auto max-h-[60vh] rounded-xl border border-borda" />
          ) : (
            <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Cenas do vídeo">
              {previasVideo.map((p, i) => (
                <li key={i} className="w-24 shrink-0"><img src={p} alt={`Cena ${i + 1}: ${pecas.cenas[i]?.texto ?? ""}`} className="block aspect-[9/16] w-full rounded-lg border border-borda object-cover" /></li>
              ))}
            </ul>
          )}
          {progresso != null ? (
            <div role="status" className="space-y-1">
              <div className="h-2 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progresso * 100)} aria-label="Gerando vídeo">
                <div className="h-full bg-primaria transition-all" style={{ width: `${progresso * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs text-texto-2">
                <span>Gerando o vídeo no seu navegador… {Math.round(progresso * 100)}%</span>
                <button type="button" className="underline" onClick={() => controlador.current?.abort()}>Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {video ? (
                <Botao type="button" tamanho="sm" onClick={() => baixar(video.blob, `${base}.mp4`)}><Download className="h-4 w-4" aria-hidden /> Baixar vídeo (MP4)</Botao>
              ) : (
                <Botao type="button" tamanho="sm" onClick={produzirVideo} disabled={!marcaPronta}><Film className="h-4 w-4" aria-hidden /> Gerar vídeo MP4</Botao>
              )}
              {podeEditar && <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => setEditando((v) => !v)}><Pencil className="h-4 w-4" aria-hidden /> {editando ? "Fechar edição" : "Editar cenas"}</Botao>}
            </div>
          )}
          <p className="text-xs text-texto-3">O vídeo sai sem áudio: escolha uma música do próprio Instagram ao publicar.</p>
          {editando && <EdicaoPeca pecas={pecas} onChange={setPecas} onSalvar={salvarEdicao} salvando={salvando} />}
        </div>
      )}

      {pecas?.tipo === "roteiro_falado" && (
        <div className="space-y-2">
          <p className="text-xs text-texto-2 tabular">{pecas.cenas.length} cenas · cerca de {pecas.duracao_s} segundos</p>
          <ol className="space-y-2">
            {pecas.cenas.map((c, i) => (
              <li key={i} className="rounded-xl border border-borda p-2.5 text-sm">
                <p className="text-xs font-medium text-texto-2 tabular">{c.inicio_s}s – {c.fim_s}s · {c.enquadramento}</p>
                <p className="mt-1 whitespace-pre-wrap">“{c.fala}”</p>
                {c.texto_na_tela && <p className="mt-1 text-xs text-texto-2">Texto na tela: <strong className="text-texto">{c.texto_na_tela}</strong></p>}
              </li>
            ))}
          </ol>
          {pecas.dicas.length > 0 && (
            <div className="rounded-xl bg-superficie-2 p-2.5 text-xs">
              <p className="font-semibold">Dicas de gravação</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">{pecas.dicas.map((d, i) => <li key={i}>{d}</li>)}</ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Botao type="button" tamanho="sm" onClick={() => setTeleprompter(true)}><ScrollText className="h-4 w-4" aria-hidden /> Abrir teleprompter</Botao>
            <Botao type="button" tamanho="sm" variante="secundaria" onClick={copiarRoteiro}><Copy className="h-4 w-4" aria-hidden /> Copiar roteiro</Botao>
            {podeEditar && <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => setEditando((v) => !v)}><Pencil className="h-4 w-4" aria-hidden /> {editando ? "Fechar edição" : "Editar falas"}</Botao>}
          </div>
          {editando && <EdicaoPeca pecas={pecas} onChange={setPecas} onSalvar={salvarEdicao} salvando={salvando} />}
          {teleprompter && <Teleprompter cenas={pecas.cenas} onFechar={() => setTeleprompter(false)} />}
        </div>
      )}
    </section>
  );
}

/** Edição simples dos textos da peça (sem refazer com a IA). */
function EdicaoPeca({ pecas, onChange, onSalvar, salvando }: { pecas: Pecas; onChange: (p: Pecas) => void; onSalvar: () => void; salvando: boolean }) {
  const campo = "campo text-sm";
  return (
    <div className="space-y-2 rounded-xl border border-borda p-2.5">
      {pecas.tipo === "carrossel" && pecas.slides.map((s, i) => (
        <fieldset key={i} className="space-y-1.5">
          <legend className="text-xs font-semibold text-texto-2">Slide {i + 1} · {s.papel === "capa" ? "capa" : s.papel === "fechamento" ? "fechamento" : "conteúdo"}</legend>
          <input className={campo} aria-label={`Título do slide ${i + 1}`} value={s.titulo} onChange={(e) => onChange({ ...pecas, slides: pecas.slides.map((x, j) => (j === i ? { ...x, titulo: e.target.value } : x)) })} />
          <textarea className={`${campo} min-h-[64px]`} aria-label={`Texto do slide ${i + 1}`} value={s.texto} onChange={(e) => onChange({ ...pecas, slides: pecas.slides.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
          <input className={campo} aria-label={`Destaque do slide ${i + 1}`} placeholder="Destaque (opcional)" value={s.destaque ?? ""} onChange={(e) => onChange({ ...pecas, slides: pecas.slides.map((x, j) => (j === i ? { ...x, destaque: e.target.value || null } : x)) })} />
        </fieldset>
      ))}
      {pecas.tipo === "estatico" && (
        <>
          <input className={campo} aria-label="Título" value={pecas.titulo} onChange={(e) => onChange({ ...pecas, titulo: e.target.value })} />
          <textarea className={`${campo} min-h-[64px]`} aria-label="Texto" value={pecas.texto} onChange={(e) => onChange({ ...pecas, texto: e.target.value })} />
          <input className={campo} aria-label="Destaque" placeholder="Destaque (opcional)" value={pecas.destaque ?? ""} onChange={(e) => onChange({ ...pecas, destaque: e.target.value || null })} />
          <input className={campo} aria-label="Rodapé" placeholder="Rodapé (opcional)" value={pecas.rodape ?? ""} onChange={(e) => onChange({ ...pecas, rodape: e.target.value || null })} />
        </>
      )}
      {pecas.tipo === "video" && pecas.cenas.map((c, i) => (
        <fieldset key={i} className="grid grid-cols-[1fr_72px] gap-1.5">
          <legend className="col-span-2 text-xs font-semibold text-texto-2">Cena {i + 1}</legend>
          <textarea className={`${campo} min-h-[56px]`} aria-label={`Texto da cena ${i + 1}`} value={c.texto} onChange={(e) => onChange({ ...pecas, cenas: pecas.cenas.map((x, j) => (j === i ? { ...x, texto: e.target.value } : x)) })} />
          <input className={`${campo} tabular`} type="number" min={1.5} max={8} step={0.5} aria-label={`Segundos da cena ${i + 1}`} value={c.segundos} onChange={(e) => onChange({ ...pecas, cenas: pecas.cenas.map((x, j) => (j === i ? { ...x, segundos: Number(e.target.value) || 3 } : x)) })} />
          <input className={`${campo} col-span-2`} aria-label={`Destaque da cena ${i + 1}`} placeholder="Palavras em destaque (opcional)" value={c.destaque ?? ""} onChange={(e) => onChange({ ...pecas, cenas: pecas.cenas.map((x, j) => (j === i ? { ...x, destaque: e.target.value || null } : x)) })} />
        </fieldset>
      ))}
      {pecas.tipo === "roteiro_falado" && pecas.cenas.map((c, i) => (
        <fieldset key={i} className="space-y-1.5">
          <legend className="text-xs font-semibold text-texto-2 tabular">Cena {i + 1} · {c.inicio_s}s – {c.fim_s}s</legend>
          <textarea className={`${campo} min-h-[72px]`} aria-label={`Fala da cena ${i + 1}`} value={c.fala} onChange={(e) => onChange({ ...pecas, cenas: pecas.cenas.map((x, j) => (j === i ? { ...x, fala: e.target.value } : x)) })} />
          <input className={campo} aria-label={`Enquadramento da cena ${i + 1}`} value={c.enquadramento} onChange={(e) => onChange({ ...pecas, cenas: pecas.cenas.map((x, j) => (j === i ? { ...x, enquadramento: e.target.value } : x)) })} />
        </fieldset>
      ))}
      <Botao type="button" tamanho="sm" carregando={salvando} onClick={onSalvar}>Salvar textos</Botao>
    </div>
  );
}
