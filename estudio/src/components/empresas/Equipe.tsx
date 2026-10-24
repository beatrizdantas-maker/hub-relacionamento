"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Mail, UserMinus, X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { PAPEIS, rotuloPapel } from "@/lib/papeis";
import { alterarPapel, atualizarMeuNome, convidarMembro, removerMembro, revogarConvite } from "@/app/(app)/empresas/acoes";
import type { Convite, Membro, Papel } from "@/lib/tipos/database";

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function Equipe({ empresaId, meuId, meuPapel, membros, convites }: { empresaId: string; meuId: string; meuPapel: Papel; membros: Membro[]; convites: Convite[] }) {
  const router = useRouter();
  const souDono = meuPapel === "dono";
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  // Convite
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Papel>("colaborador");
  const [ultimoConvite, setUltimoConvite] = useState<{ link: string; emailEnviado: boolean; email: string } | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Confirmações e nome
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState(false);
  const eu = membros.find((m) => m.user_id === meuId);
  const [nome, setNome] = useState(eu?.nome_exibicao ?? "");
  const totalDonos = membros.filter((m) => m.papel === "dono").length;

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Algo deu errado.");
      else depois?.();
      router.refresh();
    });
  }

  function convidar(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    setUltimoConvite(null);
    iniciar(async () => {
      const r = await convidarMembro(empresaId, { email, papel });
      if (!r.ok) return setErro(r.erro);
      setUltimoConvite({ link: r.link, emailEnviado: r.emailEnviado, email });
      setEmail("");
      router.refresh();
    });
  }

  async function copiar(texto: string, chave: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      setErro("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  }

  const linkDe = (token: string) => `${window.location.origin}/convite/${token}`;

  return (
    <div className="space-y-5">
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {/* Membros */}
      <section className="cartao space-y-3">
        <h2 className="text-lg font-semibold">Membros <span className="text-sm font-normal text-texto-3 tabular">({membros.length})</span></h2>
        <ul className="divide-y divide-borda">
          {membros.map((m) => {
            const souEu = m.user_id === meuId;
            const ultimoDono = m.papel === "dono" && totalDonos <= 1;
            return (
              <li key={m.user_id} className="space-y-2 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {m.nome_exibicao ?? m.email ?? "Membro"} {souEu && <span className="text-xs text-texto-3">(você)</span>}
                    </p>
                    <p className="truncate text-xs text-texto-3">{m.email ?? "e-mail não registrado"} · desde {formatarData(m.convidado_em)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                  {souDono && !ultimoDono ? (
                    <label className="flex items-center gap-2 text-sm">
                      <span className="sr-only">Papel de {m.nome_exibicao ?? m.email}</span>
                      <select className="campo h-9 w-auto py-1 text-sm" value={m.papel} disabled={pendente} onChange={(e) => rodar(() => alterarPapel(empresaId, m.user_id, e.target.value as Papel))}>
                        {PAPEIS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
                      </select>
                    </label>
                  ) : (
                    <Selo tom={m.papel === "dono" ? "primaria" : "neutro"}>{rotuloPapel(m.papel)}</Selo>
                  )}
                  {(souDono || souEu) && !ultimoDono && removendo !== m.user_id && (
                    <Botao tamanho="sm" variante="fantasma" className="text-atrasado" disabled={pendente} onClick={() => setRemovendo(m.user_id)} aria-label={souEu ? "Sair da empresa" : `Remover ${m.nome_exibicao ?? m.email}`}>
                      <UserMinus className="h-4 w-4" aria-hidden /> {souEu ? "Sair" : "Remover"}
                    </Botao>
                  )}
                  </div>
                </div>
                {removendo === m.user_id && (
                  <Confirmacao
                    titulo={souEu ? "Sair desta empresa?" : `Remover ${m.nome_exibicao ?? m.email} da equipe?`}
                    descricao={souEu ? "Você deixa de ver o conteúdo dela. Pode ser convidado(a) de novo depois." : "A pessoa perde o acesso na hora. As tarefas dela continuam, sem responsável."}
                    rotuloConfirmar={souEu ? "Sair" : "Remover"}
                    carregando={pendente}
                    onConfirmar={() => rodar(() => removerMembro(empresaId, m.user_id), () => { if (souEu) router.push("/empresas"); })}
                    onCancelar={() => setRemovendo(null)}
                  />
                )}
                {souEu && ultimoDono && <p className="text-xs text-texto-3">Você é a única pessoa dona. Para sair, promova outra pessoa a Dono antes.</p>}
              </li>
            );
          })}
        </ul>

        {eu && (
          <div className="border-t border-borda pt-3">
            {editandoNome ? (
              <form
                className="flex flex-wrap items-end gap-2"
                onSubmit={(e) => { e.preventDefault(); rodar(() => atualizarMeuNome(empresaId, nome), () => setEditandoNome(false)); }}
              >
                <CampoTexto rotulo="Seu nome nesta equipe" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={80} className="min-w-[200px] flex-1" />
                <Botao type="submit" tamanho="sm" carregando={pendente}>Salvar</Botao>
                <Botao type="button" tamanho="sm" variante="secundaria" onClick={() => setEditandoNome(false)}>Cancelar</Botao>
              </form>
            ) : (
              <button type="button" className="text-sm text-primaria underline-offset-2 hover:underline" onClick={() => setEditandoNome(true)}>Alterar meu nome de exibição</button>
            )}
          </div>
        )}
      </section>

      {/* Convites (só dono) */}
      {souDono && (
        <section className="cartao space-y-4">
          <h2 className="text-lg font-semibold">Convidar por e-mail</h2>
          <form onSubmit={convidar} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <CampoTexto rotulo="E-mail" type="email" required inputMode="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@empresa.com.br" />
            <CampoSelecao rotulo="Papel" value={papel} onChange={(e) => setPapel(e.target.value as Papel)}>
              {PAPEIS.map((p) => <option key={p.valor} value={p.valor}>{p.rotulo}</option>)}
            </CampoSelecao>
            <Botao type="submit" carregando={pendente} disabled={!email.includes("@")}>
              <Mail className="h-4 w-4" aria-hidden /> Convidar
            </Botao>
          </form>
          <p className="text-xs text-texto-3">{PAPEIS.find((p) => p.valor === papel)?.descricao}</p>

          {ultimoConvite && (
            <Aviso tipo={ultimoConvite.emailEnviado ? "sucesso" : "info"}>
              <p>
                {ultimoConvite.emailEnviado
                  ? <>Convite criado e e-mail enviado para <strong>{ultimoConvite.email}</strong>. A pessoa precisa entrar com esse mesmo e-mail.</>
                  : <>Convite criado, mas o e-mail não pôde ser enviado agora. Compartilhe o link abaixo (a pessoa precisa entrar com <strong>{ultimoConvite.email}</strong>).</>}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-superficie-2 px-2 py-1 text-xs">{ultimoConvite.link}</code>
                <Botao tamanho="sm" variante="secundaria" onClick={() => copiar(ultimoConvite.link, "novo")}>
                  {copiado === "novo" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copiado === "novo" ? "Copiado" : "Copiar"}
                </Botao>
              </div>
            </Aviso>
          )}

          {convites.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-texto-2">Convites pendentes</h3>
              <ul className="divide-y divide-borda">
                {convites.map((c) => {
                  const expirado = new Date(c.expira_em) < new Date();
                  return (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.email}</p>
                        <p className="text-xs text-texto-3">{rotuloPapel(c.papel)} · {expirado ? "expirou em" : "expira em"} {formatarData(c.expira_em)}</p>
                      </div>
                      {expirado && <Selo tom="atrasado">Expirado</Selo>}
                      <Botao tamanho="sm" variante="secundaria" onClick={() => copiar(linkDe(c.token), c.id)} aria-label={`Copiar link do convite de ${c.email}`}>
                        {copiado === c.id ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                      </Botao>
                      <Botao tamanho="sm" variante="fantasma" className="text-atrasado" disabled={pendente} onClick={() => rodar(() => revogarConvite(empresaId, c.id))} aria-label={`Revogar convite de ${c.email}`}>
                        <X className="h-4 w-4" aria-hidden />
                      </Botao>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
