/**
 * Plano de geração do mês: quais dias (por semana) a IA deve preencher.
 * Só dias do mês, de hoje em diante, que têm um slot no ritmo semanal.
 */
import { diaDaSemana, inicioDaSemana, somarDias, type DataISO } from "@/lib/datas";
import type { RitmoDia } from "@/lib/tipos/database";

export interface SemanaDoPlano { segunda: DataISO; dias: DataISO[] }

export function ultimoDiaDoMes(mes: string): DataISO {
  const [ano, m] = mes.split("-").map(Number);
  const ultimo = new Date(Date.UTC(ano, m, 0)).getUTCDate();
  return `${mes}-${String(ultimo).padStart(2, "0")}`;
}

/** Mês atual e o seguinte, como "AAAA-MM". */
export function mesesDisponiveis(hoje: DataISO): { valor: string; inicio: DataISO }[] {
  const atual = hoje.slice(0, 7);
  const proximo = somarDias(ultimoDiaDoMes(atual), 1).slice(0, 7);
  return [{ valor: atual, inicio: `${atual}-01` }, { valor: proximo, inicio: `${proximo}-01` }];
}

export function planejarMes(mes: string, hoje: DataISO, ritmo: RitmoDia[], ocupados: Set<DataISO> = new Set()): SemanaDoPlano[] {
  const diasComRitmo = new Set(ritmo.map((r) => r.dia));
  const fim = ultimoDiaDoMes(mes);
  const porSemana = new Map<DataISO, DataISO[]>();
  for (let d = `${mes}-01`; d <= fim; d = somarDias(d, 1)) {
    if (d < hoje) continue;
    if (!diasComRitmo.has(diaDaSemana(d))) continue;
    if (ocupados.has(d)) continue;
    const seg = inicioDaSemana(d);
    porSemana.set(seg, [...(porSemana.get(seg) ?? []), d]);
  }
  return [...porSemana.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([segunda, dias]) => ({ segunda, dias }));
}
