"use client";

import { Botao } from "./Botao";

/**
 * Confirmação dentro da tela (nunca alert/confirm do navegador).
 * Renderize condicionalmente onde a ação acontece.
 */
export function Confirmacao({
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  perigo = true,
  carregando,
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  descricao?: string;
  rotuloConfirmar?: string;
  perigo?: boolean;
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <div role="alertdialog" aria-label={titulo} className="rounded-xl border border-atrasado/40 bg-atrasado/5 p-3">
      <p className="text-sm font-medium">{titulo}</p>
      {descricao && <p className="mt-1 text-xs text-texto-2">{descricao}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Botao tamanho="sm" variante={perigo ? "perigo" : "primaria"} carregando={carregando} onClick={onConfirmar} autoFocus>
          {rotuloConfirmar}
        </Botao>
        <Botao tamanho="sm" variante="secundaria" onClick={onCancelar} disabled={carregando}>
          Cancelar
        </Botao>
      </div>
    </div>
  );
}
