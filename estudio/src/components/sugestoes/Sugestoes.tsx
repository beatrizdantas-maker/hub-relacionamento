"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarPlus, Check, Lightbulb, Sparkles, Trash2, XCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { adicionarIdeiaAoCalendario, excluirSugestao } from "@/app/(app)/sugestoes/acoes";
import { formatarCurta, formatarLonga, capitalizar, rotuloSemana } from "@/lib/datas";
import { permissoes } from "@/lib/papeis";
import type { IdeiaSugestao, Papel, Sugestao } from "@/lib/tipos/database";
import { ICONE_FORMATO } from "@/components/calendario/rotulos";

export interface SugestoesProps {
  empresa: { id: string; nome: string };
  papel: Papel;
  hoje: string;
  proximaSemana: string;
  dadosReais: { vazio: boolean; linhas: string[] };
  sugestoes: Sugestao[];
  iaConfigurada: boolean;
}

type Geracao = { estado: "parado" } | { estado: "pensando"; desde: number } | { estado: "erro"; mensagem: string; detalhes: string[] };

export function Sugestoes(p: SugestoesProps) {
  const router = useRouter();
  const podeEditar = permissoes.podeEditar(p.papel);
  const [geracao, setGeracao] = useState<Geracao>({ estado: "parado" });
  const [sucesso, setSucesso] = useState<string | null>(null);
  const controlador = useRef<AbortController | null>(null);

  useEffect(() => () => controlador.current?.abort(), []);

  async function gerar() {
    setSucesso(null);
    const ac = new AbortController();
    controlador.current = ac;
    setGeracao({ estado: "pensando", desde: Date.now() });
    try {
      const resposta = await fetch("/api/ia/sugestoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: p.empresa.id, semana: p.proximaSemana }),
        signal: ac.signal,
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string; detalhes?: string[]; sugestao?: Sugestao };
      if (!resposta.ok || !corpo.sugestao) {
        setGeracao({ estado: "erro", mensagem: corpo.erro ?? `Erro ${resposta.status} ao gerar.`, detalhes: corpo.detalhes ?? [] });
        return;
      }
      setGeracao({ estado: "parado" });
      setSucesso(`Sugestões para a semana de ${rotuloSemana(corpo.sugestao.semana)} geradas com ${corpo.sugestao.ideias.length} ideias.`);
      router.refresh();
    } catch (e) {
      if ((e as Error).name === "AbortError") setGeracao({ estado: "parado" });
      else setGeracao({ estado: "erro", mensagem: "Não foi possível falar com o servidor. Confira a conexão e tente de novo.", detalhes: [] });
    } finally {
      controlador.current = null;
    }
  }

  function cancelar() {
    controlador.current?.abort();
    setGeracao({ estado: "parado" });
  }

  const pensando = geracao.estado === "pensando";

  return (
    <div className="space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sugestões</h1>
          <p className="mt-1 text-sm text-texto-2">O que os números de {p.empresa.nome} dizem e o que a IA propõe para a semana de {rotuloSemana(p.proximaSemana)}.</p>
        </div>
        {podeEditar && !pensando && (
          <Botao onClick={gerar} disabled={!p.iaConfigurada}>
            <Sparkles className="h-5 w-5" aria-hidden /> Gerar sugestões para a próxima semana
          </Botao>
        )}
      </header>

      {!p.iaConfigurada && podeEditar && (
        <Aviso tipo="erro">A IA ainda não está configurada neste servidor: falta a variável <code className="rounded bg-superficie-2 px-1">ANTHROPIC_API_KEY</code>. Adicione-a nas variáveis de ambiente e faça um novo deploy.</Aviso>
      )}

      <section aria-labelledby="dados-reais" className="rounded-2xl border border-real/40 bg-real/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="dados-reais" className="text-lg font-semibold text-real">Dados reais de agora</h2>
          <Selo tom="real">Dado real · calculado pelo sistema</Selo>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {p.dadosReais.linhas.map((l, i) => (
            <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-real" aria-hidden /><span className="tabular">{l}</span></li>
          ))}
        </ul>
        {p.dadosReais.vazio && (
          <p className="mt-3 text-xs text-texto-2">
            <Link href="/painel?abrir=registrar" className="underline">Registrar métricas no Painel</Link> ou conectar o Metricool em Marca.
          </p>
        )}
      </section>

      {pensando && (
        <div role="status" className="rounded-2xl border border-ia/40 bg-ia/10 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-ia border-t-transparent" aria-hidden />
              <div>
                <p className="font-medium text-ia">Pensando…</p>
                <p className="text-xs text-texto-2">A IA está lendo o perfil da marca, as campanhas, as últimas 8 semanas de métricas, os 15 posts mais recentes e o que já está no calendário. Costuma levar de 30 a 90 segundos.</p>
              </div>
            </div>
            <Botao variante="secundaria" tamanho="sm" onClick={cancelar}><XCircle className="h-4 w-4" aria-hidden /> Cancelar</Botao>
          </div>
        </div>
      )}
      {geracao.estado === "erro" && (
        <Aviso tipo="erro">
          <p>{geracao.mensagem}</p>
          {geracao.detalhes.length > 0 && (
            <ul className="mt-1 list-disc pl-4 text-xs text-texto-2">{geracao.detalhes.slice(0, 6).map((d, i) => <li key={i}>{d}</li>)}</ul>
          )}
        </Aviso>
      )}
      {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}

      {p.sugestoes.length === 0 ? (
        <div className="cartao border-dashed text-center text-sm text-texto-2">
          <Lightbulb className="mx-auto mb-2 h-6 w-6 text-ia" aria-hidden />
          Nenhuma sugestão gerada ainda.{podeEditar ? " Clique em “Gerar sugestões para a próxima semana”." : " Peça a um Editor ou Dono para gerar."}
        </div>
      ) : (
        <div className="space-y-5">
          {p.sugestoes.map((s, n) => (
            <CartaoSugestao key={s.id} sugestao={s} empresaId={p.empresa.id} hoje={p.hoje} podeEditar={podeEditar} recente={n === 0} />
          ))}
        </div>
      )}

      <Legenda />
    </div>
  );
}

