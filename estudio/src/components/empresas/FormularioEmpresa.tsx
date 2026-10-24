"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { CampoArea, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { OBJETIVOS_RITMO, type EntradaEmpresa } from "@/lib/validacao/empresa";
import { criarEmpresa, atualizarEmpresa } from "@/app/(app)/empresas/acoes";
import type { Empresa, FormatoConteudo, Metas, RitmoDia } from "@/lib/tipos/database";

const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const FORMATOS: FormatoConteudo[] = ["Reels", "Carrossel", "Estático"];

export const RITMO_PADRAO: RitmoDia[] = [
  { dia: 1, hora: "12:00", formato: "Carrossel", tipo: "Carrossel salvável", pilar: "", objetivo: "salvamentos" },
  { dia: 2, hora: "20:00", formato: "Reels", tipo: "Reels com a pessoa da marca falando", pilar: "", objetivo: "alcance" },
  { dia: 3, hora: "20:00", formato: "Reels", tipo: "Reels de prova social", pilar: "", objetivo: "direct" },
  { dia: 4, hora: "12:00", formato: "Carrossel", tipo: "Campanha ativa", pilar: "", objetivo: "engajamento" },
  { dia: 5, hora: "19:00", formato: "Carrossel", tipo: "Carrossel de dor do cliente", pilar: "", objetivo: "direct" },
  { dia: 6, hora: "20:00", formato: "Estático", tipo: "Estático de identificação", pilar: "", objetivo: "comentarios" },
  { dia: 7, hora: "20:00", formato: "Reels", tipo: "Reels com texto na tela", pilar: "", objetivo: "compartilhamentos" },
];

const METAS_PADRAO: Metas = {
  visualizacoes_dia: null,
  seguidores_liquidos_mes: null,
  mensagens_mes: null,
  salvamentos_carrossel: null,
  alcance_reels: null,
  engajamento_pct: null,
};

const CAMPOS_METAS: { chave: keyof Metas; rotulo: string; ajuda: string }[] = [
  { chave: "visualizacoes_dia", rotulo: "Visualizações por dia", ajuda: "Média diária" },
  { chave: "seguidores_liquidos_mes", rotulo: "Seguidores líquidos no mês", ajuda: "Ganhos menos perdidos" },
  { chave: "mensagens_mes", rotulo: "Mensagens no direct por mês", ajuda: "Registro manual" },
  { chave: "salvamentos_carrossel", rotulo: "Salvamentos por carrossel", ajuda: "Média por post" },
  { chave: "alcance_reels", rotulo: "Alcance por Reels", ajuda: "Média por Reels" },
  { chave: "engajamento_pct", rotulo: "Engajamento (%)", ajuda: "Interações ÷ alcance dos posts" },
];

type Estado = {
  nome: string;
  perfil_instagram: string;
  sobre: string;
  tom_de_voz: string;
  regras_de_linguagem: string;
  regras_de_imagem: string;
  cor_primaria: string;
  cor_secundaria: string;
  publico: string;
  objetivos: string;
  pilares: string[];
  melhores_horarios: string;
  metas: Record<keyof Metas, string>;
  ritmo_semanal: RitmoDia[];
};

function estadoInicial(e?: Empresa | null): Estado {
  const metas = { ...METAS_PADRAO, ...(e?.metas ?? {}) };
  const ritmo = Array.isArray(e?.ritmo_semanal) && e!.ritmo_semanal.length === 7 ? e!.ritmo_semanal : RITMO_PADRAO;
  return {
    nome: e?.nome ?? "",
    perfil_instagram: e?.perfil_instagram ?? "",
    sobre: e?.sobre ?? "",
    tom_de_voz: e?.tom_de_voz ?? "",
    regras_de_linguagem: e?.regras_de_linguagem ?? "",
    regras_de_imagem: e?.regras_de_imagem ?? "",
    cor_primaria: e?.cor_primaria ?? "#7C3AED",
    cor_secundaria: e?.cor_secundaria ?? "#F59E0B",
    publico: e?.publico ?? "",
    objetivos: e?.objetivos ?? "",
    pilares: e?.pilares ?? [],
    melhores_horarios: e?.melhores_horarios ?? "",
    metas: Object.fromEntries(Object.entries(metas).map(([k, v]) => [k, v == null ? "" : String(v)])) as Record<keyof Metas, string>,
    ritmo_semanal: ritmo.map((r) => ({ ...r })),
  };
}

