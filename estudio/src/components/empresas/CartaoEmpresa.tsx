"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2, Users } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Selo } from "@/components/ui/Selo";
import { Aviso } from "@/components/ui/Aviso";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { rotuloPapel } from "@/lib/papeis";
import { arquivarEmpresa, definirEmpresaAtiva, excluirEmpresa } from "@/app/(app)/empresas/acoes";
import type { EmpresaDoUsuario } from "@/lib/contexto";
import { LogoEmpresa } from "./LogoEmpresa";

export function CartaoEmpresa({ empresa, ativa }: { empresa: EmpresaDoUsuario; ativa: boolean }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState<"arquivar" | "excluir" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const dono = empresa.papel === "dono";

  function rodar(acao: () => Promise<{ ok: boolean; erro?: string }>) {
    setErro(null);
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) setErro(r.erro ?? "Algo deu errado.");
      setConfirmando(null);
      router.refresh();
    });
  }

  return (
    <li className={`cartao space-y-3 ${empresa.arquivada ? "opacity-75" : ""}`} style={{ borderTopColor: empresa.cor_primaria, borderTopWidth: 4 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <LogoEmpresa nome={empresa.nome} logoUrl={empresa.logo_url} cor={empresa.cor_primaria} tamanho={44} />
          <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{empresa.nome}</h2>
          <p className="truncate text-sm text-texto-2">{empresa.perfil_instagram ? `@${empresa.perfil_instagram}` : "Sem perfil informado"}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Selo tom="neutro">{rotuloPapel(empresa.papel)}</Selo>
          {ativa && <Selo tom="primaria">Ativa</Selo>}
          {empresa.arquivada && <Selo tom="manual">Arquivada</Selo>}
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {confirmando === "arquivar" && (
        <Confirmacao
          titulo={`Arquivar ${empresa.nome}?`}
          descricao="Ela sai do seletor e das telas, mas nada é apagado. Dá para reativar depois."
          rotuloConfirmar="Arquivar"
          perigo={false}
          carregando={pendente}
          onConfirmar={() => rodar(() => arquivarEmpresa(empresa.id, true))}
          onCancelar={() => setConfirmando(null)}
        />
      )}
      {confirmando === "excluir" && (
        <Confirmacao
          titulo={`Excluir ${empresa.nome} para sempre?`}
          descricao="Apaga calendário, tarefas, métricas e sugestões desta empresa. Não tem volta."
          rotuloConfirmar="Excluir tudo"
          carregando={pendente}
          onConfirmar={() => rodar(() => excluirEmpresa(empresa.id))}
          onCancelar={() => setConfirmando(null)}
        />
      )}

      {!confirmando && (
        <div className="flex flex-wrap gap-2">
          {!empresa.arquivada && !ativa && (
            <Botao tamanho="sm" carregando={pendente} onClick={() => rodar(() => definirEmpresaAtiva(empresa.id))}>Abrir</Botao>
          )}
          {!empresa.arquivada && (empresa.papel === "dono" || empresa.papel === "editor") && (
            <Link href={`/empresas/${empresa.id}/editar`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-borda px-3 text-sm font-medium hover:bg-superficie-2">
              <Pencil className="h-4 w-4" aria-hidden /> Editar
            </Link>
          )}
          <Link href={`/empresas/${empresa.id}/membros`} className="inline-flex h-9 items-center gap-1 rounded-xl border border-borda px-3 text-sm font-medium hover:bg-superficie-2">
            <Users className="h-4 w-4" aria-hidden /> Equipe
          </Link>
          {dono && !empresa.arquivada && (
            <Botao tamanho="sm" variante="secundaria" onClick={() => setConfirmando("arquivar")} disabled={pendente}>
              <Archive className="h-4 w-4" aria-hidden /> Arquivar
            </Botao>
          )}
          {dono && empresa.arquivada && (
            <Botao tamanho="sm" variante="secundaria" carregando={pendente} onClick={() => rodar(() => arquivarEmpresa(empresa.id, false))}>
              <ArchiveRestore className="h-4 w-4" aria-hidden /> Reativar
            </Botao>
          )}
          {dono && (
            <Botao tamanho="sm" variante="fantasma" className="text-atrasado" onClick={() => setConfirmando("excluir")} disabled={pendente}>
              <Trash2 className="h-4 w-4" aria-hidden /> Excluir
            </Botao>
          )}
        </div>
      )}
    </li>
  );
}
