"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, XCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { modoReelsPadrao, type ModoReels } from "@/lib/ia/briefing";
import type { FormatoConteudo } from "@/lib/tipos/database";

export type CamposBriefing = {
  data: string; formato: FormatoConteudo; tipo: string; pilar: string; tema: string; objetivo: string;
  roteiro: string; legenda: string; cta: string; orientacao_arte: string; ganchos: string[];
};
type Resposta = { roteiro: string; orientacao_arte: string; legenda: string; cta: string; ganchos: string[] };

/**
 * Pede à IA o briefing de produção do conteúdo: como devem ser as imagens
 * (carrossel e estático) ou o roteiro completo do vídeo (Reels). Preenche os
 * campos do formulário; nada é salvo até clicar em Salvar.
 */
export function BriefingIA({ empresaId, campos, onAplicar }: { empresaId: string; campos: CamposBriefing; onAplicar: (r: Resposta) => void }) {
  const [modo, setModo] = useState<ModoReels>(() => modoReelsPadrao(campos.tipo));
  const [gerando, setGerando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [erro, setErro] = useState<{ texto: string; detalhes: string[] } | null>(null);
  const controlador = useRef<AbortController | null>(null);
  useEffect(() => () => controlador.current?.abort(), []);

  const jaTemTexto = Boolean(campos.roteiro.trim() || campos.orientacao_arte.trim());
  const oQue = campos.formato === "Reels" ? "roteiro completo do vídeo" : campos.formato === "Carrossel" ? "texto e imagem de cada slide" : "texto e imagem da arte";

  async function gerar() {
    setConfirmando(false);
    setErro(null);
    if (!campos.tema.trim()) return setErro({ texto: "Escreva o tema antes de pedir o briefing.", detalhes: [] });
    const ac = new AbortController();
    controlador.current = ac;
    setGerando(true);
    try {
      const r = await fetch("/api/ia/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId, modoReels: modo, conteudo: campos }),
        signal: ac.signal,
      });
      const corpo = (await r.json().catch(() => ({}))) as Partial<Resposta> & { erro?: string; detalhes?: string[] };
      if (!r.ok || typeof corpo.roteiro !== "string") {
        setErro({ texto: corpo.erro ?? `Erro ${r.status} ao gerar.`, detalhes: corpo.detalhes ?? [] });
        return;
      }
      onAplicar(corpo as Resposta);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setErro({ texto: "Não foi possível falar com o servidor.", detalhes: [] });
    } finally {
      setGerando(false);
      controlador.current = null;
    }
  }

  return (
    <section aria-label="Briefing com IA" className="space-y-2 rounded-xl border border-ia/40 bg-ia/5 p-3">
      <p className="text-sm">
        <strong className="text-ia">Briefing com IA:</strong> {oQue}, orientação de arte e legenda, prontos para a equipe produzir.
      </p>
      {campos.formato === "Reels" && (
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-superficie p-1" role="radiogroup" aria-label="Como o Reels será feito">
          {([["com_pessoa", "Gravado com pessoa falando"], ["sem_pessoa", "Sem pessoa (imagens e texto)"]] as const).map(([v, r]) => (
            <button key={v} type="button" role="radio" aria-checked={modo === v} onClick={() => setModo(v)} className={`rounded-lg px-2 py-2 text-xs font-medium ${modo === v ? "bg-ia/10 text-ia" : "text-texto-2"}`}>{r}</button>
          ))}
        </div>
      )}
      {gerando ? (
        <div role="status" className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-ia border-t-transparent" aria-hidden /> Pensando…</span>
          <Botao type="button" variante="secundaria" tamanho="sm" onClick={() => controlador.current?.abort()}><XCircle className="h-4 w-4" aria-hidden /> Cancelar</Botao>
        </div>
      ) : confirmando ? (
        <Confirmacao titulo="Substituir o roteiro, a orientação de arte e a legenda atuais?" descricao="O texto atual vai para o lugar do novo só depois que você clicar em Salvar." rotuloConfirmar="Substituir" perigo={false} onConfirmar={gerar} onCancelar={() => setConfirmando(false)} />
      ) : (
        <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => (jaTemTexto ? setConfirmando(true) : gerar())}>
          <Sparkles className="h-4 w-4 text-ia" aria-hidden /> {jaTemTexto ? "Refazer briefing com IA" : "Gerar briefing com IA"}
        </Botao>
      )}
      {erro && (
        <Aviso tipo="erro">
          {erro.texto}
          {erro.detalhes.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs">{erro.detalhes.map((d, i) => <li key={i}>{d}</li>)}</ul>}
        </Aviso>
      )}
    </section>
  );
}