const PASSOS = ["Dados da marca", "Público e objetivos", "Metas e ritmo semanal"];

/**
 * Assistente de 3 passos para criar uma empresa; também serve para editar
 * (mesmos passos, botão "Salvar").
 */
export function FormularioEmpresa({ empresa }: { empresa?: Empresa | null }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState<Estado>(() => estadoInicial(empresa));
  const [erro, setErro] = useState<string | null>(null);
  const [pilarNovo, setPilarNovo] = useState("");
  const [pendente, iniciar] = useTransition();
  const editando = Boolean(empresa);

  const alterar = <K extends keyof Estado>(k: K, v: Estado[K]) => setDados((d) => ({ ...d, [k]: v }));

  function validarPasso(): string | null {
    if (passo === 0) {
      if (!dados.nome.trim()) return "Informe o nome da empresa.";
      if (!/^#[0-9A-Fa-f]{6}$/.test(dados.cor_primaria) || !/^#[0-9A-Fa-f]{6}$/.test(dados.cor_secundaria)) return "Cores no formato #RRGGBB.";
    }
    return null;
  }

  function avancar() {
    const e = validarPasso();
    if (e) return setErro(e);
    setErro(null);
    setPasso((p) => Math.min(p + 1, PASSOS.length - 1));
  }

  function adicionarPilar() {
    const p = pilarNovo.trim();
    if (!p) return;
    if (dados.pilares.includes(p)) return setPilarNovo("");
    if (dados.pilares.length >= 12) return setErro("No máximo 12 pilares.");
    alterar("pilares", [...dados.pilares, p]);
    setPilarNovo("");
  }

  function teclaPilar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      adicionarPilar();
    }
  }

  function montarEntrada(): EntradaEmpresa {
    return {
      nome: dados.nome,
      perfil_instagram: dados.perfil_instagram,
      sobre: dados.sobre,
      publico: dados.publico,
      objetivos: dados.objetivos,
      tom_de_voz: dados.tom_de_voz,
      regras_de_linguagem: dados.regras_de_linguagem,
      regras_de_imagem: dados.regras_de_imagem,
      melhores_horarios: dados.melhores_horarios,
      pilares: dados.pilares,
      cor_primaria: dados.cor_primaria,
      cor_secundaria: dados.cor_secundaria,
      metas: dados.metas,
      ritmo_semanal: dados.ritmo_semanal,
    };
  }

  function enviar() {
    const e = validarPasso();
    if (e) return setErro(e);
    setErro(null);
    iniciar(async () => {
      const r = editando ? await atualizarEmpresa(empresa!.id, montarEntrada()) : await criarEmpresa(montarEntrada());
      if (!r.ok) return setErro(r.erro);
      router.push(editando ? "/empresas" : "/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Indicador de passos */}
      <ol className="grid grid-cols-3 gap-2" aria-label="Passos">
        {PASSOS.map((p, i) => (
          <li key={p} aria-current={i === passo ? "step" : undefined} className="min-w-0">
            <button
              type="button"
              onClick={() => (i < passo || editando ? setPasso(i) : undefined)}
              className={`w-full rounded-xl border px-2 py-2 text-left text-xs transition ${
                i === passo ? "border-primaria bg-primaria/10 text-primaria" : i < passo || editando ? "border-borda text-texto-2 hover:bg-superficie-2" : "border-borda text-texto-3"
              }`}
            >
              <span className="block font-semibold tabular">Passo {i + 1}</span>
              <span className="block truncate">{p}</span>
            </button>
          </li>
        ))}
      </ol>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="cartao space-y-4">
        {passo === 0 && (
          <>
            <h2 className="text-lg font-semibold">Dados da marca</h2>
            <CampoTexto rotulo="Nome da empresa" required value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} placeholder="Ex.: NARAEDU" maxLength={120} />
            <CampoTexto rotulo="Perfil no Instagram" value={dados.perfil_instagram} onChange={(e) => alterar("perfil_instagram", e.target.value)} placeholder="@perfil" ajuda="Só o @, sem link." />
            <CampoArea rotulo="Sobre a marca" value={dados.sobre} onChange={(e) => alterar("sobre", e.target.value)} placeholder="O que a empresa faz, para quem e o que a diferencia." />
            <CampoArea rotulo="Tom de voz" value={dados.tom_de_voz} onChange={(e) => alterar("tom_de_voz", e.target.value)} placeholder="Ex.: próximo, direto, sem jargão; fala com a pessoa, não com a multidão." />
            <CampoArea rotulo="Regras de linguagem" value={dados.regras_de_linguagem} onChange={(e) => alterar("regras_de_linguagem", e.target.value)} placeholder="Ex.: nunca usar 'IA' nem 'inteligência artificial' no conteúdo publicado." ajuda="Valem para tudo que a IA escrever para esta empresa." />
            <CampoArea rotulo="Regras de imagem" value={dados.regras_de_imagem} onChange={(e) => alterar("regras_de_imagem", e.target.value)} placeholder="Ex.: fotos reais da equipe, sem banco de imagens; fundo claro." />
            <div className="grid grid-cols-2 gap-3">
              <CampoCor rotulo="Cor primária" valor={dados.cor_primaria} onChange={(v) => alterar("cor_primaria", v)} />
              <CampoCor rotulo="Cor secundária" valor={dados.cor_secundaria} onChange={(v) => alterar("cor_secundaria", v)} />
            </div>
            <div className="rounded-xl border border-borda p-3 text-sm" style={{ borderColor: dados.cor_primaria }}>
              <span className="mr-2 inline-block rounded-lg px-2 py-1 font-medium text-white" style={{ background: dados.cor_primaria }}>Destaque</span>
              <span className="inline-block rounded-lg px-2 py-1 font-medium" style={{ background: dados.cor_secundaria, color: "#1c1917" }}>Secundária</span>
              <span className="ml-2 text-texto-3">Prévia das cores na interface.</span>
            </div>
          </>
        )}

        {passo === 1 && (
          <>
            <h2 className="text-lg font-semibold">Público e objetivos</h2>
            <CampoArea rotulo="Público" value={dados.publico} onChange={(e) => alterar("publico", e.target.value)} placeholder="Quem é a pessoa que segue e compra: idade, momento de vida, dores, desejos." />
            <CampoArea rotulo="Objetivos" value={dados.objetivos} onChange={(e) => alterar("objetivos", e.target.value)} placeholder="Ex.: gerar conversas no direct; crescer em seguidores qualificados; vender X." />
            <div>
              <label htmlFor="pilar" className="rotulo">Pilares de conteúdo</label>
              <div className="flex gap-2">
                <input id="pilar" className="campo" value={pilarNovo} onChange={(e) => setPilarNovo(e.target.value)} onKeyDown={teclaPilar} placeholder="Ex.: Bastidores" maxLength={60} />
                <Botao type="button" variante="secundaria" onClick={adicionarPilar}>Adicionar</Botao>
              </div>
              <p className="mt-1 text-xs text-texto-3">Enter adiciona. Até 12 pilares.</p>
              {dados.pilares.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-2" aria-label="Pilares">
                  {dados.pilares.map((p) => (
                    <li key={p} className="inline-flex items-center gap-1 rounded-full border border-primaria/30 bg-primaria/10 px-2.5 py-1 text-sm text-primaria">
                      {p}
                      <button type="button" aria-label={`Remover ${p}`} onClick={() => alterar("pilares", dados.pilares.filter((x) => x !== p))} className="rounded-full p-0.5 hover:bg-primaria/20">
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <CampoArea rotulo="Melhores horários" value={dados.melhores_horarios} onChange={(e) => alterar("melhores_horarios", e.target.value)} placeholder="Ex.: 12h e 20h nos dias de semana; 10h aos sábados." />
          </>
        )}

        {passo === 2 && (
          <>
            <h2 className="text-lg font-semibold">Metas do mês</h2>
            <p className="text-sm text-texto-2">Deixe em branco o que ainda não tiver meta. Nada aqui é inventado: o painel só compara com dados reais.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPOS_METAS.map(({ chave, rotulo, ajuda }) => (
                <CampoTexto
                  key={chave}
                  rotulo={rotulo}
                  ajuda={ajuda}
                  inputMode="decimal"
                  value={dados.metas[chave]}
                  onChange={(e) => alterar("metas", { ...dados.metas, [chave]: e.target.value })}
                  className="tabular"
                />
              ))}
            </div>

            <h2 className="pt-2 text-lg font-semibold">Ritmo semanal</h2>
            <p className="text-sm text-texto-2">Para cada dia: horário, formato, tipo e objetivo. O padrão sugerido já vem preenchido.</p>
            <ul className="space-y-3">
              {dados.ritmo_semanal.map((r, i) => (
                <li key={r.dia} className="rounded-xl border border-borda p-3">
                  <p className="mb-2 text-sm font-semibold">{DIAS[r.dia - 1]}</p>
                  <div className="grid gap-2 sm:grid-cols-[110px_130px_1fr_170px]">
                    <CampoTexto rotulo="Hora" type="time" value={r.hora} onChange={(e) => atualizarRitmo(i, { hora: e.target.value })} className="tabular" />
                    <CampoSelecao rotulo="Formato" value={r.formato} onChange={(e) => atualizarRitmo(i, { formato: e.target.value as FormatoConteudo })}>
                      {FORMATOS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </CampoSelecao>
                    <CampoTexto rotulo="Tipo" value={r.tipo} onChange={(e) => atualizarRitmo(i, { tipo: e.target.value })} placeholder="Ex.: Reels de prova social" maxLength={120} />
                    <CampoSelecao rotulo="Objetivo" value={r.objetivo} onChange={(e) => atualizarRitmo(i, { objetivo: e.target.value })}>
                      {OBJETIVOS_RITMO.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                    </CampoSelecao>
                  </div>
                  {dados.pilares.length > 0 && (
                    <CampoSelecao rotulo="Pilar" value={r.pilar} onChange={(e) => atualizarRitmo(i, { pilar: e.target.value })} className="mt-2">
                      <option value="">Sem pilar fixo</option>
                      {dados.pilares.map((p) => <option key={p} value={p}>{p}</option>)}
                    </CampoSelecao>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Botao type="button" variante="secundaria" onClick={() => setPasso((p) => Math.max(0, p - 1))} disabled={passo === 0 || pendente}>
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
        </Botao>
        <div className="flex gap-2">
          {editando && (
            <Botao type="button" carregando={pendente} onClick={enviar}>
              <Check className="h-4 w-4" aria-hidden /> Salvar
            </Botao>
          )}
          {passo < PASSOS.length - 1 ? (
            <Botao type="button" variante={editando ? "secundaria" : "primaria"} onClick={avancar} disabled={pendente}>
              Continuar <ArrowRight className="h-4 w-4" aria-hidden />
            </Botao>
          ) : (
            !editando && (
              <Botao type="button" carregando={pendente} onClick={enviar}>
                <Check className="h-4 w-4" aria-hidden /> Criar empresa
              </Botao>
            )
          )}
        </div>
      </div>
    </div>
  );

  function atualizarRitmo(i: number, parcial: Partial<RitmoDia>) {
    alterar("ritmo_semanal", dados.ritmo_semanal.map((r, j) => (j === i ? { ...r, ...parcial } : r)));
  }
}

function CampoCor({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="rotulo">{rotulo}</span>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={`${rotulo} (seletor)`} value={/^#[0-9A-Fa-f]{6}$/.test(valor) ? valor : "#000000"} onChange={(e) => onChange(e.target.value.toUpperCase())} className="h-11 w-12 shrink-0 cursor-pointer rounded-lg border border-borda bg-superficie p-1" />
        <input aria-label={`${rotulo} (hexadecimal)`} className="campo tabular uppercase" value={valor} onChange={(e) => onChange(e.target.value)} maxLength={7} placeholder="#7C3AED" />
      </div>
    </div>
  );
}
