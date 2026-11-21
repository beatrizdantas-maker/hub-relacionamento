"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CalendarClock, ExternalLink, Send, Trash2, Upload, XCircle } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { agendarPublicacao, cancelarPublicacao, salvarArquivos } from "@/app/(app)/calendario/acoes";
import { ACEITA_IMAGEM, ACEITA_VIDEO, apagarMidias, enviarMidia, validarMidia } from "@/lib/midias";
import { ROTULO_STATUS_PUBLICACAO, arquivosEsperados, problemasPublicacao, type ArquivoPublicacao, type StatusPublicacao } from "@/lib/publicacao";
import { formatarCurta, horaCurta } from "@/lib/datas";
import { redeDe, rotuloRede } from "@/lib/redes";
import type { Conteudo } from "@/lib/tipos/database";

const TOM_STATUS: Record<StatusPublicacao, "primaria" | "ia" | "real" | "atrasado"> = { agendado: "primaria", processando: "ia", publicado: "real", erro: "atrasado" };

/**
 * Quadro "Publicação" do post: arquivos prontos (imagem/vídeo), agendar para o
 * robô publicar sozinho no dia e hora do post, ou publicar agora.
 * Usa o que está SALVO no post (legenda, data e hora).
 */
export function PublicacaoConteudo({ empresaId, conteudo, conectada, podeEditar, alteracoesNaoSalvas }: {
  empresaId: string; conteudo: Conteudo; conectada: boolean; podeEditar: boolean; alteracoesNaoSalvas: boolean;
}) {
  const router = useRouter();
  const rede = redeDe(conteudo);
  const esperado = arquivosEsperados(rede, conteudo.formato);
  const [arquivos, setArquivos] = useState<ArquivoPublicacao[]>(Array.isArray(conteudo.arquivos) ? conteudo.arquivos : []);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const entrada = useRef<HTMLInputElement>(null);

  const status = (conteudo.publicacao_status ?? null) as StatusPublicacao | null;
  const travado = status === "processando" || status === "publicado";
  const problemas = problemasPublicacao(rede, conteudo.formato, arquivos, conteudo.legenda ?? "");
  const quando = `${formatarCurta(conteudo.data)}${conteudo.hora ? ` às ${horaCurta(conteudo.hora)}` : " às 09:00"}`;

  async function guardar(lista: ArquivoPublicacao[]) {
    const r = await salvarArquivos(empresaId, conteudo.id, lista);
    if (!r.ok) throw new Error(r.erro);
    setArquivos(r.arquivos);
    router.refresh();
  }

  async function escolher(lista: FileList | null) {
    if (!lista?.length || !esperado) return;
    setErro(null); setAviso(null);
    const novos = Array.from(lista);
    const invalido = novos.map(validarMidia).find(Boolean);
    if (invalido) return setErro(invalido);
    const enviados: ArquivoPublicacao[] = [];
    try {
      for (const [i, f] of novos.entries()) {
        setEnviando(novos.length > 1 ? `Enviando ${i + 1} de ${novos.length}…` : "Enviando…");
        enviados.push(await enviarMidia(empresaId, conteudo.id, f));
      }
      // Um formato de 1 arquivo troca o anterior; o carrossel soma.
      const substitui = esperado.max === 1;
      const antigos = substitui ? arquivos : [];
      await guardar(substitui ? enviados.slice(-1) : [...arquivos, ...enviados]);
      await apagarMidias([...antigos.map((a) => a.caminho), ...(substitui ? enviados.slice(0, -1).map((a) => a.caminho) : [])]);
      setAviso(enviados.length > 1 ? `${enviados.length} arquivos enviados.` : "Arquivo enviado.");
    } catch (e) {
      await apagarMidias(enviados.map((a) => a.caminho));
      setErro(e instanceof Error ? e.message : "Não foi possível enviar.");
    } finally {
      setEnviando(null);
      if (entrada.current) entrada.current.value = "";
    }
  }

  function remover(a: ArquivoPublicacao) {
    setErro(null); setAviso(null);
    iniciar(async () => {
      try {
        await guardar(arquivos.filter((x) => x.caminho !== a.caminho));
        await apagarMidias([a.caminho]);
      } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível remover."); }
    });
  }

  function mover(i: number, delta: number) {
    const lista = [...arquivos];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    iniciar(async () => { try { await guardar(lista); } catch (e) { setErro(e instanceof Error ? e.message : "Não foi possível mudar a ordem."); } });
  }

  function agendar() {
    setErro(null); setAviso(null);
    iniciar(async () => {
      const r = await agendarPublicacao(empresaId, conteudo.id);
      if (!r.ok) return setErro(r.erro);
      setAviso(`Agendado: sai sozinho no ${rotuloRede(rede)} em ${quando}.`);
      router.refresh();
    });
  }

  function cancelar() {
    setErro(null); setAviso(null);
    iniciar(async () => {
      const r = await cancelarPublicacao(empresaId, conteudo.id);
      if (!r.ok) return setErro(r.erro);
      setAviso("Agendamento cancelado.");
      router.refresh();
    });
  }

  async function publicarAgora() {
    setErro(null); setAviso(null); setPublicando(true);
    try {
      const r = await fetch("/api/publicacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao: "publicar_agora", empresaId, conteudoId: conteudo.id }) });
      const corpo = (await r.json().catch(() => ({}))) as { estado?: string; erro?: string; link?: string | null };
      if (!r.ok) setErro(corpo.erro ?? `Erro ${r.status} ao publicar.`);
      else if (corpo.estado === "publicado") setAviso(`Publicado no ${rotuloRede(rede)}!`);
      else if (corpo.estado === "processando") setAviso(`O ${rotuloRede(rede)} está processando o vídeo. Em alguns minutos o post sai sozinho; não precisa fazer mais nada.`);
      else if (corpo.erro) setErro(corpo.erro);
      router.refresh();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setPublicando(false);
    }
  }

  if (!esperado) {
    return (
      <section aria-label="Publicação" className="space-y-1 rounded-xl border border-borda p-3 text-sm">
        <h3 className="font-semibold">Publicação</h3>
        <p className="text-texto-2">{problemas[0] ?? "Este formato é publicado à mão."}</p>
      </section>
    );
  }

  return (
    <section aria-label="Publicação" className="space-y-3 rounded-xl border border-borda p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Send className="h-4 w-4" aria-hidden /> Publicação no {rotuloRede(rede)}</h3>
        {status && <Selo tom={TOM_STATUS[status]}>{status === "agendado" ? `Agendado · ${quando}` : ROTULO_STATUS_PUBLICACAO[status]}</Selo>}
      </div>

      {status === "publicado" && (
        <p className="text-sm">
          Publicado{conteudo.publicado_em ? ` em ${new Date(conteudo.publicado_em).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}.
          {conteudo.publicacao_link && <> <a href={conteudo.publicacao_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primaria underline-offset-2 hover:underline">Ver o post <ExternalLink className="h-3.5 w-3.5" aria-hidden /></a></>}
        </p>
      )}
      {status === "processando" && <p className="text-sm text-texto-2">O {rotuloRede(rede)} está processando o arquivo. O robô confere a cada 5 minutos e publica assim que ficar pronto.</p>}
      {status === "erro" && conteudo.publicacao_erro && <Aviso tipo="erro">Não publicou: {conteudo.publicacao_erro}</Aviso>}
      {status !== "erro" && status !== "publicado" && conteudo.publicacao_erro && <p className="text-xs text-manual">Última tentativa falhou, o robô vai tentar de novo: {conteudo.publicacao_erro}</p>}

      {!travado && (
        <>
          <p className="text-xs text-texto-2">{esperado.ajuda}</p>
          {arquivos.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {arquivos.map((a, i) => (
                <li key={a.caminho} className="space-y-1 rounded-lg border border-borda p-1.5">
                  {a.tipo === "video" ? (
                    <video src={a.url} controls preload="metadata" className="aspect-[9/16] w-full rounded bg-superficie-2 object-contain" aria-label={`Vídeo ${a.nome ?? ""}`} />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={`Imagem ${i + 1}${a.nome ? `: ${a.nome}` : ""}`} className="aspect-square w-full rounded bg-superficie-2 object-cover" />
                  )}
                  {podeEditar && (
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs tabular text-texto-3">{arquivos.length > 1 ? `${i + 1}º` : ""}</span>
                      <div className="flex gap-0.5">
                        {esperado.max > 1 && <button type="button" onClick={() => mover(i, -1)} disabled={i === 0 || pendente} className="rounded p-1 hover:bg-superficie-2 disabled:opacity-40" aria-label={`Mover a imagem ${i + 1} para antes`}><ArrowUp className="h-4 w-4" aria-hidden /></button>}
                        {esperado.max > 1 && <button type="button" onClick={() => mover(i, 1)} disabled={i === arquivos.length - 1 || pendente} className="rounded p-1 hover:bg-superficie-2 disabled:opacity-40" aria-label={`Mover a imagem ${i + 1} para depois`}><ArrowDown className="h-4 w-4" aria-hidden /></button>}
                        <button type="button" onClick={() => remover(a)} disabled={pendente} className="rounded p-1 text-atrasado hover:bg-atrasado/10" aria-label={`Remover ${a.tipo === "video" ? "o vídeo" : `a imagem ${i + 1}`}`}><Trash2 className="h-4 w-4" aria-hidden /></button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {podeEditar && (arquivos.length < esperado.max || esperado.max === 1) && (
            <div>
              <input
                ref={entrada}
                id={`midia-${conteudo.id}`}
                type="file"
                className="sr-only"
                accept={esperado.aceita.includes("video") ? ACEITA_VIDEO : ACEITA_IMAGEM}
                multiple={esperado.max > 1}
                onChange={(e) => escolher(e.target.files)}
                disabled={enviando !== null}
              />
              <label htmlFor={`midia-${conteudo.id}`} className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl border border-borda bg-superficie px-3 text-sm font-medium hover:bg-superficie-2 ${enviando ? "pointer-events-none opacity-60" : ""}`}>
                <Upload className="h-4 w-4" aria-hidden />
                {enviando ?? (arquivos.length && esperado.max === 1 ? "Trocar arquivo" : esperado.aceita.includes("video") ? "Enviar vídeo" : esperado.max > 1 ? "Enviar imagens" : "Enviar imagem")}
              </label>
            </div>
          )}
        </>
      )}

      {podeEditar && !travado && (
        <div className="space-y-2 border-t border-borda pt-3">
          {!conectada ? (
            <Aviso tipo="info">Para publicar sozinho, o Dono conecta o {rotuloRede(rede)} em <Link href="/marca" className="font-medium underline">Marca → Publicação</Link>.</Aviso>
          ) : problemas.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-texto-2" aria-label="O que falta para publicar">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>
          ) : alteracoesNaoSalvas ? (
            <p className="text-xs text-manual">A publicação usa o que está salvo. Clique em Salvar antes de agendar.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {status === "agendado" ? (
              <Botao type="button" tamanho="sm" variante="secundaria" onClick={cancelar} disabled={pendente || publicando}><XCircle className="h-4 w-4" aria-hidden /> Cancelar agendamento</Botao>
            ) : (
              <Botao type="button" tamanho="sm" onClick={agendar} disabled={!conectada || problemas.length > 0 || alteracoesNaoSalvas || pendente || publicando}>
                <CalendarClock className="h-4 w-4" aria-hidden /> {status === "erro" ? "Agendar de novo" : `Agendar para ${quando}`}
              </Botao>
            )}
            <Botao type="button" tamanho="sm" variante="secundaria" onClick={publicarAgora} carregando={publicando} disabled={!conectada || problemas.length > 0 || alteracoesNaoSalvas || pendente}>
              <Send className="h-4 w-4" aria-hidden /> Publicar agora
            </Botao>
          </div>
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
    </section>
  );
}
