"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Check, ChevronRight, Lightbulb, Minus, Plus, Sparkles } from "lucide-react";
import { Selo } from "@/components/ui/Selo";
import { Aviso } from "@/components/ui/Aviso";
import { Botao } from "@/components/ui/Botao";
import { ICONE_FORMATO, STATUS } from "@/components/calendario/rotulos";
import { SeloLinkedin } from "@/components/calendario/Cartoes";
import { redeDe, rotuloFormato } from "@/lib/redes";
import { PRIORIDADE_TOM } from "@/components/tarefas/rotulos";
import { mudarStatusTarefa } from "@/app/(app)/tarefas/acoes";
import { capitalizar, formatarCurta, formatarDiaSemanaCurto, formatarLonga, formatarMesAno, horaCurta, rotuloSemana, somarDias } from "@/lib/datas";
import { INDICADORES, formatarDiferenca, formatarNumero, variacao, type Periodo, type ProgressoMeta } from "@/lib/metricas";
import { permissoes, rotuloPapel } from "@/lib/papeis";
import type { Alerta, GruposTarefas } from "@/lib/inicio";
import type { Conteudo, Papel, Story, Tarefa } from "@/lib/tipos/database";

export interface InicioProps {
  empresa: { id: string; nome: string };
  usuario: { id: string; nome: string | null };
  papel: Papel;
  hoje: string;
  alertas: Alerta[];
  conteudos: Conteudo[];
  stories: Story[];
  tarefas: GruposTarefas;
  membros: Record<string, string>;
  indicadores: { atual: Periodo | null; anterior: Periodo | null };
  metas: ProgressoMeta[];
  ultimaSugestao: { id: string; semana: string; gerado_em: string; resumo: string; ideias: number } | null;
}

const INDICADORES_INICIO = ["seguidores", "seguidores_liquidos", "visualizacoes", "engajamento"] as const;