function Legenda() {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex justify-center px-4 md:bottom-4 md:left-60">
      <div className="flex items-center gap-4 rounded-full border border-borda bg-superficie/95 px-4 py-1.5 text-xs shadow-md backdrop-blur" aria-label="Legenda de cores">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-real" aria-hidden /> Verde = dado real</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-ia" aria-hidden /> Azul = sugestão da IA</span>
      </div>
    </div>
  );
}

function CartaoSugestao({ sugestao: s, empresaId, hoje, podeEditar, recente }: { sugestao: Sugestao; empresaId: string; hoje: string; podeEditar: boolean; recente: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(recente);
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const geradoEm = new Date(s.gerado_em);
  const ideias = (s.ideias ?? []) as IdeiaSugestao[];

  function excluir() {
    iniciar(async () => {
      const r = await excluirSugestao(empresaId, s.id);
      if (!r.ok) return setErro(r.erro);
      router.refresh();
    });
  }

  return (
    <article className="cartao space-y-4" aria-labelledby={`sug-${s.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={`sug-${s.id}`} className="text-xl font-semibold">Semana de {rotuloSemana(s.semana)}</h2>
          <p className="mt-0.5 text-xs text-texto-3 tabular">Gerado em {formatarCurta(s.gerado_em.slice(0, 10))} às {geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Selo tom="ia">Sugestão da IA</Selo>
          {!recente && (
            <button type="button" onClick={() => setAberto((v) => !v)} className="rounded-lg px-2 py-1 text-xs text-texto-2 hover:bg-superficie-2" aria-expanded={aberto}>
              {aberto ? "Recolher" : "Ver"}
            </button>
          )}
          {podeEditar && (
            <button type="button" onClick={() => setExcluindo(true)} className="rounded-lg p-1.5 text-texto-3 hover:bg-superficie-2 hover:text-atrasado" aria-label="Excluir sugestão">
              <Trash2 className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </div>
      {excluindo && <Confirmacao titulo="Excluir esta sugestão?" descricao="Os conteúdos já adicionados ao calendário continuam lá." rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={excluir} onCancelar={() => setExcluindo(false)} />}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {aberto && (
        <>
          <p className="text-base leading-relaxed">{s.resumo}</p>

          <div className="rounded-xl border border-real/40 bg-real/10 p-3">
            <p className="text-sm font-semibold text-real">Dados reais usados</p>
            <ul className="mt-1.5 space-y-1 text-sm">{s.dados_reais_usados.map((l, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-real" aria-hidden /><span className="tabular">{l}</span></li>)}</ul>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Coluna titulo="Manter" itens={s.manter} />
            <Coluna titulo="Melhorar" itens={s.melhorar} />
            <Coluna titulo="Testar" itens={s.testar} />
          </div>

          <div>
            <h3 className="text-base font-semibold">Ideias para a semana</h3>
            <div className="mt-2 grid gap-3 md:grid-cols-2">
              {ideias.map((i, n) => <CartaoIdeia key={n} ideia={i} indice={n} sugestaoId={s.id} empresaId={empresaId} hoje={hoje} podeEditar={podeEditar} />)}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

function Coluna({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div className="rounded-xl border border-ia/40 bg-ia/10 p-3">
      <p className="text-sm font-semibold text-ia">{titulo}</p>
      {itens.length ? (
        <ul className="mt-1.5 space-y-1.5 text-sm">{itens.map((t, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ia" aria-hidden />{t}</li>)}</ul>
      ) : (
        <p className="mt-1.5 text-xs text-texto-3">Nada aqui.</p>
      )}
    </div>
  );
}

function CartaoIdeia({ ideia, indice, sugestaoId, empresaId, hoje, podeEditar }: { ideia: IdeiaSugestao; indice: number; sugestaoId: string; empresaId: string; hoje: string; podeEditar: boolean }) {
  const router = useRouter();
  const [data, setData] = useState(ideia.dia < hoje ? hoje : ideia.dia);
  const [erro, setErro] = useState<string | null>(null);
  const [feito, setFeito] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const Icone = ICONE_FORMATO[ideia.formato];
  const noCalendario = ideia.conteudo_id ?? feito;

  function adicionar() {
    setErro(null);
    iniciar(async () => {
      const r = await adicionarIdeiaAoCalendario(empresaId, sugestaoId, indice, data);
      if (!r.ok) return setErro(r.erro);
      setFeito(r.conteudoId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-ia/40 bg-ia/5 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Selo tom="ia"><Icone className="h-3 w-3" aria-hidden /> {ideia.formato}</Selo>
        <span className="text-xs text-texto-2">{capitalizar(formatarLonga(ideia.dia))}</span>
      </div>
      <p className="font-semibold">{ideia.titulo}</p>
      <p className="text-sm text-texto-2">{ideia.motivo}</p>
      <details className="text-sm">
        <summary className="cursor-pointer text-ia">Ver legenda e CTA</summary>
        <p className="mt-2 whitespace-pre-wrap">{ideia.legenda}</p>
        <p className="mt-2 text-xs"><span className="font-semibold">CTA:</span> {ideia.cta}</p>
      </details>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="mt-auto flex flex-wrap items-end gap-2">
        {noCalendario ? (
          <Link href={`/calendario?dia=${ideia.dia}&abrir=${noCalendario}`} className="inline-flex items-center gap-1 text-sm text-ia underline"><Check className="h-4 w-4" aria-hidden /> No calendário em {formatarCurta(ideia.dia)}</Link>
        ) : podeEditar ? (
          <>
            <label className="text-xs text-texto-2">
              Data
              <input type="date" value={data} min={hoje} onChange={(e) => setData(e.target.value)} className="campo mt-1 h-9 py-1 text-sm tabular" aria-label={`Data para ${ideia.titulo}`} />
            </label>
            <Botao tamanho="sm" variante="secundaria" carregando={pendente} onClick={adicionar}><CalendarPlus className="h-4 w-4 text-ia" aria-hidden /> Adicionar ao calendário</Botao>
          </>
        ) : null}
      </div>
    </div>
  );
}
