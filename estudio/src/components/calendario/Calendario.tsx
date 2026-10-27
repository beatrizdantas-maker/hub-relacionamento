"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCopy, Copy, MessageSquareText, Plus, Sparkles } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { capitalizar, diasDaSemana, formatarCurta, formatarDiaSemanaCurto, formatarLonga, formatarMesAno, gradeDoMes, horaCurta, inicioDaSemana, mesDaData, primeiroDiaDoMes, rotuloSemana, somarDias, somarMeses } from "@/lib/datas";
import { copiarTexto, textoDasArtes, textoDasFalas } from "@/lib/copiarArtes";
import { permissoes } from "@/lib/papeis";
import { aprovarSugestoesDaSemana } from "@/app/(app)/calendario/acoes";
import type { Conteudo, Papel, Rede, RitmoDia, Story, Tarefa } from "@/lib/tipos/database";
import { redeDe, rotuloFormato, rotuloRede } from "@/lib/redes";
import { CartaoConteudo, CartaoStories, SeloLinkedin } from "./Cartoes";
import { EditorConteudo } from "./EditorConteudo";
import { EditorStories } from "./EditorStories";
import { GerarMes } from "./GerarMes";
import { FILTROS, ICONE_FORMATO, ORIGEM, REDE_FILTROS, STATUS, filtrosPara, rotuloFiltro, type Filtro, type RedeFiltro } from "./rotulos";

type Selecao = { tipo: "conteudo"; id: string } | { tipo: "novo"; data: string; rede?: Rede } | { tipo: "story"; id: string } | { tipo: "novoStory"; data: string } | { tipo: "gerarMes" } | null;

export interface CalendarioProps {
  empresa: { id: string; nome: string; fuso: string; pilares: string[]; ritmo: RitmoDia[]; ritmoLinkedin: RitmoDia[] | null };
  papel: Papel;
  usuarioId: string;
  hoje: string;
  segunda: string;
  dia: string | null;
  mes: string | null;   // "AAAA-MM" quando a visão é por mês
  filtro: string;
  rede: string;          // "todas" | "instagram" | "linkedin"
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
  const temLinkedin = p.empresa.ritmoLinkedin !== null;
  const redeFiltro: RedeFiltro = temLinkedin && (REDE_FILTROS as readonly string[]).includes(p.rede) ? (p.rede as RedeFiltro) : "todas";
  const redesNaTela: Rede[] = redeFiltro === "todas" ? (temLinkedin ? ["instagram", "linkedin"] : ["instagram"]) : [redeFiltro];
  const filtrosDisponiveis = filtrosPara(redesNaTela);
  const filtro: Filtro = (filtrosDisponiveis as readonly string[]).includes(p.filtro) ? (p.filtro as Filtro) : "todos";
  const redeNova: Rede = redeFiltro === "linkedin" ? "linkedin" : "instagram";
  const [selecao, setSelecao] = useState<Selecao>(() => {
    if (p.abrir === "novo") return { tipo: "novo", data: p.dia ?? p.hoje, rede: redeNova };
    if (p.abrir === "gerar-mes") return { tipo: "gerarMes" };
    if (p.abrir && p.conteudos.some((c) => c.id === p.abrir)) return { tipo: "conteudo", id: p.abrir };
    return null;
  });
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const fechar = useCallback(() => setSelecao(null), []);

  const dias = useMemo(() => diasDaSemana(p.segunda), [p.segunda]);
  const daRede = p.conteudos.filter((c) => redesNaTela.includes(redeDe(c)));
  const conteudosVisiveis = filtro === "Stories" ? [] : daRede.filter((c) => filtro === "todos" || c.formato === filtro);
  const storiesVisiveis = redesNaTela.includes("instagram") && (filtro === "todos" || filtro === "Stories") ? p.stories : [];
  const sugestoes = p.conteudos.filter((c) => c.status === "sugestao").length + p.stories.filter((s) => s.status === "sugestao").length;