export function Inicio(p: InicioProps) {
  const podeEditar = permissoes.podeEditar(p.papel);
  const primeiroNome = p.usuario.nome?.trim().split(/\s+/)[0];
  const dias = Array.from({ length: 7 }, (_, i) => somarDias(p.hoje, i));
  const deHoje = { conteudos: p.conteudos.filter((c) => c.data === p.hoje), stories: p.stories.filter((s) => s.data === p.hoje) };
  const totalTarefas = p.tarefas.atrasadas.length + p.tarefas.hoje.length + p.tarefas.proximas.length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-texto-2">{capitalizar(formatarLonga(p.hoje))}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{primeiroNome ? `Olá, ${primeiroNome}` : p.empresa.nome}</h1>
          {primeiroNome && <p className="mt-1 text-sm text-texto-2">{p.empresa.nome} · você é {rotuloPapel(p.papel)}</p>}
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Link href="/calendario?abrir=gerar-mes" className="inline-flex h-11 items-center gap-2 rounded-xl border border-borda bg-superficie px-4 font-medium hover:bg-superficie-2">
              <Sparkles className="h-5 w-5 text-ia" aria-hidden /> Gerar mês com IA
            </Link>
            <Link href="/calendario?abrir=novo" className="inline-flex h-11 items-center gap-2 rounded-xl bg-primaria px-4 font-medium text-sobre-primaria shadow-sm hover:opacity-90">
              <Plus className="h-5 w-5" aria-hidden /> Novo conteúdo
            </Link>
          </div>
        )}
      </header>

      {p.alertas.length > 0 && (
        <section aria-label="Precisa de atenção" className="grid gap-2 sm:grid-cols-2">
          {p.alertas.map((a) => (
            <Link key={a.chave} href={a.href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition hover:shadow ${tomAlerta[a.tom]}`}>
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              <span className="flex-1 text-texto">{a.texto}</span>
              <span className="shrink-0 whitespace-nowrap text-xs font-medium">{a.acao} <ChevronRight className="inline h-3.5 w-3.5" aria-hidden /></span>
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Coluna principal: hoje + próximos 7 dias */}
        <div className="min-w-0 space-y-6 lg:col-span-3">
          <section className="cartao space-y-3" aria-labelledby="hoje">
            <div className="flex items-center justify-between gap-2">
              <h2 id="hoje" className="text-lg font-semibold">Hoje</h2>
              <Link href={`/calendario?dia=${p.hoje}`} className="text-sm text-primaria hover:underline">Ver o dia</Link>
            </div>
            {deHoje.conteudos.length === 0 && deHoje.stories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">Nada programado para hoje.</p>
            ) : (
              <div className="space-y-2">
                {deHoje.conteudos.map((c) => <ItemConteudo key={c.id} conteudo={c} />)}
                {deHoje.stories.map((s) => <ItemStory key={s.id} story={s} />)}
              </div>
            )}
            {p.tarefas.hoje.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-texto-2">Tarefas com prazo hoje</p>
                <ul className="space-y-1.5">{p.tarefas.hoje.map((t) => <ItemTarefa key={t.id} tarefa={t} empresaId={p.empresa.id} papel={p.papel} usuarioId={p.usuario.id} membros={p.membros} hoje={p.hoje} />)}</ul>
              </div>
            )}
          </section>

          <section className="cartao space-y-3" aria-labelledby="proximos">
            <div className="flex items-center justify-between gap-2">
              <h2 id="proximos" className="text-lg font-semibold">Próximos 7 dias</h2>
              <Link href="/calendario" className="text-sm text-primaria hover:underline">Calendário</Link>
            </div>
            <ol className="divide-y divide-borda">
              {dias.map((d) => {
                const cs = p.conteudos.filter((c) => c.data === d);
                const ss = p.stories.filter((s) => s.data === d);
                return (
                  <li key={d} className="flex gap-3 py-2">
                    <Link href={`/calendario?dia=${d}`} className="w-12 shrink-0 text-center">
                      <span className="sr-only">{capitalizar(formatarLonga(d))}: </span>
                      <span className={`block text-[11px] uppercase ${d === p.hoje ? "text-primaria" : "text-texto-3"}`}>{formatarDiaSemanaCurto(d)}</span>
                      <span className={`block text-lg font-semibold tabular ${d === p.hoje ? "text-primaria" : ""}`}>{d.slice(8)}</span>
                    </Link>
                    <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
                      {cs.length === 0 && ss.length === 0 ? (
                        <p className="text-sm text-texto-3">—</p>
                      ) : (
                        <>
                          {cs.map((c) => <ItemConteudo key={c.id} conteudo={c} compacto />)}
                          {ss.map((s) => <ItemStory key={s.id} story={s} compacto />)}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Coluna lateral: tarefas, indicadores, sugestão */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section className="cartao space-y-3" aria-labelledby="tarefas">
            <div className="flex items-center justify-between gap-2">
              <h2 id="tarefas" className="text-lg font-semibold">Tarefas</h2>
              <Link href="/tarefas" className="text-sm text-primaria hover:underline">Quadro</Link>
            </div>
            {totalTarefas === 0 ? (
              <p className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">Nenhuma tarefa aberta até {formatarCurta(somarDias(p.hoje, 7))}.</p>
            ) : (
              <>
                {p.tarefas.atrasadas.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-atrasado">Atrasadas · {p.tarefas.atrasadas.length}</p>
                    <ul className="space-y-1.5">{p.tarefas.atrasadas.slice(0, 6).map((t) => <ItemTarefa key={t.id} tarefa={t} empresaId={p.empresa.id} papel={p.papel} usuarioId={p.usuario.id} membros={p.membros} hoje={p.hoje} />)}</ul>
                    {p.tarefas.atrasadas.length > 6 && <Link href="/tarefas?filtro=atrasadas" className="mt-1 block text-xs text-primaria hover:underline">Ver todas as {p.tarefas.atrasadas.length}</Link>}
                  </div>
                )}
                {p.tarefas.proximas.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-texto-2">Próximos 7 dias · {p.tarefas.proximas.length}</p>
                    <ul className="space-y-1.5">{p.tarefas.proximas.slice(0, 8).map((t) => <ItemTarefa key={t.id} tarefa={t} empresaId={p.empresa.id} papel={p.papel} usuarioId={p.usuario.id} membros={p.membros} hoje={p.hoje} />)}</ul>
                    {p.tarefas.proximas.length > 8 && <Link href="/tarefas?filtro=semana" className="mt-1 block text-xs text-primaria hover:underline">Ver todas</Link>}
                  </div>
                )}
                {p.tarefas.hoje.length > 0 && p.tarefas.atrasadas.length === 0 && p.tarefas.proximas.length === 0 && (
                  <p className="text-sm text-texto-2">As tarefas de hoje estão na seção “Hoje”.</p>
                )}
              </>
            )}
          </section>

          <section className="cartao space-y-3" aria-labelledby="indicadores">
            <div className="flex items-center justify-between gap-2">
              <h2 id="indicadores" className="text-lg font-semibold">Última semana completa</h2>
              <Link href="/painel" className="text-sm text-primaria hover:underline">Painel</Link>
            </div>
            {p.indicadores.atual ? (
              <>
                <p className="text-xs text-texto-2">{p.indicadores.atual.rotuloLongo} · comparada com a anterior</p>
                <div className="grid grid-cols-2 gap-2">
                  {INDICADORES.filter((i) => (INDICADORES_INICIO as readonly string[]).includes(i.chave)).map((ind) => {
                    const v = variacao(ind.chave, p.indicadores.atual, p.indicadores.anterior);
                    const dif = formatarDiferenca(v, ind.tipo);
                    const positivo = (v.diferenca ?? 0) > 0, negativo = (v.diferenca ?? 0) < 0;
                    return (
                      <div key={ind.chave} className="rounded-xl bg-superficie-2 p-2.5">
                        <p className="text-xs text-texto-2">{ind.rotulo}</p>
                        <p className={`font-semibold tabular ${v.valor == null ? "text-sm text-texto-3" : "text-xl"}`}>{formatarNumero(v.valor, ind.tipo)}</p>
                        {dif && (
                          <p className={`flex items-center gap-1 text-xs tabular ${positivo ? "text-real" : negativo ? "text-atrasado" : "text-texto-3"}`}>
                            {positivo ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : negativo ? <ArrowDownRight className="h-3.5 w-3.5" aria-hidden /> : <Minus className="h-3.5 w-3.5" aria-hidden />}
                            {dif}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">
                Nenhuma semana completa registrada. {podeEditar && <Link href="/painel?abrir=registrar" className="text-primaria hover:underline">Registrar métricas</Link>}
              </p>
            )}
            {p.metas.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-texto-2">Metas de {formatarMesAno(p.hoje)}</p>
                <ul className="space-y-2">
                  {p.metas.slice(0, 3).map((m) => {
                    const pct = m.progresso == null ? 0 : Math.min(1, Math.max(0, m.progresso));
                    return (
                      <li key={m.chave}>
                        <div className="flex justify-between gap-2 text-xs"><span>{m.rotulo}</span><span className="tabular text-texto-2">{formatarNumero(m.valor, m.tipo)} / {formatarNumero(m.meta, m.tipo)}</span></div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-superficie-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={m.rotulo}>
                          <div className={`h-full rounded-full ${m.progresso == null ? "bg-borda" : pct >= 1 ? "bg-real" : "bg-primaria"}`} style={{ width: `${m.progresso == null ? 0 : pct * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-ia/40 bg-ia/10 p-4 sm:p-5" aria-labelledby="sugestao">
            <div className="flex items-center justify-between gap-2">
              <h2 id="sugestao" className="flex items-center gap-2 text-lg font-semibold text-ia"><Lightbulb className="h-5 w-5" aria-hidden /> Sugestões</h2>
              <Link href="/sugestoes" className="text-sm text-ia hover:underline">Ver todas</Link>
            </div>
            {p.ultimaSugestao ? (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-texto-2">Semana de {rotuloSemana(p.ultimaSugestao.semana)} · {p.ultimaSugestao.ideias} {p.ultimaSugestao.ideias === 1 ? "ideia" : "ideias"}</p>
                <p className="line-clamp-4 text-sm">{p.ultimaSugestao.resumo}</p>
                <Selo tom="ia">Sugestão da IA</Selo>
              </div>
            ) : (
              <p className="mt-2 text-sm text-texto-2">Nenhuma sugestão gerada ainda.{podeEditar && <> <Link href="/sugestoes" className="text-ia underline">Gerar para a próxima semana</Link>.</>}</p>
            )}
          </section>
        </div>
      </div>

      <nav aria-label="Atalhos" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { href: "/calendario", rotulo: "Calendário", Icone: CalendarDays },
          { href: "/tarefas", rotulo: "Tarefas", Icone: Check },
          { href: "/painel", rotulo: "Painel", Icone: BarChart3 },
          { href: "/sugestoes", rotulo: "Sugestões", Icone: Lightbulb },
        ].map((a) => (
          <Link key={a.href} href={a.href} className="flex items-center gap-2 rounded-xl border border-borda bg-superficie px-3 py-2.5 text-sm font-medium hover:bg-superficie-2">
            <a.Icone className="h-4 w-4 text-primaria" aria-hidden /> {a.rotulo}
          </Link>
        ))}
      </nav>
    </div>
  );
}

const tomAlerta: Record<Alerta["tom"], string> = {
  atrasado: "border-atrasado/40 bg-atrasado/10 text-atrasado",
  ia: "border-ia/40 bg-ia/10 text-ia",
  manual: "border-manual/40 bg-manual/10 text-manual",
  neutro: "border-borda bg-superficie text-texto-2",
};

function ItemConteudo({ conteudo: c, compacto = false }: { conteudo: Conteudo; compacto?: boolean }) {
  const Icone = ICONE_FORMATO[c.formato];
  const st = STATUS[c.status];
  return (
    <div>
      <Link href={`/calendario?dia=${c.data}&abrir=${c.id}`} className={`flex items-center gap-2 rounded-xl border border-borda bg-superficie text-sm transition hover:border-primaria/60 ${compacto ? "px-2.5 py-1.5" : "p-3"} ${c.status === "sugestao" ? "border-dashed border-ia/50" : ""}`}>
        {redeDe(c) === "linkedin" ? <SeloLinkedin /> : <Icone className="h-4 w-4 shrink-0 text-texto-2" aria-hidden />}
        {c.hora && <span className={`shrink-0 text-xs tabular text-texto-2 ${compacto ? "hidden sm:inline" : ""}`}>{horaCurta(c.hora)}</span>}
        <span className="min-w-0 flex-1 break-words font-medium line-clamp-2">{c.tema || <span className="text-texto-3">{rotuloFormato(c.formato, redeDe(c))} sem tema</span>}</span>
        <Selo tom={st.tom} className="shrink-0">{st.rotulo}</Selo>
      </Link>
    </div>
  );
}

function ItemStory({ story: s, compacto = false }: { story: Story; compacto?: boolean }) {
  const Icone = ICONE_FORMATO.Stories;
  const st = STATUS[s.status];
  const n = Array.isArray(s.telas) ? s.telas.length : 0;
  return (
    <div>
      <Link href={`/calendario?dia=${s.data}`} className={`flex items-center gap-2 rounded-xl border border-borda bg-superficie-2 text-sm transition hover:border-primaria/60 ${compacto ? "px-2.5 py-1.5" : "p-3"} ${s.status === "sugestao" ? "border-dashed border-ia/50" : ""}`}>
        <Icone className="h-4 w-4 shrink-0 text-texto-2" aria-hidden />
        <span className="min-w-0 flex-1 break-words line-clamp-2">Stories · {n} {n === 1 ? "tela" : "telas"}{s.objetivo ? ` · ${s.objetivo}` : ""}</span>
        <Selo tom={st.tom} className="shrink-0">{st.rotulo}</Selo>
      </Link>
    </div>
  );
}

function ItemTarefa({ tarefa: t, empresaId, papel, usuarioId, membros, hoje }: { tarefa: Tarefa; empresaId: string; papel: Papel; usuarioId: string; membros: Record<string, string>; hoje: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [feita, setFeita] = useState(false);
  const podeConcluir = permissoes.podeEditar(papel) || (permissoes.podeColaborar(papel) && t.responsavel_id === usuarioId);
  const atrasada = !!t.prazo && t.prazo < hoje;

  function concluir() {
    setErro(null);
    iniciar(async () => {
      const r = await mudarStatusTarefa(empresaId, t.id, "concluido");
      if (!r.ok) return setErro(r.erro);
      setFeita(true);
      router.refresh();
    });
  }

  if (feita) return null;
  return (
    <li className="rounded-xl border border-borda bg-superficie px-2.5 py-2 text-sm">
      <div className="flex items-start gap-2">
        {podeConcluir ? (
          <Botao variante="fantasma" tamanho="sm" className="!h-7 !w-7 shrink-0 !p-0" carregando={pendente} onClick={concluir} aria-label={`Concluir ${t.titulo}`}>
            {!pendente && <span className="block h-4 w-4 rounded border border-borda" aria-hidden />}
          </Botao>
        ) : (
          <span className="mt-1.5 block h-4 w-4 shrink-0 rounded border border-borda opacity-50" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/tarefas?abrir=${t.id}`} className="block truncate font-medium hover:underline">{t.titulo}</Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-texto-2">
            {t.prazo && <span className={`tabular ${atrasada ? "font-medium text-atrasado" : ""}`}>{atrasada ? "Atrasada · " : ""}{formatarCurta(t.prazo)}</span>}
            <Selo tom={PRIORIDADE_TOM[t.prioridade]}>{t.prioridade}</Selo>
            {t.responsavel_id && <span className="truncate">{membros[t.responsavel_id] ?? "Membro"}</span>}
          </p>
        </div>
      </div>
      {erro && <div className="mt-1.5"><Aviso tipo="erro">{erro}</Aviso></div>}
    </li>
  );
}
