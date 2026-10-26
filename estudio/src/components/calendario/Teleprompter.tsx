"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, RotateCcw, X } from "lucide-react";
import type { CenaFalada } from "@/lib/tipos/database";

/** Tela cheia com a fala em letras grandes, rolando sozinha, para gravar lendo. */
export function Teleprompter({ cenas, onFechar }: { cenas: CenaFalada[]; onFechar: () => void }) {
  const caixa = useRef<HTMLDivElement>(null);
  const [rodando, setRodando] = useState(false);
  const [velocidade, setVelocidade] = useState(2);
  const [tamanho, setTamanho] = useState(44);
  const [espelhado, setEspelhado] = useState(false);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
      if (e.key === " ") { e.preventDefault(); setRodando((r) => !r); }
    };
    document.addEventListener("keydown", tecla);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", tecla); document.body.style.overflow = anterior; };
  }, [onFechar]);

  useEffect(() => {
    if (!rodando) return;
    let quadro = 0;
    const passo = () => {
      const el = caixa.current;
      if (el) {
        el.scrollTop += velocidade * 0.6;
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) { setRodando(false); return; }
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [rodando, velocidade]);

  const botao = "flex h-11 min-w-11 items-center justify-center gap-1 rounded-xl bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/20";
  return (
    <div role="dialog" aria-modal="true" aria-label="Teleprompter" className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/15 p-3">
        <button type="button" className={botao} onClick={() => setRodando((r) => !r)} aria-label={rodando ? "Pausar" : "Rolar"}>
          {rodando ? <Pause className="h-5 w-5" aria-hidden /> : <Play className="h-5 w-5" aria-hidden />} {rodando ? "Pausar" : "Rolar"}
        </button>
        <button type="button" className={botao} onClick={() => { caixa.current?.scrollTo({ top: 0 }); setRodando(false); }} aria-label="Voltar ao início"><RotateCcw className="h-5 w-5" aria-hidden /></button>
        <span className="ml-2 text-sm text-white/80">Velocidade</span>
        <button type="button" className={botao} onClick={() => setVelocidade((v) => Math.max(1, v - 1))} aria-label="Mais devagar"><Minus className="h-4 w-4" aria-hidden /></button>
        <span className="w-6 text-center text-sm tabular">{velocidade}</span>
        <button type="button" className={botao} onClick={() => setVelocidade((v) => Math.min(8, v + 1))} aria-label="Mais rápido"><Plus className="h-4 w-4" aria-hidden /></button>
        <span className="ml-2 text-sm text-white/80">Letra</span>
        <button type="button" className={botao} onClick={() => setTamanho((t) => Math.max(28, t - 6))} aria-label="Letra menor"><Minus className="h-4 w-4" aria-hidden /></button>
        <button type="button" className={botao} onClick={() => setTamanho((t) => Math.min(96, t + 6))} aria-label="Letra maior"><Plus className="h-4 w-4" aria-hidden /></button>
        <label className="ml-2 flex items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={espelhado} onChange={(e) => setEspelhado(e.target.checked)} className="h-4 w-4" /> Espelhar</label>
        <button type="button" className={`${botao} ml-auto`} onClick={onFechar} aria-label="Fechar teleprompter"><X className="h-5 w-5" aria-hidden /></button>
      </div>
      <div ref={caixa} className="flex-1 overflow-y-auto px-6 py-[40vh]" style={{ transform: espelhado ? "scaleX(-1)" : undefined }}>
        <div className="mx-auto max-w-3xl space-y-12">
          {cenas.map((c, i) => (
            <p key={i} className="font-semibold leading-snug" style={{ fontSize: tamanho }}>
              <span className="mb-2 block text-base font-normal text-white/60 tabular">{c.inicio_s}s – {c.fim_s}s</span>
              {c.fala}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
