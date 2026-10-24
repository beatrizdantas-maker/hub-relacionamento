import { addDays, differenceInCalendarDays, format, parseISO, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

/** Datas de calendário são strings "AAAA-MM-DD" no fuso da empresa. */
export type DataISO = string;

export const FUSO_PADRAO = "America/Sao_Paulo";

export function hojeNaEmpresa(fuso: string = FUSO_PADRAO): DataISO {
  try {
    return formatInTimeZone(new Date(), fuso, "yyyy-MM-dd");
  } catch {
    return formatInTimeZone(new Date(), FUSO_PADRAO, "yyyy-MM-dd");
  }
}

export const ehDataISO = (s: string | null | undefined): s is DataISO => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());

/** Segunda-feira da semana que contém a data. */
export function inicioDaSemana(data: DataISO): DataISO {
  return format(startOfWeek(parseISO(data), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

export function somarDias(data: DataISO, dias: number): DataISO {
  return format(addDays(parseISO(data), dias), "yyyy-MM-dd");
}

export function diasEntre(a: DataISO, b: DataISO): number {
  return differenceInCalendarDays(parseISO(b), parseISO(a));
}

/** 1 = segunda … 7 = domingo */
export function diaDaSemana(data: DataISO): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const d = parseISO(data).getDay(); // 0 = domingo
  return (d === 0 ? 7 : d) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function diasDaSemana(segunda: DataISO): DataISO[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segunda, i));
}

export const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const formatarCurta = (data: DataISO) => format(parseISO(data), "dd/MM");
export const formatarLonga = (data: DataISO) => format(parseISO(data), "EEEE, d 'de' MMMM", { locale: ptBR });
export const formatarDiaSemanaCurto = (data: DataISO) => format(parseISO(data), "EEE", { locale: ptBR }).replace(".", "");
export const formatarMesAno = (data: DataISO) => format(parseISO(data), "MMMM 'de' yyyy", { locale: ptBR });

export function rotuloSemana(segunda: DataISO): string {
  const domingo = somarDias(segunda, 6);
  const a = parseISO(segunda), b = parseISO(domingo);
  if (a.getMonth() === b.getMonth()) return `${format(a, "d")} a ${format(b, "d 'de' MMMM", { locale: ptBR })}`;
  return `${format(a, "d 'de' MMM", { locale: ptBR })} a ${format(b, "d 'de' MMM", { locale: ptBR })}`;
}

/** "20:00:00" → "20:00" */
export const horaCurta = (h: string | null | undefined) => (h ? h.slice(0, 5) : "");
