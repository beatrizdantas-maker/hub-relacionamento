"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, PenLine, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { atualizarDoMetricool } from "@/app/(app)/painel/acoes";
import { Selo } from "@/components/ui/Selo";
import { permissoes } from "@/lib/papeis";
import { inicioDaSemana, somarDias } from "@/lib/datas";
import { mesDe as _mesDe } from "@/lib/metricas";
import { INDICADORES, agruparPorMes, compararUltimos, formatarDiferenca, formatarNumero, progressoMetas, rotuloFonte, semanaParaPeriodo, variacao, type Periodo } from "@/lib/metricas";
import type { MetricaSemanal, Metas, Papel, ResultadoPost } from "@/lib/tipos/database";
import { GraficoLinha, type PontoGrafico } from "./GraficoLinha";
import { GraficoBarras } from "./GraficoBarras";
import { TabelaConteudos } from "./TabelaConteudos";
import { FormularioMetricas } from "./FormularioMetricas";
import { FormularioResultadoPost } from "./FormularioResultadoPost";

export interface PainelProps {
  empresa: { id: string; nome: string; metas: Metas | null };
  papel: Papel;
  hoje: string;
  visao: "semanas" | "meses";
  abrir: string | null;
  semanas: MetricaSemanal[];
  posts: ResultadoPost[];
  /** null quando o usuário não é dono (não enxerga a integração) */
  metricool: { configurado: boolean; ultimaImportacao: string | null } | null;
}

type Selecao = { tipo: "semana"; semana: string } | { tipo: "post"; id: string | null } | null;

