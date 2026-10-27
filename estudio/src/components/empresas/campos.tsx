"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { OBJETIVOS_RITMO } from "@/lib/validacao/empresa";
import type { FormatoConteudo, Metas, Rede, RitmoDia } from "@/lib/tipos/database";
import { FORMATOS_POR_REDE, rotuloFormato } from "@/lib/redes";
import { METAS_PADRAO } from "@/lib/padroes";

export const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
export const FORMATOS: FormatoConteudo[] = FORMATOS_POR_REDE.instagram;

export { METAS_PADRAO, RITMO_PADRAO } from "@/lib/padroes";

export const CAMPOS_METAS: { chave: keyof Metas; rotulo: string; ajuda: string }[] = [
  { chave: "visualizacoes_dia", rotulo: "Visualizações por dia", ajuda: "Média diária" },
  { chave: "seguidores_liquidos_mes", rotulo: "Seguidores líquidos no mês", ajuda: "Ganhos menos perdidos" },
  { chave: "mensagens_mes", rotulo: "Mensagens no direct por mês", ajuda: "Registro manual" },
  { chave: "salvamentos_carrossel", rotulo: "Salvamentos por carrossel", ajuda: "Média por post" },
  { chave: "alcance_reels", rotulo: "Alcance por Reels", ajuda: "Média por Reels" },
  { chave: "engajamento_pct", rotulo: "Engajamento (%)", ajuda: "Interações ÷ alcance dos posts" },
];

export type MetasTexto = Record<keyof Metas, string>;

export function metasParaTexto(m?: Partial<Metas> | null): MetasTexto {
  const base = { ...METAS_PADRAO, ...(m ?? {}) };
  return Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v == null ? "" : String(v)])) as MetasTexto;
}

export { ritmoOuPadrao } from "@/lib/padroes";

export const FUSOS = [
  { valor: "America/Sao_Paulo", rotulo: "Brasília (America/Sao_Paulo)" },
  { valor: "America/Manaus", rotulo: "Manaus (America/Manaus)" },
  { valor: "America/Cuiaba", rotulo: "Cuiabá (America/Cuiaba)" },
  { valor: "America/Belem", rotulo: "Belém (America/Belem)" },
  { valor: "America/Fortaleza", rotulo: "Fortaleza (America/Fortaleza)" },
  { valor: "America/Recife", rotulo: "Recife (America/Recife)" },
  { valor: "America/Bahia", rotulo: "Salvador (America/Bahia)" },
  { valor: "America/Rio_Branco", rotulo: "Rio Branco (America/Rio_Branco)" },
  { valor: "America/Noronha", rotulo: "Fernando de Noronha (America/Noronha)" },
  { valor: "Europe/Lisbon", rotulo: "Lisboa (Europe/Lisbon)" },
];

