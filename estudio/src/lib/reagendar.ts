/**
 * Reagendamento: quando a data de um conteúdo muda, as tarefas abertas
 * ligadas a ele deslocam o prazo pela mesma quantidade de dias, nunca para
 * antes de hoje. Tarefas concluídas e sem prazo ficam como estão.
 */
import { diasEntre, somarDias, type DataISO } from "./datas";

export interface TarefaReagendavel { id: string; prazo: DataISO | null; status: string }

export function deslocarPrazos(tarefas: TarefaReagendavel[], dataAnterior: DataISO, dataNova: DataISO, hoje: DataISO): { id: string; prazo: DataISO }[] {
  const delta = diasEntre(dataAnterior, dataNova);
  if (delta === 0) return [];
  const saida: { id: string; prazo: DataISO }[] = [];
  for (const t of tarefas) {
    if (!t.prazo || t.status === "concluido") continue;
    const novo = somarDias(t.prazo, delta);
    saida.push({ id: t.id, prazo: novo < hoje ? hoje : novo });
  }
  return saida;
}
