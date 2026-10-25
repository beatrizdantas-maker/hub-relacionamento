"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, Copy, Plus, Sparkles } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { capitalizar, diasDaSemana, formatarCurta, formatarDiaSemanaCurto, formatarLonga, horaCurta, rotuloSemana, somarDias } from "@/lib/datas";
import { permissoes } from "@/lib/papeis";
import { aprovarSugestoesDaSemana } from "@/app/(app)/calendario/acoes";
import type { Conteudo, Papel, RitmoDia, Story, Tarefa } from "@/lib/tipos/database";
import { CartaoConteudo, CartaoStories } from "./Cartoes";
import { EditorConteudo } from "./EditorConteudo";
import { EditorStories } from "./EditorStories";
import { GerarMes } from "./GerarMes";
import { FILTROS, ICONE_FORMATO, ORIGEM, STATUS, rotuloFiltro, type Filtro } from "./rotulos";

type Selecao = { tipo: "conteudo"; id: string } | { tipo: "novo"; data: string } | { tipo: "story"; id: string } | { tipo: "novoStory"; data: string } | { tipo: "gerarMes" } | null;

export interface CalendarioProps {
  empresa: { id: string; nome: string; fuso: string; pilares: string[]; ritmo: RitmoDia[] };
  papel: Papel;
  usuarioId: string;
  hoje: string;
  segunda: string;
  dia: string | null;
  filtro: string;
  abrir: string | null;
  iaConfigurada: boolean;
  conteudos: Conteudo[];
  stories: Story[];
  tarefas: Tarefa[];
  campanhas: { id: string; nome: string }[];
}