export function CampoCor({ rotulo, valor, onChange, disabled }: { rotulo: string; valor: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <span className="rotulo">{rotulo}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${rotulo} (seletor)`}
          disabled={disabled}
          value={/^#[0-9A-Fa-f]{6}$/.test(valor) ? valor : "#000000"}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-borda bg-superficie p-1 disabled:cursor-not-allowed"
        />
        <input aria-label={`${rotulo} (hexadecimal)`} disabled={disabled} className="campo tabular uppercase" value={valor} onChange={(e) => onChange(e.target.value)} maxLength={7} placeholder="#7C3AED" />
      </div>
    </div>
  );
}

export function PreviaCores({ primaria, secundaria }: { primaria: string; secundaria: string }) {
  return (
    <div className="rounded-xl border p-3 text-sm" style={{ borderColor: primaria }}>
      <span className="mr-2 inline-block rounded-lg px-2 py-1 font-medium text-white" style={{ background: primaria }}>Destaque</span>
      <span className="inline-block rounded-lg px-2 py-1 font-medium" style={{ background: secundaria, color: "#1c1917" }}>Secundária</span>
      <span className="ml-2 text-texto-3">Prévia das cores na interface.</span>
    </div>
  );
}

export function EditorPilares({ pilares, onChange, disabled, onErro }: { pilares: string[]; onChange: (p: string[]) => void; disabled?: boolean; onErro?: (m: string) => void }) {
  const [novo, setNovo] = useState("");

  function adicionar() {
    const p = novo.trim();
    if (!p) return;
    if (pilares.includes(p)) return setNovo("");
    if (pilares.length >= 12) return onErro?.("No máximo 12 pilares.");
    onChange([...pilares, p]);
    setNovo("");
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionar();
    }
  }

  return (
    <div>
      <label htmlFor="pilar" className="rotulo">Pilares de conteúdo</label>
      <div className="flex gap-2">
        <input id="pilar" className="campo" disabled={disabled} value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={tecla} placeholder="Ex.: Bastidores" maxLength={60} />
        <Botao type="button" variante="secundaria" onClick={adicionar} disabled={disabled}>Adicionar</Botao>
      </div>
      <p className="mt-1 text-xs text-texto-3">Enter adiciona. Até 12 pilares.</p>
      {pilares.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2" aria-label="Pilares">
          {pilares.map((p) => (
            <li key={p} className="inline-flex items-center gap-1 rounded-full border border-primaria/30 bg-primaria/10 px-2.5 py-1 text-sm text-primaria">
              {p}
              {!disabled && (
                <button type="button" aria-label={`Remover ${p}`} onClick={() => onChange(pilares.filter((x) => x !== p))} className="rounded-full p-0.5 hover:bg-primaria/20">
                  <X className="h-3 w-3" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CamposMetas({ metas, onChange, disabled }: { metas: MetasTexto; onChange: (m: MetasTexto) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CAMPOS_METAS.map(({ chave, rotulo, ajuda }) => (
        <CampoTexto key={chave} rotulo={rotulo} ajuda={ajuda} inputMode="decimal" disabled={disabled} value={metas[chave]} onChange={(e) => onChange({ ...metas, [chave]: e.target.value })} className="tabular" />
      ))}
    </div>
  );
}

export function CamposRitmo({ ritmo, pilares, onChange, disabled, rede = "instagram" }: { ritmo: RitmoDia[]; pilares: string[]; onChange: (r: RitmoDia[]) => void; disabled?: boolean; rede?: Rede }) {
  const atualizar = (i: number, parcial: Partial<RitmoDia>) => onChange(ritmo.map((r, j) => (j === i ? { ...r, ...parcial } : r)));
  return (
    <ul className="space-y-3">
      {ritmo.map((r, i) => (
        <li key={r.dia} className="rounded-xl border border-borda p-3">
          <p className="mb-2 text-sm font-semibold">{DIAS[r.dia - 1]}</p>
          <div className={`grid gap-2 ${rede === "linkedin" ? "sm:grid-cols-[110px_170px_1fr_170px]" : "sm:grid-cols-[110px_130px_1fr_170px]"}`}>
            <CampoTexto rotulo="Hora" type="time" disabled={disabled} value={r.hora} onChange={(e) => atualizar(i, { hora: e.target.value })} className="tabular" />
            <CampoSelecao rotulo="Formato" disabled={disabled} value={r.formato} onChange={(e) => atualizar(i, { formato: e.target.value as FormatoConteudo })}>
              {FORMATOS_POR_REDE[rede].map((f) => <option key={f} value={f}>{rotuloFormato(f, rede)}</option>)}
              {!FORMATOS_POR_REDE[rede].includes(r.formato) && <option value={r.formato}>{rotuloFormato(r.formato, rede)}</option>}
            </CampoSelecao>
            <CampoTexto rotulo="Tipo" disabled={disabled} value={r.tipo} onChange={(e) => atualizar(i, { tipo: e.target.value })} placeholder={rede === "linkedin" ? "Ex.: Caso de escola atendida" : "Ex.: Reels de prova social"} maxLength={120} />
            <CampoSelecao rotulo="Objetivo" disabled={disabled} value={r.objetivo} onChange={(e) => atualizar(i, { objetivo: e.target.value })}>
              {OBJETIVOS_RITMO.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </CampoSelecao>
          </div>
          {pilares.length > 0 && (
            <CampoSelecao rotulo="Pilar" disabled={disabled} value={r.pilar} onChange={(e) => atualizar(i, { pilar: e.target.value })} className="mt-2">
              <option value="">Sem pilar fixo</option>
              {pilares.map((p) => <option key={p} value={p}>{p}</option>)}
            </CampoSelecao>
          )}
        </li>
      ))}
    </ul>
  );
}