export function PainelEvolucao(p: PainelProps) {
  const router = useRouter();
  const podeEditar = permissoes.podeEditar(p.papel);
  const [importando, iniciarImportacao] = useTransition();
  const [resultadoImportacao, setResultadoImportacao] = useState<{ tipo: "sucesso" | "erro" | "info"; texto: string; avisos?: string[] } | null>(null);
  const [selecao, setSelecao] = useState<Selecao>(() => (p.abrir === "registrar" && podeEditar ? { tipo: "semana", semana: inicioDaSemana(somarDias(p.hoje, -7)) } : null));
  const fechar = useCallback(() => setSelecao(null), []);

  const periodos: Periodo[] = useMemo(
    () => (p.visao === "meses" ? agruparPorMes(p.semanas, p.hoje) : p.semanas.map((s) => semanaParaPeriodo(s, p.hoje))).sort((a, b) => a.inicio.localeCompare(b.inicio)),
    [p.semanas, p.visao, p.hoje],
  );
  const { atual, anterior } = useMemo(() => compararUltimos(periodos), [periodos]);
  const ultimos = periodos.slice(-12);
  const pontosVis: PontoGrafico[] = ultimos.map((x) => ({ chave: x.chave, rotulo: x.rotulo, rotuloLongo: x.rotuloLongo, valor: x.visualizacoes, parcial: !x.completo }));
  const pontosLiq: PontoGrafico[] = ultimos.map((x) => ({ chave: x.chave, rotulo: x.rotulo, rotuloLongo: x.rotuloLongo, valor: x.seguidores_liquidos, parcial: !x.completo }));

  const mesAtual = _mesDe(p.hoje);
  const metas = useMemo(
    () => progressoMetas(p.empresa.metas, p.semanas.filter((s) => _mesDe(s.semana) === mesAtual), p.posts.filter((r) => _mesDe(r.publicado_em.slice(0, 10)) === mesAtual)),
    [p.empresa.metas, p.semanas, p.posts, mesAtual],
  );
  const nomeMes = new Date(`${mesAtual}-01T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const semanaSelecionada = selecao?.tipo === "semana" ? p.semanas.find((s) => s.semana === selecao.semana) ?? null : null;
  const postSelecionado = selecao?.tipo === "post" && selecao.id ? p.posts.find((r) => r.id === selecao.id) ?? null : null;
  const unidade = p.visao === "meses" ? "mês" : "semana";

  function importar() {
    setResultadoImportacao(null);
    iniciarImportacao(async () => {
      const r = await atualizarDoMetricool(p.empresa.id);
      if (!r.ok) return setResultadoImportacao({ tipo: "erro", texto: r.erro });
      const { resumo } = r;
      const partes = [`${resumo.semanasGravadas} ${resumo.semanasGravadas === 1 ? "semana gravada" : "semanas gravadas"}`, `${resumo.posts} posts`, `${resumo.reels} Reels`, `${resumo.stories} stories`];
      if (resumo.semanasPuladas) partes.push(`${resumo.semanasPuladas} ${resumo.semanasPuladas === 1 ? "semana ajustada à mão preservada" : "semanas ajustadas à mão preservadas"}`);
      setResultadoImportacao({
        tipo: resumo.semanasGravadas || resumo.posts || resumo.reels ? "sucesso" : "info",
        texto: `Importação de ${new Date(resumo.periodo.de + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(resumo.periodo.ate + "T12:00:00").toLocaleDateString("pt-BR")}: ${partes.join(" · ")}.`,
        avisos: resumo.avisos,
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Painel de evolução</h1>
          <p className="mt-1 text-sm text-texto-2">
            {atual ? <>Última {unidade} completa: <strong className="text-texto">{atual.rotuloLongo}</strong>{anterior && <> · comparada com {anterior.rotuloLongo}</>}</> : `Nenhuma ${unidade} completa registrada ainda.`}
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundaria" onClick={() => setSelecao({ tipo: "semana", semana: inicioDaSemana(somarDias(p.hoje, -7)) })}>
              <PenLine className="h-4 w-4" aria-hidden /> Registrar manualmente
            </Botao>
            {p.metricool && (
              <Botao variante="secundaria" carregando={importando} disabled={!p.metricool.configurado} onClick={importar}
                title={p.metricool.configurado ? (p.metricool.ultimaImportacao ? `Última importação: ${new Date(p.metricool.ultimaImportacao).toLocaleString("pt-BR")}` : "Importar do Metricool") : "Configure User ID, ID da marca e token em Marca → Metricool"}>
                <RefreshCw className={`h-4 w-4 ${importando ? "animate-spin" : ""}`} aria-hidden /> {importando ? "Importando…" : "Atualizar do Metricool"}
              </Botao>
            )}
          </div>
        )}
      </header>

      {p.metricool && !p.metricool.configurado && podeEditar && (
        <p className="text-xs text-texto-3">Para importar automaticamente, configure o Metricool em Marca → Metricool. O registro manual funciona sem integração.</p>
      )}
      {resultadoImportacao && (
        <Aviso tipo={resultadoImportacao.tipo}>
          <p>{resultadoImportacao.texto}</p>
          {resultadoImportacao.avisos && resultadoImportacao.avisos.length > 0 && (
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">{resultadoImportacao.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
          )}
        </Aviso>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1" role="group" aria-label="Período">
          {(["semanas", "meses"] as const).map((v) => (
            <Link key={v} href={`/painel${v === "meses" ? "?visao=meses" : ""}`} aria-current={p.visao === v ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${p.visao === v ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>
              {v === "semanas" ? "Semanas" : "Meses"}
            </Link>
          ))}
        </div>
        {atual && <Selo tom={rotuloFonte(atual.fonte, atual.editadoManual).tom}>{rotuloFonte(atual.fonte, atual.editadoManual).texto}</Selo>}
        <span className="text-xs text-texto-3">Períodos parciais aparecem nos gráficos e no histórico, mas não entram na comparação.</span>
      </div>

      {/* Indicadores */}
      <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {INDICADORES.map((ind) => {
          const v = variacao(ind.chave, atual, anterior);
          const dif = formatarDiferenca(v, ind.tipo);
          const positivo = (v.diferenca ?? 0) > 0, negativo = (v.diferenca ?? 0) < 0;
          return (
            <div key={ind.chave} className="cartao space-y-1 !p-3">
              <p className="text-xs text-texto-2">{ind.rotulo}</p>
              <p className={`text-2xl font-semibold tabular ${v.valor == null ? "text-texto-3 text-base" : ""}`}>{formatarNumero(v.valor, ind.tipo)}</p>
              {dif ? (
                <p className={`flex items-center gap-1 text-xs tabular ${positivo ? "text-real" : negativo ? "text-atrasado" : "text-texto-3"}`}>
                  {positivo ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : negativo ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                  {dif} <span className="sr-only">em relação ao período anterior</span>
                </p>
              ) : (
                <p className="text-xs text-texto-3">{v.valor == null ? ind.descricao : "sem período anterior"}</p>
              )}
            </div>
          );
        })}
      </section>

      {/* Gráficos */}
      <section className="grid gap-4 lg:grid-cols-2">
        <GraficoLinha titulo={`Visualizações por ${unidade}`} pontos={pontosVis} />
        <GraficoBarras titulo={`Seguidores líquidos por ${unidade}`} pontos={pontosLiq} />
      </section>

      {/* Metas do mês */}
      <section className="cartao space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Metas de {nomeMes}</h2>
          <p className="text-sm text-texto-2">Calculadas com as semanas que começam no mês e os posts publicados nele.</p>
        </div>
        {metas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">Nenhuma meta definida. Defina em Marca → Metas.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {metas.map((m) => {
              const pct = m.progresso == null ? 0 : Math.min(1, Math.max(0, m.progresso));
              return (
                <li key={m.chave} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{m.rotulo}</span>
                    <span className="tabular text-texto-2">{formatarNumero(m.valor, m.tipo)} <span className="text-texto-3">/ {formatarNumero(m.meta, m.tipo)}</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={m.rotulo}>
                    <div className={`h-full rounded-full ${pct >= 1 ? "bg-real" : "bg-primaria"}`} style={{ width: `${pct * 100}%` }} />
                  </div>
                  <p className="text-xs text-texto-3">{m.progresso == null ? "sem dado" : `${Math.round(m.progresso * 100)}% da meta`} · {m.base}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Melhores conteúdos */}
      <section className="cartao space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Conteúdos com melhor desempenho</h2>
            <p className="text-sm text-texto-2">Posts dos últimos 6 meses com resultado registrado. Clique no cabeçalho para ordenar.</p>
          </div>
          {podeEditar && <Botao tamanho="sm" variante="secundaria" onClick={() => setSelecao({ tipo: "post", id: null })}>Registrar resultado de post</Botao>}
        </div>
        <TabelaConteudos posts={p.posts} onEditar={podeEditar ? (r) => setSelecao({ tipo: "post", id: r.id }) : undefined} />
      </section>

      {/* Histórico */}
      <section className="cartao space-y-3">
        <h2 className="text-lg font-semibold">Histórico por {unidade}</h2>
        {periodos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">Nenhum registro. {podeEditar ? "Clique em Registrar manualmente para começar pela semana passada." : ""}</p>
        ) : (
          <div className="relative -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label="Histórico por período (rola na horizontal)">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-xs text-texto-3">
                  <th scope="col" className="py-2 pr-2 font-medium">Período</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Seguidores</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Líquidos</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Visualiz.</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Alcance</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Engaj.</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Salvam.</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Compart.</th>
                  <th scope="col" className="py-2 pr-2 text-right font-medium">Direct</th>
                  <th scope="col" className="py-2 font-medium">Fonte</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borda">
                {[...periodos].reverse().map((x) => {
                  const f = rotuloFonte(x.fonte, x.editadoManual);
                  const clicavel = p.visao === "semanas" && podeEditar;
                  const celulas = (
                    <>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.seguidores)}</td>
                      <td className={`py-2 pr-2 text-right tabular ${(x.seguidores_liquidos ?? 0) < 0 ? "text-atrasado" : ""}`}>{x.seguidores_liquidos != null && x.seguidores_liquidos > 0 ? "+" : ""}{formatarNumero(x.seguidores_liquidos)}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.visualizacoes)}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.alcance)}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.engajamento, "pct")}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.salvamentos)}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.compartilhamentos)}</td>
                      <td className="py-2 pr-2 text-right tabular">{formatarNumero(x.mensagens_direct)}</td>
                      <td className="py-2"><Selo tom={f.tom}>{f.texto.replace("Dado real · ", "")}</Selo></td>
                    </>
                  );
                  return (
                    <tr key={x.chave} className={clicavel ? "cursor-pointer hover:bg-superficie-2" : ""} onClick={clicavel ? () => setSelecao({ tipo: "semana", semana: x.chave }) : undefined}>
                      <td className="py-2 pr-2">
                        {clicavel ? (
                          <button type="button" className="text-left font-medium text-primaria underline-offset-2 hover:underline tabular">{x.rotuloLongo}</button>
                        ) : <span className="font-medium tabular">{x.rotuloLongo}</span>}
                        {!x.completo && <Selo tom="manual" className="ml-1">parcial</Selo>}
                        {p.visao === "meses" && <span className="ml-1 text-xs text-texto-3">{x.semanas} sem.</span>}
                      </td>
                      {celulas}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {p.visao === "semanas" && podeEditar && periodos.length > 0 && <p className="text-xs text-texto-3">Clique numa semana para corrigir ou completar os números.</p>}
      </section>

      {selecao?.tipo === "semana" && (
        <FormularioMetricas key={selecao.semana} empresaId={p.empresa.id} hoje={p.hoje} semanaInicial={selecao.semana} existente={semanaSelecionada} podeExcluir={podeEditar} onFechar={fechar} />
      )}
      {selecao?.tipo === "post" && (
        <FormularioResultadoPost key={selecao.id ?? "novo"} empresaId={p.empresa.id} hoje={p.hoje} existente={postSelecionado} onFechar={fechar} />
      )}
    </div>
  );
}