  const url = (q: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    const base: Record<string, string | null> = { semana: p.mes || p.dia ? null : p.segunda, dia: p.dia, mes: p.mes, formato: filtro === "todos" ? null : filtro, rede: redeFiltro === "todas" ? null : redeFiltro, ...q };
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

  // Alvos de navegação entre as visões
  const semanaAtual = p.hoje >= p.segunda && p.hoje <= somarDias(p.segunda, 6);
  const mesAlvo = p.mes ?? mesDaData(p.dia ?? (semanaAtual ? p.hoje : p.segunda));
  const hojeNoMes = p.mes ? mesDaData(p.hoje) === p.mes : false;
  const diaAlvo = p.dia ?? (p.mes ? (hojeNoMes ? p.hoje : primeiroDiaDoMes(p.mes)) : semanaAtual ? p.hoje : p.segunda);
  const semanaAlvo = inicioDaSemana(diaAlvo);
  const periodoTexto = p.mes ? capitalizar(formatarMesAno(primeiroDiaDoMes(p.mes))) : p.dia ? capitalizar(formatarLonga(p.dia)) : rotuloSemana(p.segunda);
  const [copiando, setCopiando] = useState<"artes" | "falas" | null>(null);

  async function copiar(tipo: "artes" | "falas") {
    setErro(null); setMensagem(null);
    setCopiando(tipo);
    const doPeriodo = p.mes ? daRede.filter((c) => mesDaData(c.data) === p.mes) : daRede;
    const opcoes = { empresa: redeFiltro === "todas" ? p.empresa.nome : `${p.empresa.nome} · ${rotuloRede(redeFiltro)}`, periodo: p.mes ? periodoTexto : `Semana de ${rotuloSemana(p.segunda)}` };
    const { texto, total } = tipo === "artes" ? textoDasArtes(doPeriodo, opcoes) : textoDasFalas(doPeriodo, opcoes);
    const noPeriodo = p.mes ? "neste mês" : "nesta semana";
    if (total === 0) {
      setCopiando(null);
      return setMensagem(tipo === "artes" ? `Nenhuma postagem com imagem para produzir ${noPeriodo}.` : `Nenhum vídeo para gravar ${noPeriodo}.`);
    }
    const ok = await copiarTexto(texto);
    setCopiando(null);
    if (!ok) return setErro("O navegador não deixou copiar. Tente de novo ou use outro navegador.");
    setMensagem(tipo === "artes"
      ? `${total} ${total === 1 ? "postagem copiada" : "postagens copiadas"} com slides e orientação de arte. Cole no WhatsApp, e-mail ou documento.`
      : `Falas de ${total} ${total === 1 ? "vídeo copiadas" : "vídeos copiadas"}. Cole no celular para gravar.`);
  }

  const conteudoSelecionado = selecao?.tipo === "conteudo" ? p.conteudos.find((c) => c.id === selecao.id) ?? null : null;
  const storySelecionado = selecao?.tipo === "story" ? p.stories.find((s) => s.id === selecao.id) ?? null : null;
  const dataEditor = selecao?.tipo === "novo" || selecao?.tipo === "novoStory" ? selecao.data : conteudoSelecionado?.data ?? storySelecionado?.data ?? p.hoje;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Calendário</h1>
          <p className="mt-1 text-sm text-texto-2">{periodoTexto}</p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Botao variante="secundaria" onClick={() => setSelecao({ tipo: "gerarMes" })}>
              <Sparkles className="h-5 w-5 text-ia" aria-hidden /> Gerar mês com IA
            </Botao>
            <Botao onClick={() => setSelecao({ tipo: "novo", data: diaAlvo, rede: redeNova })}>
              <Plus className="h-5 w-5" aria-hidden /> Novo conteúdo
            </Botao>
          </div>
        )}
      </header>

      {/* Navegação */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1">
          <Link href={url(p.mes ? { mes: somarMeses(p.mes, -1) } : p.dia ? { dia: somarDias(p.dia, -1), semana: null } : { semana: somarDias(p.segunda, -7) })} className="rounded-lg p-2 hover:bg-superficie-2" aria-label={p.mes ? "Mês anterior" : p.dia ? "Dia anterior" : "Semana anterior"}>
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
          <Link href={url(p.mes ? { mes: mesDaData(p.hoje) } : { semana: null, dia: p.dia ? p.hoje : null })} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-superficie-2">{p.mes ? "Este mês" : p.dia ? "Hoje" : "Esta semana"}</Link>
          <Link href={url(p.mes ? { mes: somarMeses(p.mes, 1) } : p.dia ? { dia: somarDias(p.dia, 1), semana: null } : { semana: somarDias(p.segunda, 7) })} className="rounded-lg p-2 hover:bg-superficie-2" aria-label={p.mes ? "Próximo mês" : p.dia ? "Próximo dia" : "Próxima semana"}>
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1" role="group" aria-label="Visão">
          <Link href={url({ dia: null, mes: null, semana: semanaAlvo })} aria-current={!p.dia && !p.mes ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${!p.dia && !p.mes ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>Semana</Link>
          <Link href={url({ mes: null, semana: null, dia: diaAlvo })} aria-current={p.dia ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${p.dia ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>Dia</Link>
          <Link href={url({ dia: null, semana: null, mes: mesAlvo })} aria-current={p.mes ? "page" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${p.mes ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>Mês</Link>
        </div>
        {temLinkedin && (
          <div className="flex items-center gap-1 rounded-xl border border-borda bg-superficie p-1" role="group" aria-label="Rede">
            {REDE_FILTROS.map((r) => (
              <Link key={r} href={url({ rede: r === "todas" ? null : r, formato: null })} aria-current={redeFiltro === r ? "true" : undefined} className={`rounded-lg px-3 py-1.5 text-sm font-medium ${redeFiltro === r ? "bg-primaria/10 text-primaria" : "hover:bg-superficie-2"}`}>
                {r === "todas" ? "Todas" : rotuloRede(r)}
              </Link>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por formato">
          {filtrosDisponiveis.map((f) => (
            <Link key={f} href={url({ formato: f === "todos" ? null : f })} aria-current={filtro === f ? "true" : undefined} className={`rounded-full border px-3 py-1 text-xs font-medium ${filtro === f ? "border-primaria bg-primaria/10 text-primaria" : "border-borda text-texto-2 hover:bg-superficie-2"}`}>
              {rotuloFiltro(f)}
            </Link>
          ))}
        </div>
        {!p.dia && (
          <div className="flex flex-wrap gap-2 md:ml-auto">
            <Botao variante="secundaria" tamanho="sm" carregando={copiando === "artes"} disabled={copiando !== null} onClick={() => copiar("artes")}>
              <ClipboardCopy className="h-4 w-4" aria-hidden /> Copiar artes {p.mes ? "do mês" : "da semana"}
            </Botao>
            <Botao variante="secundaria" tamanho="sm" carregando={copiando === "falas"} disabled={copiando !== null} onClick={() => copiar("falas")}>
              <MessageSquareText className="h-4 w-4" aria-hidden /> Copiar falas {p.mes ? "do mês" : "da semana"}
            </Botao>
            {podeEditar && sugestoes > 0 && !p.mes && (
              <Botao variante="secundaria" tamanho="sm" carregando={pendente} onClick={aprovarTodas}>
                <Sparkles className="h-4 w-4 text-ia" aria-hidden /> Aprovar as {sugestoes} sugestões da semana
              </Botao>
            )}
          </div>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {mensagem && <Aviso tipo="sucesso">{mensagem}</Aviso>}

      {p.mes ? (
        <VisaoMes mes={p.mes} hoje={p.hoje} redesNaTela={redesNaTela} conteudos={conteudosVisiveis} stories={storiesVisiveis} filtro={filtro} onAbrir={setSelecao} urlDia={(d) => url({ mes: null, dia: d })} />
      ) : p.dia ? (
        <VisaoDia
          dia={p.dia} hoje={p.hoje} conteudos={conteudosVisiveis.filter((c) => c.data === p.dia)} stories={storiesVisiveis.filter((s) => s.data === p.dia)}
          tarefas={p.tarefas} podeEditar={podeEditar} redesNaTela={redesNaTela} onAbrir={setSelecao}
        />
      ) : (
        <VisaoSemana dias={dias} hoje={p.hoje} redesNaTela={redesNaTela} conteudos={conteudosVisiveis} stories={storiesVisiveis} podeEditar={podeEditar} filtro={filtro} onAbrir={setSelecao} urlDia={(d) => url({ dia: d, semana: null })} />
      )}

      {(selecao?.tipo === "conteudo" || selecao?.tipo === "novo") && (
        <EditorConteudo
          key={selecao.tipo === "conteudo" ? selecao.id : `novo-${selecao.data}-${selecao.rede}`}
          empresaId={p.empresa.id}
          conteudo={conteudoSelecionado}
          dataInicial={dataEditor}
          ritmo={p.empresa.ritmo}
          ritmoLinkedin={p.empresa.ritmoLinkedin}
          redeInicial={selecao.tipo === "novo" ? selecao.rede : undefined}
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
        <GerarMes empresaId={p.empresa.id} hoje={p.hoje} ritmo={p.empresa.ritmo} ritmoLinkedin={p.empresa.ritmoLinkedin} redeInicial={redeNova} iaConfigurada={p.iaConfigurada} onFechar={fechar} />
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
  dias, hoje, redesNaTela, conteudos, stories, podeEditar, filtro, onAbrir, urlDia,
}: { dias: string[]; hoje: string; redesNaTela: Rede[]; conteudos: Conteudo[]; stories: Story[]; podeEditar: boolean; filtro: Filtro; onAbrir: (s: Selecao) => void; urlDia: (d: string) => string }) {
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
                  {filtro !== "Stories" && redesNaTela.filter((r) => !doDia.some((c) => redeDe(c) === r)).map((r) => (
                    <button key={r} type="button" onClick={() => onAbrir({ tipo: "novo", data: d, rede: r })} className="flex-1 rounded-lg border border-dashed border-borda px-2 py-1.5 text-xs text-texto-2 hover:border-primaria hover:text-primaria">
                      + {redesNaTela.length > 1 ? rotuloRede(r) : "Adicionar conteúdo"}
                    </button>
                  ))}
                  {stDoDia.length === 0 && redesNaTela.includes("instagram") && (filtro === "todos" || filtro === "Stories") && (
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

// ---------- Mês ----------

const DIAS_CABECALHO = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function ItemMes({ conteudo: c, onAbrir }: { conteudo: Conteudo; onAbrir: () => void }) {
  const Icone = ICONE_FORMATO[c.formato];
  return (
    <button
      type="button"
      onClick={onAbrir}
      className={`flex w-full items-center gap-1 rounded-md border bg-superficie px-1.5 py-1 text-left text-xs hover:border-primaria/60 ${c.status === "sugestao" ? "border-dashed border-ia/60" : "border-borda"}`}
    >
      {redeDe(c) === "linkedin" ? <SeloLinkedin /> : <Icone className="h-3.5 w-3.5 shrink-0 text-texto-2" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{c.tema || rotuloFormato(c.formato, redeDe(c))}</span>
      <span className="sr-only"> · {rotuloFormato(c.formato, redeDe(c))} · {STATUS[c.status].rotulo}</span>
    </button>
  );
}

function VisaoMes({
  mes, hoje, redesNaTela, conteudos, stories, filtro, onAbrir, urlDia,
}: { mes: string; hoje: string; redesNaTela: Rede[]; conteudos: Conteudo[]; stories: Story[]; filtro: Filtro; onAbrir: (s: Selecao) => void; urlDia: (d: string) => string }) {
  const grade = useMemo(() => gradeDoMes(mes), [mes]);
  const doMes = conteudos.filter((c) => mesDaData(c.data) === mes);
  const storiesDoMes = stories.filter((s) => mesDaData(s.data) === mes);
  const diasComItens = grade.flat().filter((d) => mesDaData(d) === mes && (doMes.some((c) => c.data === d) || storiesDoMes.some((s) => s.data === d)));

  return (
    <div className="space-y-3">
      <p className="text-sm text-texto-2 tabular">
        {doMes.length} {doMes.length === 1 ? "postagem" : "postagens"} no mês
        {doMes.length > 0 && redesNaTela.length > 1 && ` · ${redesNaTela.map((r) => `${doMes.filter((c) => redeDe(c) === r).length} no ${rotuloRede(r)}`).join(" · ")}`}
        {doMes.length > 0 && redesNaTela.length === 1 && ` · ${FILTROS.filter((f): f is Exclude<Filtro, "todos" | "Stories"> => f !== "todos" && f !== "Stories").map((f) => [f, doMes.filter((c) => c.formato === f).length] as const).filter(([, n]) => n > 0).map(([f, n]) => `${n} ${rotuloFormato(f, redesNaTela[0])}`).join(" · ")}`}
      </p>

      {/* Computador: grade do mês */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1 pb-1" aria-hidden>
          {DIAS_CABECALHO.map((d) => <span key={d} className="px-1 text-xs font-semibold uppercase text-texto-2">{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grade.flat().map((d) => {
            const fora = mesDaData(d) !== mes;
            const doDia = fora ? [] : doMes.filter((c) => c.data === d);
            const stDoDia = fora ? [] : storiesDoMes.filter((s) => s.data === d);
            const ehHoje = d === hoje;
            const mostrar = doDia.slice(0, 3);
            const resto = doDia.length - mostrar.length;
            return (
              <section key={d} aria-label={formatarLonga(d)} className={`flex min-h-[112px] flex-col gap-1 rounded-xl border p-1.5 ${ehHoje ? "border-primaria/60 bg-primaria/5" : fora ? "border-transparent bg-superficie-2/40" : "border-borda bg-superficie/50"}`}>
                <Link href={urlDia(d)} className={`self-start rounded-md px-1 text-sm font-semibold tabular hover:bg-superficie-2 ${ehHoje ? "text-primaria" : fora ? "text-texto-3" : ""}`}>
                  {Number(d.slice(8))}
                </Link>
                {mostrar.map((c) => <ItemMes key={c.id} conteudo={c} onAbrir={() => onAbrir({ tipo: "conteudo", id: c.id })} />)}
                {resto > 0 && <Link href={urlDia(d)} className="px-1 text-xs text-primaria hover:underline">+{resto} {resto === 1 ? "outro" : "outros"}</Link>}
                {stDoDia.map((st) => (
                  <button key={st.id} type="button" onClick={() => onAbrir({ tipo: "story", id: st.id })} className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-xs text-texto-2 hover:bg-superficie-2 ${st.status === "sugestao" ? "border border-dashed border-ia/60" : ""}`}>
                    <ICONE_FORMATO.Stories className="h-3.5 w-3.5 shrink-0" aria-hidden /> Stories
                    <span className="sr-only"> · {STATUS[st.status].rotulo}</span>
                  </button>
                ))}
              </section>
            );
          })}
        </div>
      </div>

      {/* Celular: lista dos dias com postagem */}
      <div className="space-y-3 md:hidden">
        {diasComItens.length === 0 ? (
          <div className="cartao border-dashed text-center text-sm text-texto-2">
            {filtro === "todos" ? "Nada programado neste mês." : `Nenhum item de ${rotuloFiltro(filtro)} neste mês.`}
          </div>
        ) : (
          diasComItens.map((d) => (
            <section key={d} aria-label={formatarLonga(d)} className={`space-y-2 rounded-2xl border p-2 ${d === hoje ? "border-primaria/60 bg-primaria/5" : "border-borda bg-superficie/50"}`}>
              <Link href={urlDia(d)} className="flex items-baseline justify-between gap-1 rounded-lg px-1 py-0.5 hover:bg-superficie-2">
                <span className={`text-xs font-semibold uppercase ${d === hoje ? "text-primaria" : "text-texto-2"}`}>{formatarDiaSemanaCurto(d)}</span>
                <span className={`text-sm font-semibold tabular ${d === hoje ? "text-primaria" : ""}`}>{formatarCurta(d)}</span>
              </Link>
              {doMes.filter((c) => c.data === d).map((c) => <CartaoConteudo key={c.id} conteudo={c} onAbrir={() => onAbrir({ tipo: "conteudo", id: c.id })} />)}
              {storiesDoMes.filter((s) => s.data === d).map((s) => <CartaoStories key={s.id} story={s} onAbrir={() => onAbrir({ tipo: "story", id: s.id })} />)}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Dia ----------

function VisaoDia({ dia, hoje, conteudos, stories, tarefas, podeEditar, redesNaTela, onAbrir }: { dia: string; hoje: string; conteudos: Conteudo[]; stories: Story[]; tarefas: Tarefa[]; podeEditar: boolean; redesNaTela: Rede[]; onAbrir: (s: Selecao) => void }) {
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
            {redesNaTela.map((r) => (
              <Botao key={r} tamanho="sm" onClick={() => onAbrir({ tipo: "novo", data: dia, rede: r })}>{redesNaTela.length > 1 ? `Adicionar no ${rotuloRede(r)}` : "Adicionar conteúdo"}</Botao>
            ))}
            {redesNaTela.includes("instagram") && <Botao tamanho="sm" variante="secundaria" onClick={() => onAbrir({ tipo: "novoStory", data: dia })}>Adicionar stories</Botao>}
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
                <div className="flex items-center gap-1.5 text-sm text-texto-2">{redeDe(c) === "linkedin" && <SeloLinkedin comNome />}<Icone className="h-4 w-4" aria-hidden /> {rotuloFormato(c.formato, redeDe(c))}{c.hora && <span className="tabular">· {horaCurta(c.hora)}</span>}{c.pilar && <span>· {c.pilar}</span>}</div>
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