export function Calendario(p: CalendarioProps) {
  const router = useRouter();
  const podeEditar = permissoes.podeEditar(p.papel);
  const filtro: Filtro = (FILTROS as readonly string[]).includes(p.filtro) ? (p.filtro as Filtro) : "todos";
  const [selecao, setSelecao] = useState<Selecao>(() => {
    if (p.abrir === "novo") return { tipo: "novo", data: p.dia ?? p.hoje };
    if (p.abrir === "gerar-mes") return { tipo: "gerarMes" };
    if (p.abrir && p.conteudos.some((c) => c.id === p.abrir)) return { tipo: "conteudo", id: p.abrir };
    return null;
  });
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const fechar = useCallback(() => setSelecao(null), []);

  const dias = useMemo(() => diasDaSemana(p.segunda), [p.segunda]);
  const conteudosVisiveis = filtro === "Stories" ? [] : p.conteudos.filter((c) => filtro === "todos" || c.formato === filtro);
  const storiesVisiveis = filtro === "todos" || filtro === "Stories" ? p.stories : [];
  const sugestoes = p.conteudos.filter((c) => c.status === "sugestao").length + p.stories.filter((s) => s.status === "sugestao").length;

  const url = (q: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const base: Record<string, string | null> = { semana: p.segunda, dia: p.dia, formato: filtro === "todos" ? null : filtro, ...q };
    for (const [k, v] of Object.entries(base)) if (v) sp.set(k, v);
    const s = sp.toString();
    return `/calendario${s ? `?${s}` : ""}`;
  };

  function aprovarTodas() {
    setErro(null); setMensagem(null);
    iniciar(async () => {
      const r = await aprovarSugestoesDaSemana(p.empresa.id, p.segunda);
      if (!r.ok) return setErro(r.erro);
      setMensagem(r.aprovados ? `${r.aprovados} ${r.aprovados === 1 ? "sugestão aprovada" : "sugestões aprovadas"}` : "Nenhuma sugestão pendente nesta semana");
      router.refresh();
    });
  }

  const conteudoSelecionado = selecao?.tipo === "conteudo" ? p.conteudos.find((c) => c.id === selecao.id) ?? null : null;
  const storySelecionado = selecao?.tipo === "story" ? p.stories.find((s) => s.id === selecao.id) ?? null : null;
  const dataEditor = selecao?.tipo === "novo" || selecao?.tipo === "novoStory" ? selecao.data : conteudoSelecionado?.data ?? storySelecionado?.data ?? p.hoje;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendário</h1>
          <p className="mt-1 text-sm text-texto-2">{p.dia ? capitalizar(formatarLonga(p.dia)) : rotuloSemana(p.segunda)}</p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundaria" onClick={() => setSelecao({ tipo: "gerarMes" })}>
              <Sparkles className="h-5 w-5 text-ia" aria-hidden /> Gerar mês com IA
            </Botao>
            <Botao onClick={() => setSelecao({ tipo: "novo", data: p.dia ?? (p.hoje >= p.segunda && p.hoje <= somarDias(p.segunda, 6) ? p.hoje : p.segunda) })}>
              <Plus className="h-5 w-5" aria-hidden /> Novo conteúdo
            </Botao>
          </div>
        )}
      </header>

      {/* Navegação */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1">
          <Link href={url(p.dia ? { dia: somarDias(p.dia, -1), semana: null } : { semana: somarDias(p.segunda, -7) })} className="rounded-lg p-2 hover:bg-superficie-2" aria-label={p.dia ? "Dia anterior" : "Semana anterior"}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={url({ semana: null, dia: p.dia ? p.hoje : null })} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-superficie-2">{p.dia ? "Hoje" : "Esta semana"}</Link>
          <Link href={url(p.dia ? { dia: somarDias(p.dia, 1), semana: null } : { semana: somarDias(p.segunda, 7) })} className="rounded-lg p-2 hover:bg-superficie-2" aria-label={p.dia ? "Próximo dia" : "Próxima semana"}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1" role="group" aria-label="Visão">
          <Link href={url({ dia: null })} aria-current={!p.dia ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!p.dia ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>Semana</Link>
          <Link href={url({ dia: p.dia ?? (p.hoje >= p.segunda && p.hoje <= somarDias(p.segunda, 6) ? p.hoje : p.segunda) })} aria-current={p.dia ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${p.dia ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>Dia</Link>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por formato">
          {FILTROS.map((f) => (
            <Link key={f} href={url({ formato: f === "todos" ? null : f })} aria-current={filtro === f ? "true" : undefined} className={`rounded-full border px-3 py-1 text-xs font-medium ${filtro === f ? "border-primaria bg-primaria/10 text-primaria" : "border-borda text-texto-2 hover:bg-superficie-2"}`}>
              {rotuloFiltro(f)}
            </Link>
          ))}
        </div>
        {podeEditar && sugestoes > 0 && !p.dia && (
          <Botao variante="secundaria" tamanho="sm" carregando={pendente} onClick={aprovarTodas} className="ml-auto">
            <Sparkles className="h-4 w-4 text-ia" aria-hidden /> Aprovar as {sugestoes} sugestões da semana
          </Botao>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {mensagem && <Aviso tipo="sucesso">{mensagem}</Aviso>}

      {p.dia ? (
        <VisaoDia
          dia={p.dia} hoje={p.hoje} conteudos={conteudosVisiveis.filter((c) => c.data === p.dia)} stories={storiesVisiveis.filter((s) => s.data === p.dia)}
          tarefas={p.tarefas} podeEditar={podeEditar} onAbrir={setSelecao}
        />
      ) : (
        <VisaoSemana dias={dias} hoje={p.hoje} conteudos={conteudosVisiveis} stories={storiesVisiveis} podeEditar={podeEditar} filtro={filtro} onAbrir={setSelecao} urlDia={(d) => url({ dia: d })} />
      )}

      {(selecao?.tipo === "conteudo" || selecao?.tipo === "novo") && (
        <EditorConteudo
          key={selecao.tipo === "conteudo" ? selecao.id : `novo-${selecao.data}`}
          empresaId={p.empresa.id}
          conteudo={conteudoSelecionado}
          dataInicial={dataEditor}
          ritmo={p.empresa.ritmo}
          pilares={p.empresa.pilares}
          campanhas={p.campanhas}
          tarefas={conteudoSelecionado ? p.tarefas.filter((t) => t.conteudo_id === conteudoSelecionado.id) : []}
          papel={p.papel}
          usuarioId={p.usuarioId}
          hoje={p.hoje}
          onFechar={fechar}
        />
      )}
      {selecao?.tipo === "gerarMes" && (
        <GerarMes empresaId={p.empresa.id} hoje={p.hoje} ritmo={p.empresa.ritmo} iaConfigurada={p.iaConfigurada} onFechar={fechar} />
      )}
      {(selecao?.tipo === "story" || selecao?.tipo === "novoStory") && (
        <EditorStories
          key={selecao.tipo === "story" ? selecao.id : `novo-${selecao.data}`}
          empresaId={p.empresa.id}
          story={storySelecionado}
          dataInicial={dataEditor}
          conteudosDoDia={p.conteudos.filter((c) => c.data === dataEditor)}
          papel={p.papel}
          onFechar={fechar}
        />
      )}
    </div>
  );
}

// ---------- Semana ----------

function VisaoSemana({
  dias, hoje, conteudos, stories, podeEditar, filtro, onAbrir, urlDia,
}: { dias: string[]; hoje: string; conteudos: Conteudo[]; stories: Story[]; podeEditar: boolean; filtro: Filtro; onAbrir: (s: Selecao) => void; urlDia: (d: string) => string }) {
  const vazio = conteudos.length === 0 && stories.length === 0;
  return (
    <div className="space-y-3">
      {vazio && (
        <div className="cartao border-dashed text-center text-sm text-texto-2">
          {filtro === "todos" ? "Nada programado nesta semana." : `Nenhum item de ${rotuloFiltro(filtro)} nesta semana.`}{" "}
          {podeEditar && "Clique em “Adicionar conteúdo” num dia ou gere o mês com a IA pelo botão “Gerar mês com IA”."}
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-7 md:gap-2">
        {dias.map((d) => {
          const doDia = conteudos.filter((c) => c.data === d);
          const stDoDia = stories.filter((s) => s.data === d);
          const ehHoje = d === hoje;
          const passado = d < hoje;
          return (
            <section key={d} aria-label={formatarLonga(d)} className={`flex flex-col gap-2 rounded-2xl border p-2 ${ehHoje ? "border-primaria/60 bg-primaria/5" : "border-borda bg-superficie/50"} ${passado ? "border-dashed" : ""}`}>
              <Link href={urlDia(d)} className="flex items-baseline justify-between gap-1 rounded-lg px-1 py-0.5 hover:bg-superficie-2">
                <span className={`text-xs font-semibold uppercase ${ehHoje ? "text-primaria" : "text-texto-2"}`}>{formatarDiaSemanaCurto(d)}</span>
                <span className={`text-sm font-semibold tabular ${ehHoje ? "text-primaria" : ""}`}>{formatarCurta(d)}</span>
              </Link>
              {doDia.map((c) => <CartaoConteudo key={c.id} conteudo={c} onAbrir={() => onAbrir({ tipo: "conteudo", id: c.id })} />)}
              {stDoDia.map((s) => <CartaoStories key={s.id} story={s} onAbrir={() => onAbrir({ tipo: "story", id: s.id })} />)}
              {podeEditar && (
                <div className="mt-auto flex flex-wrap gap-1 pt-1">
                  {doDia.length === 0 && filtro !== "Stories" && (
                    <button type="button" onClick={() => onAbrir({ tipo: "novo", data: d })} className="flex-1 rounded-lg border border-dashed border-borda px-2 py-1.5 text-xs text-texto-2 hover:border-primaria hover:text-primaria">
                      + Adicionar conteúdo
                    </button>
                  )}
                  {stDoDia.length === 0 && filtro !== "Reels" && filtro !== "Carrossel" && filtro !== "Estático" && (
                    <button type="button" onClick={() => onAbrir({ tipo: "novoStory", data: d })} className="flex-1 rounded-lg border border-dashed border-borda px-2 py-1.5 text-xs text-texto-2 hover:border-primaria hover:text-primaria">
                      + Stories
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Dia ----------

function VisaoDia({ dia, hoje, conteudos, stories, tarefas, podeEditar, onAbrir }: { dia: string; hoje: string; conteudos: Conteudo[]; stories: Story[]; tarefas: Tarefa[]; podeEditar: boolean; onAbrir: (s: Selecao) => void }) {
  const [copiado, setCopiado] = useState<string | null>(null);
  async function copiar(id: string, texto: string) {
    try { await navigator.clipboard.writeText(texto); setCopiado(id); setTimeout(() => setCopiado(null), 2000); } catch {}
  }
  if (conteudos.length === 0 && stories.length === 0) {
    return (
      <div className="cartao space-y-3 border-dashed text-center">
        <CalendarDays className="mx-auto h-8 w-8 text-texto-3" aria-hidden />
        <p className="text-sm text-texto-2">Nada programado para {formatarCurta(dia)}.</p>
        {podeEditar && (
          <div className="flex flex-wrap justify-center gap-2">
            <Botao tamanho="sm" onClick={() => onAbrir({ tipo: "novo", data: dia })}>Adicionar conteúdo</Botao>
            <Botao tamanho="sm" variante="secundaria" onClick={() => onAbrir({ tipo: "novoStory", data: dia })}>Adicionar stories</Botao>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {conteudos.map((c) => {
        const Icone = ICONE_FORMATO[c.formato];
        const tarefasDele = tarefas.filter((t) => t.conteudo_id === c.id);
        const abertas = tarefasDele.filter((t) => t.status !== "concluido");
        return (
          <article key={c.id} className="cartao space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm text-texto-2"><Icone className="h-4 w-4" aria-hidden /> {c.formato}{c.hora && <span className="tabular">· {horaCurta(c.hora)}</span>}{c.pilar && <span>· {c.pilar}</span>}</div>
                <h2 className="text-xl font-semibold">{c.tema || "Sem tema"}</h2>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Selo tom={STATUS[c.status].tom}>{STATUS[c.status].rotulo}</Selo>
                  <Selo tom={ORIGEM[c.origem].tom}>{ORIGEM[c.origem].rotulo}</Selo>
                  {abertas.length > 0 && <Selo tom={abertas.some((t) => t.prazo && t.prazo < hoje) ? "atrasado" : "neutro"}>{abertas.length} {abertas.length === 1 ? "tarefa aberta" : "tarefas abertas"}</Selo>}
                </div>
              </div>
              <Botao tamanho="sm" variante="secundaria" onClick={() => onAbrir({ tipo: "conteudo", id: c.id })}>{podeEditar ? "Editar" : "Abrir"}</Botao>
            </div>
            {(c.objetivo || c.cta) && (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                {c.objetivo && <div><dt className="text-xs font-semibold uppercase text-texto-3">Objetivo</dt><dd>{c.objetivo}</dd></div>}
                {c.cta && <div><dt className="text-xs font-semibold uppercase text-texto-3">CTA</dt><dd>{c.cta}</dd></div>}
              </dl>
            )}
            {c.roteiro && <Bloco titulo={c.formato === "Reels" ? "Roteiro" : "Roteiro / slides"} texto={c.roteiro} />}
            {Array.isArray(c.ganchos) && c.ganchos.filter(Boolean).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-texto-3">Ganchos alternativos</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">{c.ganchos.filter(Boolean).map((g, i) => <li key={i}>{g}</li>)}</ul>
              </div>
            )}
            {c.legenda && (
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-texto-3">Legenda</p>
                  <button type="button" onClick={() => copiar(c.id, c.legenda!)} className="inline-flex items-center gap-1 text-xs text-primaria underline-offset-2 hover:underline"><Copy className="h-3.5 w-3.5" aria-hidden /> {copiado === c.id ? "Copiada" : "Copiar legenda"}</button>
                </div>
                <p className="mt-1 whitespace-pre-wrap rounded-xl bg-superficie-2 p-3 text-sm">{c.legenda}</p>
              </div>
            )}
            {c.orientacao_arte && <Bloco titulo="Orientação de arte" texto={c.orientacao_arte} />}
            {c.notas && <Bloco titulo="Notas" texto={c.notas} />}
          </article>
        );
      })}

      {stories.map((s) => (
        <article key={s.id} className="cartao space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-texto-2"><ICONE_FORMATO.Stories className="h-4 w-4" aria-hidden /> Stories</div>
              <h2 className="text-xl font-semibold">{s.objetivo || "Sequência de stories"}</h2>
              <div className="mt-1 flex flex-wrap gap-1">
                <Selo tom={STATUS[s.status].tom}>{STATUS[s.status].rotulo}</Selo>
                <Selo tom={ORIGEM[s.origem].tom}>{ORIGEM[s.origem].rotulo}</Selo>
              </div>
            </div>
            <Botao tamanho="sm" variante="secundaria" onClick={() => onAbrir({ tipo: "story", id: s.id })}>{podeEditar ? "Editar" : "Abrir"}</Botao>
          </div>
          <ol className="space-y-2">
            {(Array.isArray(s.telas) ? s.telas : []).map((t, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-borda p-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primaria/10 text-sm font-semibold text-primaria tabular">{i + 1}</span>
                <div className="min-w-0 text-sm">
                  <p className="text-xs font-semibold uppercase text-texto-3">{t.tipo}</p>
                  {t.texto && <p className="whitespace-pre-wrap">{t.texto}</p>}
                  {t.interacao?.pergunta && <p className="mt-1 font-medium">{t.interacao.pergunta}</p>}
                  {t.interacao?.opcoes?.filter(Boolean).length ? <p className="text-texto-2">Opções: {t.interacao.opcoes.filter(Boolean).join(" · ")}</p> : null}
                  {t.interacao?.emoji && <p className="text-texto-2">Emoji: {t.interacao.emoji}</p>}
                  {t.interacao?.url && <p className="truncate text-texto-2">{t.interacao.url}</p>}
                </div>
              </li>
            ))}
          </ol>
        </article>
      ))}

      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Botao tamanho="sm" variante="secundaria" onClick={() => onAbrir({ tipo: "novo", data: dia })}><Plus className="h-4 w-4" aria-hidden /> Conteúdo neste dia</Botao>
          {stories.length === 0 && <Botao tamanho="sm" variante="secundaria" onClick={() => onAbrir({ tipo: "novoStory", data: dia })}><Plus className="h-4 w-4" aria-hidden /> Stories neste dia</Botao>}
        </div>
      )}
    </div>
  );
}

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-texto-3">{titulo}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm">{texto}</p>
    </div>
  );
}
