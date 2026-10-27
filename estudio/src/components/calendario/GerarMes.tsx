"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, XCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { CampoSelecao } from "@/components/ui/Campo";
import { formatarCurta, formatarMesAno, capitalizar, rotuloSemana } from "@/lib/datas";
import { mesesDisponiveis, planejarMes, type SemanaDoPlano } from "@/lib/ia/planoMes";
import type { Rede, RitmoDia } from "@/lib/tipos/database";
import { rotuloFormato } from "@/lib/redes";
import type { ResultadoSemanaIA } from "@/app/api/ia/calendario/route";
import { Painel } from "./Painel";

type EstadoSemana = { semana: SemanaDoPlano; estado: "fila" | "pensando" | "ok" | "erro" | "cancelada"; resultado?: ResultadoSemanaIA; erro?: string };

/**
 * Gera o calendário de um mês com a IA, uma semana por vez (cada semana é uma
 * chamada curta; dá para cancelar entre elas). Só dias de hoje em diante,
 * com slot no ritmo semanal e ainda vazios.
 */
export function GerarMes({ empresaId, hoje, ritmo: ritmoInstagram, ritmoLinkedin, redeInicial = "instagram", iaConfigurada, onFechar }: {
  empresaId: string; hoje: string; ritmo: RitmoDia[];
  /** Ritmo do LinkedIn; null quando a empresa não usa LinkedIn. */
  ritmoLinkedin: RitmoDia[] | null;
  redeInicial?: Rede;
  iaConfigurada: boolean; onFechar: () => void;
}) {
  const router = useRouter();
  const meses = useMemo(() => mesesDisponiveis(hoje), [hoje]);
  const [mes, setMes] = useState(meses[0].valor);
  const [rede, setRede] = useState<Rede>(ritmoLinkedin ? redeInicial : "instagram");
  const ritmo = rede === "linkedin" && ritmoLinkedin ? ritmoLinkedin : ritmoInstagram;
  const plano = useMemo(() => planejarMes(mes, hoje, ritmo), [mes, hoje, ritmo]);
  const totalDias = plano.reduce((a, s) => a + s.dias.length, 0);
  const [semanas, setSemanas] = useState<EstadoSemana[] | null>(null);
  const controlador = useRef<AbortController | null>(null);
  const rodando = semanas?.some((s) => s.estado === "pensando" || s.estado === "fila") ?? false;

  useEffect(() => () => controlador.current?.abort(), []);

  async function gerar() {
    const ac = new AbortController();
    controlador.current = ac;
    const fila: EstadoSemana[] = plano.map((semana) => ({ semana, estado: "fila" }));
    setSemanas(fila);
    for (let i = 0; i < fila.length; i++) {
      if (ac.signal.aborted) break;
      setSemanas((s) => s!.map((x, n) => (n === i ? { ...x, estado: "pensando" } : x)));
      try {
        const resposta = await fetch("/api/ia/calendario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ empresaId, dias: fila[i].semana.dias, ...(rede === "linkedin" ? { rede } : {}) }),
          signal: ac.signal,
        });
        const corpo = (await resposta.json().catch(() => ({}))) as Partial<ResultadoSemanaIA> & { erro?: string; detalhes?: string[] };
        if (!resposta.ok || !corpo.criados) {
          const erro = `${corpo.erro ?? `Erro ${resposta.status}`}${corpo.detalhes?.length ? ` (${corpo.detalhes.slice(0, 3).join("; ")})` : ""}`;
          setSemanas((s) => s!.map((x, n) => (n === i ? { ...x, estado: "erro", erro } : x)));
          continue;
        }
        setSemanas((s) => s!.map((x, n) => (n === i ? { ...x, estado: "ok", resultado: corpo as ResultadoSemanaIA } : x)));
        router.refresh();
      } catch (e) {
        if ((e as Error).name === "AbortError") break;
        setSemanas((s) => s!.map((x, n) => (n === i ? { ...x, estado: "erro", erro: "Não foi possível falar com o servidor." } : x)));
      }
    }
    if (ac.signal.aborted) setSemanas((s) => s!.map((x) => (x.estado === "fila" || x.estado === "pensando" ? { ...x, estado: "cancelada" } : x)));
    controlador.current = null;
  }

  function cancelar() {
    controlador.current?.abort();
  }

  const criados = semanas?.reduce((a, s) => a + (s.resultado?.criados.length ?? 0), 0) ?? 0;
  const tarefas = semanas?.reduce((a, s) => a + (s.resultado?.tarefas ?? 0), 0) ?? 0;
  const pulados = semanas?.reduce((a, s) => a + (s.resultado?.pulados.length ?? 0), 0) ?? 0;
  const terminou = semanas != null && !rodando;

  return (
    <Painel
      titulo={rede === "linkedin" ? "Gerar mês do LinkedIn com IA" : "Gerar mês com IA"}
      onFechar={onFechar}
      rodape={
        <div className="flex flex-wrap justify-end gap-2">
          {rodando ? (
            <Botao variante="secundaria" onClick={cancelar}><XCircle className="h-4 w-4" aria-hidden /> Cancelar</Botao>
          ) : (
            <>
              <Botao variante="secundaria" onClick={onFechar}>{terminou ? "Fechar" : "Cancelar"}</Botao>
              {!terminou && <Botao onClick={gerar} disabled={!iaConfigurada || totalDias === 0}><Sparkles className="h-5 w-5" aria-hidden /> Gerar {totalDias} {totalDias === 1 ? "dia" : "dias"}</Botao>}
            </>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {!iaConfigurada && <Aviso tipo="erro">A IA não está configurada neste servidor: falta a variável <code className="rounded bg-superficie-2 px-1">ANTHROPIC_API_KEY</code>.</Aviso>}
        {!semanas && (
          <>
            {ritmoLinkedin && (
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-superficie-2 p-1" role="radiogroup" aria-label="Rede">
                {(["instagram", "linkedin"] as const).map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={rede === r} onClick={() => setRede(r)} className={`rounded-lg px-2 py-2 text-sm font-medium ${rede === r ? "bg-superficie text-texto shadow-sm" : "text-texto-2"}`}>
                    {r === "instagram" ? "Instagram" : "LinkedIn"}
                  </button>
                ))}
              </div>
            )}
            <CampoSelecao rotulo="Mês" value={mes} onChange={(e) => setMes(e.target.value)}>
              {meses.map((m) => <option key={m.valor} value={m.valor}>{capitalizar(formatarMesAno(m.inicio))}</option>)}
            </CampoSelecao>
            <div className="rounded-xl border border-ia/40 bg-ia/10 p-3 text-sm">
              <p className="font-medium text-ia">O que vai acontecer</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-texto-2">
                <li>Para cada dia do ritmo semanal de hoje em diante, a IA escreve o conteúdo completo: tema, objetivo, roteiro ou slides, legenda pronta com CTA, orientação de arte e, nos Reels, 3 ganchos alternativos.</li>
                {rede === "linkedin" ? (
                  <li>Ritmo do LinkedIn: {ritmo.map((r) => `${["seg", "ter", "qua", "qui", "sex", "sáb", "dom"][r.dia - 1]} ${rotuloFormato(r.formato, "linkedin")}`).join(" · ")}. Texto na voz da empresa, para gestores e decisores; sem stories.</li>
                ) : (
                  <li>Cada dia ganha 4 telas de stories (abertura, compartilhar o post, interação e fechamento).</li>
                )}
                <li>Tudo entra como <Selo tom="ia">Sugestão da IA</Selo> para você aprovar, e as tarefas padrão são criadas.</li>
                <li>Dias que já têm conteúdo são pulados. Uma semana por vez: dá para cancelar no meio.</li>
              </ul>
            </div>
            {ritmo.length === 0 ? (
              <Aviso tipo="erro">Defina o ritmo semanal em Marca antes de gerar o mês.</Aviso>
            ) : totalDias === 0 ? (
              <Aviso tipo="info">Não há dias do ritmo de hoje em diante neste mês.</Aviso>
            ) : (
              <ul className="space-y-1 text-sm">
                {plano.map((s) => (
                  <li key={s.segunda} className="flex justify-between gap-2 rounded-lg bg-superficie-2 px-3 py-1.5"><span>Semana de {rotuloSemana(s.segunda)}</span><span className="tabular text-texto-2">{s.dias.length} {s.dias.length === 1 ? "dia" : "dias"}</span></li>
                ))}
              </ul>
            )}
          </>
        )}

        {semanas && (
          <>
            <div role="status" className={`rounded-xl border p-3 text-sm ${rodando ? "border-ia/40 bg-ia/10" : "border-borda bg-superficie-2"}`}>
              {rodando ? (
                <div className="flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-ia border-t-transparent" aria-hidden />
                  <div>
                    <p className="font-medium text-ia">Pensando… semana {semanas.findIndex((s) => s.estado === "pensando") + 1} de {semanas.length}</p>
                    <p className="text-xs text-texto-2">Cada semana leva de 1 a 3 minutos. Você pode fechar esta janela depois de cancelar; o que já foi gerado fica no calendário.</p>
                  </div>
                </div>
              ) : (
                <p>
                  <span className="font-medium">{criados} {criados === 1 ? "conteúdo criado" : "conteúdos criados"}</span>{rede === "instagram" ? " com stories" : " no LinkedIn"}, {tarefas} tarefas.
                  {pulados > 0 && ` ${pulados} ${pulados === 1 ? "dia pulado" : "dias pulados"} (já tinham conteúdo).`}
                </p>
              )}
            </div>
            <ul className="space-y-2">
              {semanas.map((s) => (
                <li key={s.semana.segunda} className="rounded-xl border border-borda p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Semana de {rotuloSemana(s.semana.segunda)}</span>
                    {s.estado === "fila" && <Selo tom="neutro">Na fila</Selo>}
                    {s.estado === "pensando" && <Selo tom="ia">Pensando…</Selo>}
                    {s.estado === "ok" && <Selo tom="real">{s.resultado?.criados.length ?? 0} criados</Selo>}
                    {s.estado === "erro" && <Selo tom="atrasado">Erro</Selo>}
                    {s.estado === "cancelada" && <Selo tom="manual">Cancelada</Selo>}
                  </div>
                  {s.estado === "erro" && <p className="mt-1 text-xs text-atrasado">{s.erro}</p>}
                  {s.resultado && s.resultado.criados.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-texto-2">{s.resultado.criados.map((c) => <li key={c.data} className="tabular">{formatarCurta(c.data)} · {rotuloFormato(c.formato as never, rede)} · {c.tema}</li>)}</ul>
                  )}
                  {s.resultado && s.resultado.avisos.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-manual">{s.resultado.avisos.slice(0, 4).map((a, i) => <li key={i}>{a}</li>)}</ul>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Painel>
  );
}
