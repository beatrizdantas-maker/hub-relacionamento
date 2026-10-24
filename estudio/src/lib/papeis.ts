import type { Papel } from "@/lib/tipos/database";

/** Rótulos e descrições dos papéis (ordem do mais ao menos permissivo). */
export const PAPEIS: { valor: Papel; rotulo: string; descricao: string }[] = [
  { valor: "dono", rotulo: "Dono", descricao: "Tudo, inclusive excluir a empresa, gerenciar membros e integrações." },
  { valor: "editor", rotulo: "Editor", descricao: "Edita marca, calendário, tarefas, métricas e gera sugestões." },
  { valor: "colaborador", rotulo: "Colaborador", descricao: "Vê tudo, muda status, conclui as próprias tarefas e comenta." },
  { valor: "leitor", rotulo: "Leitor", descricao: "Só vê." },
];

export function rotuloPapel(papel: Papel | null | undefined) {
  return PAPEIS.find((p) => p.valor === papel)?.rotulo ?? "—";
}

/** Espelho das funções SQL (pode_editar, pode_colaborar, e_dono) para a interface. */
export const permissoes = {
  eDono: (p: Papel | null | undefined) => p === "dono",
  podeEditar: (p: Papel | null | undefined) => p === "dono" || p === "editor",
  podeColaborar: (p: Papel | null | undefined) => p === "dono" || p === "editor" || p === "colaborador",
};
