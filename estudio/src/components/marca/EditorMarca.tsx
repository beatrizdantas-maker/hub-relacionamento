"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Briefcase, Check, Megaphone, Palette, Plug, Repeat, Target, Trash2, Users } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { Selo } from "@/components/ui/Selo";
import { Confirmacao } from "@/components/ui/Confirmacao";
import { CampoArea, CampoSelecao, CampoTexto } from "@/components/ui/Campo";
import { CampoCor, CamposMetas, CamposRitmo, DIAS, EditorPilares, FUSOS, PreviaCores, metasParaTexto, ritmoOuPadrao, type MetasTexto } from "@/components/empresas/campos";
import { permissoes } from "@/lib/papeis";
import { excluirCampanha, removerTokenMetricool, salvarCampanha, salvarIntegracao, testarConexaoMetricool } from "@/app/(app)/marca/acoes";
import type { Campanha, Empresa, Papel, Rede, RitmoDia } from "@/lib/tipos/database";
import { redesDaEmpresa, ritmoLinkedinOuPadrao } from "@/lib/redes";
import type { SecaoMarca } from "@/lib/validacao/empresa";
import { useSecaoMarca, type Conflito } from "./useSecaoMarca";
import { CampoLogo } from "@/components/empresas/CampoLogo";
import { aplicarHorarios, type AnaliseMetas, type AnaliseRitmo } from "@/lib/analiseSistema";
import { formatarCurta } from "@/lib/datas";
import { formatarNumero } from "@/lib/metricas";

export type AnaliseMarca = { metas: AnaliseMetas; ritmo: AnaliseRitmo };

export interface IntegracaoResumo {
  metricool_user_id: string;
  metricool_brand_id: string;
  tokenMascarado: string | null;
  tokenIlegivel: boolean;
  ultimaImportacao: string | null;
}

export type Aba = SecaoMarca | "campanhas" | "integracao";
const ABAS: { chave: Aba; rotulo: string; Icone: typeof Palette; soDono?: boolean }[] = [
  { chave: "identidade", rotulo: "Identidade", Icone: Palette },
  { chave: "publico", rotulo: "Público", Icone: Users },
  { chave: "metas", rotulo: "Metas", Icone: Target },
  { chave: "ritmo", rotulo: "Ritmo semanal", Icone: Repeat },
  { chave: "linkedin", rotulo: "LinkedIn", Icone: Briefcase },
  { chave: "campanhas", rotulo: "Campanhas", Icone: Megaphone },
  { chave: "integracao", rotulo: "Metricool", Icone: Plug, soDono: true },
];

export function EditorMarca({ empresa, papel, campanhas, integracao, analise, abaInicial }: { empresa: Empresa; papel: Papel; campanhas: Campanha[]; integracao: IntegracaoResumo | null; analise?: AnaliseMarca; abaInicial?: Aba }) {
  const podeEditar = permissoes.podeEditar(papel);
  const [aba, setAba] = useState<Aba>(abaInicial ?? "identidade");

  useEffect(() => {
    if (abaInicial) return;
    try {
      const salva = localStorage.getItem("estudio:marca:aba") as Aba | null;
      if (salva && ABAS.some((a) => a.chave === salva && (!a.soDono || papel === "dono"))) setAba(salva);
    } catch {}
  }, [papel, abaInicial]);

  function trocar(a: Aba) {
    setAba(a);
    try { localStorage.setItem("estudio:marca:aba", a); } catch {}
  }

  return (
    <div className="space-y-4">
      {!podeEditar && <Aviso tipo="info">Você pode ver a marca, mas só Dono e Editor alteram. Peça a quem administra a empresa.</Aviso>}

      <nav aria-label="Seções da marca" className="flex flex-wrap gap-2">
        {ABAS.filter((a) => !a.soDono || papel === "dono").map(({ chave, rotulo, Icone }) => (
          <button
            key={chave}
            type="button"
            aria-current={aba === chave ? "page" : undefined}
            onClick={() => trocar(chave)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition ${
              aba === chave ? "border-primaria bg-primaria/10 text-primaria" : "border-borda text-texto-2 hover:bg-superficie-2"
            }`}
          >
            <Icone className="h-4 w-4" aria-hidden /> {rotulo}
          </button>
        ))}
      </nav>

      {aba === "identidade" && <SecaoIdentidade empresa={empresa} podeEditar={podeEditar} />}
      {aba === "publico" && <SecaoPublico empresa={empresa} podeEditar={podeEditar} />}
      {aba === "metas" && <SecaoMetas empresa={empresa} podeEditar={podeEditar} analise={analise?.metas} />}
      {aba === "ritmo" && <SecaoRitmo empresa={empresa} podeEditar={podeEditar} analise={analise?.ritmo} />}
      {aba === "linkedin" && <SecaoLinkedin empresa={empresa} podeEditar={podeEditar} />}
      {aba === "campanhas" && <SecaoCampanhas empresaId={empresa.id} campanhas={campanhas} podeEditar={podeEditar} />}
      {aba === "integracao" && papel === "dono" && integracao && <SecaoIntegracao empresaId={empresa.id} integracao={integracao} />}
    </div>
  );
}

// ---------- Moldura comum das seções com rascunho/conflito ----------

function formatarValor(v: unknown): string {
  if (v == null || v === "") return "(vazio)";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    if (v.length === 0) return "(vazio)";
    if (typeof v[0] === "string") return (v as string[]).join(", ");
    return (v as RitmoDia[]).map((r) => `${DIAS[r.dia - 1]?.slice(0, 3)} ${r.hora} · ${r.formato} · ${r.tipo || "—"} · ${r.objetivo}`).join("\n");
  }
  if (typeof v === "object") return Object.entries(v as Record<string, string>).map(([k, x]) => `${k}: ${x || "—"}`).join("\n");
  return String(v);
}

const ROTULOS: Record<string, string> = {
  nome: "Nome", perfil_instagram: "Perfil no Instagram", sobre: "Sobre a marca", tom_de_voz: "Tom de voz", regras_de_linguagem: "Regras de linguagem",
  regras_de_imagem: "Regras de imagem", cor_primaria: "Cor primária", cor_secundaria: "Cor secundária", fuso_horario: "Fuso horário",
  publico: "Público", objetivos: "Objetivos", pilares: "Pilares", melhores_horarios: "Melhores horários", metas: "Metas", ritmo_semanal: "Ritmo semanal",
  redes: "Redes", ritmo_linkedin: "Ritmo do LinkedIn",
};

function MolduraSecao<T extends Record<string, unknown>>({
  titulo,
  descricao,
  estado,
  podeEditar,
  deEmpresa,
  children,
}: {
  titulo: string;
  descricao?: string;
  estado: ReturnType<typeof useSecaoMarca<T>>;
  podeEditar: boolean;
  deEmpresa: (e: Empresa) => T;
  children: ReactNode;
}) {
  const { alterado, salvar, descartar, pendente, erro, salvoEm, rascunhoDe, conflito, escolherConflito, salvarMesclado, valores } = estado;
  return (
    <section className="cartao space-y-4" aria-labelledby={`secao-${titulo}`}>
      <div>
        <h2 id={`secao-${titulo}`} className="text-lg font-semibold">{titulo}</h2>
        {descricao && <p className="mt-1 text-sm text-texto-2">{descricao}</p>}
      </div>

      {rascunhoDe && (
        <Aviso tipo="info">
          Restauramos o que você estava digitando ({new Date(rascunhoDe).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}).{" "}
          <button type="button" className="underline underline-offset-2" onClick={descartar}>Descartar rascunho</button>
        </Aviso>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {conflito && <PainelConflito conflito={conflito} valores={valores} deEmpresa={deEmpresa} onEscolher={escolherConflito} onSalvar={salvarMesclado} onCancelar={descartar} pendente={pendente} />}

      <fieldset disabled={!podeEditar || Boolean(conflito)} className="space-y-4">{children}</fieldset>

      {podeEditar && !conflito && (
        <div className="flex flex-wrap items-center gap-2 border-t border-borda pt-3">
          <Botao type="button" carregando={pendente} disabled={!alterado} onClick={salvar}>
            <Check className="h-4 w-4" aria-hidden /> Salvar {titulo.toLowerCase()}
          </Botao>
          {alterado && <Botao type="button" variante="fantasma" onClick={descartar} disabled={pendente}>Descartar alterações</Botao>}
          {salvoEm && !alterado && <span className="text-sm text-real">Salvo às {salvoEm}</span>}
          {alterado && !pendente && <span className="text-sm text-manual">Alterações não salvas</span>}
        </div>
      )}
    </section>
  );
}

function PainelConflito<T extends Record<string, unknown>>({
  conflito, valores, deEmpresa, onEscolher, onSalvar, onCancelar, pendente,
}: {
  conflito: Conflito<T>; valores: T; deEmpresa: (e: Empresa) => T;
  onEscolher: (c: keyof T, e: "meu" | "deles") => void; onSalvar: () => void; onCancelar: () => void; pendente: boolean;
}) {
  const deles = deEmpresa(conflito.atual);
  const quando = new Date(conflito.atual.atualizado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return (
    <div role="alertdialog" aria-label="Conflito de edição" className="space-y-3 rounded-xl border border-manual/50 bg-manual/10 p-3">
      <p className="text-sm font-medium">Outro membro salvou esta seção às {quando}, enquanto você editava.</p>
      <p className="text-xs text-texto-2">Nada do que você digitou foi perdido. Os campos que só a outra pessoa mudou já foram atualizados. Escolha o que vale nos campos abaixo, que vocês dois alteraram:</p>
      <ul className="space-y-3">
        {conflito.campos.map((campo) => (
          <li key={String(campo)} className="rounded-lg border border-borda bg-superficie p-3">
            <p className="mb-2 text-sm font-semibold">{ROTULOS[String(campo)] ?? String(campo)}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["meu", "deles"] as const).map((lado) => (
                <label key={lado} className={`cursor-pointer rounded-lg border p-2 text-sm ${conflito.escolhas[campo] === lado ? "border-primaria bg-primaria/10" : "border-borda"}`}>
                  <input type="radio" name={`conflito-${String(campo)}`} className="mr-2" checked={conflito.escolhas[campo] === lado} onChange={() => onEscolher(campo, lado)} />
                  <span className="font-medium">{lado === "meu" ? "Minha versão" : "Versão da outra pessoa"}</span>
                  <pre className="mt-1 whitespace-pre-wrap break-words font-texto text-xs text-texto-2">{formatarValor(lado === "meu" ? valores[campo] : deles[campo])}</pre>
                </label>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Botao type="button" carregando={pendente} onClick={onSalvar}>Salvar com as escolhas</Botao>
        <Botao type="button" variante="secundaria" onClick={onCancelar} disabled={pendente}>Descartar minhas alterações</Botao>
      </div>
    </div>
  );
}

// ---------- Seções ----------

type Identidade = { nome: string; perfil_instagram: string; sobre: string; tom_de_voz: string; regras_de_linguagem: string; regras_de_imagem: string; cor_primaria: string; cor_secundaria: string; fuso_horario: string };
const deIdentidade = (e: Empresa): Identidade => ({
  nome: e.nome, perfil_instagram: e.perfil_instagram ?? "", sobre: e.sobre ?? "", tom_de_voz: e.tom_de_voz ?? "", regras_de_linguagem: e.regras_de_linguagem ?? "",
  regras_de_imagem: e.regras_de_imagem ?? "", cor_primaria: e.cor_primaria, cor_secundaria: e.cor_secundaria, fuso_horario: e.fuso_horario,
});

function SecaoIdentidade({ empresa, podeEditar }: { empresa: Empresa; podeEditar: boolean }) {
  const s = useSecaoMarca<Identidade>({ empresa, secao: "identidade", deEmpresa: deIdentidade, podeEditar });
  const v = s.valores;
  return (
    <MolduraSecao titulo="Identidade" descricao="Nome, perfil, tom de voz, regras e cores. As regras de linguagem valem para tudo que a IA escrever para esta empresa." estado={s} podeEditar={podeEditar} deEmpresa={deIdentidade}>
      <CampoTexto rotulo="Nome da empresa" required value={v.nome} onChange={(e) => s.alterar({ nome: e.target.value })} maxLength={120} />
      <CampoLogo empresaId={empresa.id} logoAtual={empresa.logo_url} nome={empresa.nome} disabled={!podeEditar} />
      <CampoTexto rotulo="Perfil no Instagram" value={v.perfil_instagram} onChange={(e) => s.alterar({ perfil_instagram: e.target.value })} placeholder="@perfil" ajuda="Só o @, sem link." />
      <CampoArea rotulo="Sobre a marca" value={v.sobre} onChange={(e) => s.alterar({ sobre: e.target.value })} placeholder="O que a empresa faz, para quem e o que a diferencia." />
      <CampoArea rotulo="Tom de voz" value={v.tom_de_voz} onChange={(e) => s.alterar({ tom_de_voz: e.target.value })} placeholder="Ex.: próximo, direto, sem jargão." />
      <CampoArea rotulo="Regras de linguagem" value={v.regras_de_linguagem} onChange={(e) => s.alterar({ regras_de_linguagem: e.target.value })} placeholder="Ex.: nunca usar 'IA' nem 'inteligência artificial' no conteúdo publicado." />
      <CampoArea rotulo="Regras de imagem" value={v.regras_de_imagem} onChange={(e) => s.alterar({ regras_de_imagem: e.target.value })} placeholder="Ex.: fotos reais da equipe, sem banco de imagens." />
      <div className="grid grid-cols-2 gap-3">
        <CampoCor rotulo="Cor primária" valor={v.cor_primaria} onChange={(c) => s.alterar({ cor_primaria: c })} disabled={!podeEditar} />
        <CampoCor rotulo="Cor secundária" valor={v.cor_secundaria} onChange={(c) => s.alterar({ cor_secundaria: c })} disabled={!podeEditar} />
      </div>
      <PreviaCores primaria={v.cor_primaria} secundaria={v.cor_secundaria} />
      <CampoSelecao rotulo="Fuso horário" value={v.fuso_horario} onChange={(e) => s.alterar({ fuso_horario: e.target.value })} ajuda="Semanas vão de segunda a domingo neste fuso.">
        {FUSOS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
        {!FUSOS.some((f) => f.valor === v.fuso_horario) && <option value={v.fuso_horario}>{v.fuso_horario}</option>}
      </CampoSelecao>
    </MolduraSecao>
  );
}

type Publico = { publico: string; objetivos: string; pilares: string[]; melhores_horarios: string };
const dePublico = (e: Empresa): Publico => ({ publico: e.publico ?? "", objetivos: e.objetivos ?? "", pilares: e.pilares ?? [], melhores_horarios: e.melhores_horarios ?? "" });

function SecaoPublico({ empresa, podeEditar }: { empresa: Empresa; podeEditar: boolean }) {
  const s = useSecaoMarca<Publico>({ empresa, secao: "publico", deEmpresa: dePublico, podeEditar });
  const v = s.valores;
  return (
    <MolduraSecao titulo="Público e objetivos" descricao="Quem a marca fala com, o que quer alcançar e os pilares de conteúdo." estado={s} podeEditar={podeEditar} deEmpresa={dePublico}>
      <CampoArea rotulo="Público" value={v.publico} onChange={(e) => s.alterar({ publico: e.target.value })} placeholder="Quem segue e compra: idade, momento de vida, dores, desejos." />
      <CampoArea rotulo="Objetivos" value={v.objetivos} onChange={(e) => s.alterar({ objetivos: e.target.value })} placeholder="Ex.: gerar conversas no direct; crescer em seguidores qualificados." />
      <EditorPilares pilares={v.pilares} onChange={(p) => s.alterar({ pilares: p })} disabled={!podeEditar} />
      <CampoArea rotulo="Melhores horários" value={v.melhores_horarios} onChange={(e) => s.alterar({ melhores_horarios: e.target.value })} placeholder="Ex.: 12h e 20h nos dias de semana." />
    </MolduraSecao>
  );
}

type MetasSecao = { metas: MetasTexto };
const deMetas = (e: Empresa): MetasSecao => ({ metas: metasParaTexto(e.metas) });

function SecaoMetas({ empresa, podeEditar, analise }: { empresa: Empresa; podeEditar: boolean; analise?: AnaliseMetas }) {
  const s = useSecaoMarca<MetasSecao>({ empresa, secao: "metas", deEmpresa: deMetas, podeEditar });
  function usarSugeridas() {
    if (!analise) return;
    const novas = { ...s.valores.metas };
    for (const i of analise.itens) if (i.sugerida != null) novas[i.chave] = String(i.sugerida);
    s.alterar({ metas: novas });
  }
  return (
    <MolduraSecao titulo="Metas do mês" descricao="Usadas nas barras de progresso do painel. A análise do sistema sugere metas a partir dos seus números reais; você aplica e ajusta." estado={s} podeEditar={podeEditar} deEmpresa={deMetas}>
      {analise && <AnaliseMetasCaixa analise={analise} podeEditar={podeEditar} onUsar={usarSugeridas} />}
      <CamposMetas metas={s.valores.metas} onChange={(m) => s.alterar({ metas: m })} disabled={!podeEditar} />
    </MolduraSecao>
  );
}

function AnaliseMetasCaixa({ analise, podeEditar, onUsar }: { analise: AnaliseMetas; podeEditar: boolean; onUsar: () => void }) {
  return (
    <section aria-labelledby="analise-metas" className="space-y-3 rounded-xl border border-real/40 bg-real/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="analise-metas" className="flex items-center gap-2 text-base font-semibold text-real"><BarChart3 className="h-4 w-4" aria-hidden /> Análise do sistema</h3>
        <Selo tom="real">Dado real · calculado pelo sistema</Selo>
      </div>
      {!analise.temSugestao ? (
        <p className="text-sm text-texto-2">Ainda não há dados suficientes. Importe do Metricool (Painel → Atualizar do Metricool) ou registre semanas no Painel. Com pelo menos uma semana completa, o sistema sugere as metas aqui.</p>
      ) : (
        <>
          <p className="text-sm text-texto-2">
            Base: {analise.periodo ? `${analise.periodo.semanas} ${analise.periodo.semanas === 1 ? "semana completa" : "semanas completas"} (${formatarCurta(analise.periodo.de)} a ${formatarCurta(analise.periodo.ate)})` : "posts recentes"}. Meta sugerida = valor real + 10%, arredondado.
          </p>
          <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Metas sugeridas pelo sistema">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs text-texto-2">
                  <th className="py-1 pr-2 font-medium">Meta</th>
                  <th className="py-1 pr-2 text-right font-medium">Real hoje</th>
                  <th className="py-1 pr-2 text-right font-medium">Sugerida</th>
                </tr>
              </thead>
              <tbody>
                {analise.itens.map((i) => (
                  <tr key={i.chave} className="border-t border-real/20 align-top">
                    <td className="py-1.5 pr-2">
                      <span className="block">{i.rotulo}</span>
                      <span className="block text-xs text-texto-2">{i.base}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-right tabular">{formatarNumero(i.real, i.tipo)}</td>
                    <td className="py-1.5 pr-2 text-right font-semibold tabular">{i.sugerida == null ? <span className="font-normal text-texto-2">sem dado</span> : formatarNumero(i.sugerida, i.tipo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {podeEditar && (
            <div className="flex flex-wrap items-center gap-2">
              <Botao type="button" tamanho="sm" variante="secundaria" onClick={onUsar}><Check className="h-4 w-4" aria-hidden /> Usar metas sugeridas</Botao>
              <span className="text-xs text-texto-2">Preenche os campos abaixo; confira e clique em Salvar.</span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

type LinkedinSecao = { redes: Rede[]; ritmo_linkedin: RitmoDia[] };
const deLinkedin = (e: Empresa): LinkedinSecao => ({ redes: redesDaEmpresa(e), ritmo_linkedin: ritmoLinkedinOuPadrao(e.ritmo_linkedin) });

function SecaoLinkedin({ empresa, podeEditar }: { empresa: Empresa; podeEditar: boolean }) {
  const s = useSecaoMarca<LinkedinSecao>({ empresa, secao: "linkedin", deEmpresa: deLinkedin, podeEditar });
  const ativo = s.valores.redes.includes("linkedin");
  return (
    <MolduraSecao titulo="LinkedIn" descricao="Página da empresa no LinkedIn: calendário próprio, ritmo próprio e texto para gestores e decisores. O Instagram continua como está." estado={s} podeEditar={podeEditar} deEmpresa={deLinkedin}>
      <label className="flex items-start gap-3 rounded-xl border border-borda p-3">
        <input type="checkbox" className="mt-0.5 h-5 w-5" disabled={!podeEditar} checked={ativo} onChange={(e) => s.alterar({ redes: e.target.checked ? ["instagram", "linkedin"] : ["instagram"] })} />
        <span>
          <span className="block font-medium">Planejar também o LinkedIn</span>
          <span className="block text-sm text-texto-2">Liga o filtro de rede no calendário, o “Gerar mês” do LinkedIn e o botão “Adaptar para o LinkedIn” nos posts do Instagram.</span>
        </span>
      </label>
      {ativo && (
        <>
          <div className="rounded-xl border border-ia/40 bg-ia/10 p-3 text-sm">
            <p className="font-medium text-ia">Sugestão para postar todo dia</p>
            <p className="mt-1 text-texto-2">Seg texto de opinião · Ter vídeo com especialista · Qua caso de escola com foto · Qui imagem com um dado · Sex vídeo de bastidores · Sáb enquete · Dom reflexão. Sem carrossel: no LinkedIn, texto, vídeo e enquete rendem mais. Ajuste abaixo e clique em Salvar.</p>
          </div>
          <h3 className="text-base font-semibold">Ritmo semanal do LinkedIn</h3>
          <CamposRitmo rede="linkedin" ritmo={s.valores.ritmo_linkedin} pilares={empresa.pilares ?? []} onChange={(r) => s.alterar({ ritmo_linkedin: r })} disabled={!podeEditar} />
        </>
      )}
    </MolduraSecao>
  );
}

type RitmoSecao = { ritmo_semanal: RitmoDia[] };
const deRitmo = (e: Empresa): RitmoSecao => ({ ritmo_semanal: ritmoOuPadrao(e.ritmo_semanal) });

function SecaoRitmo({ empresa, podeEditar, analise }: { empresa: Empresa; podeEditar: boolean; analise?: AnaliseRitmo }) {
  const s = useSecaoMarca<RitmoSecao>({ empresa, secao: "ritmo", deEmpresa: deRitmo, podeEditar });
  return (
    <MolduraSecao titulo="Ritmo semanal" descricao="Para cada dia: horário, formato, tipo, pilar e objetivo. A geração de calendário pela IA segue este ritmo." estado={s} podeEditar={podeEditar} deEmpresa={deRitmo}>
      {analise && <AnaliseRitmoCaixa analise={analise} podeEditar={podeEditar} onAplicar={() => s.alterar({ ritmo_semanal: aplicarHorarios(s.valores.ritmo_semanal, analise.mudancas) })} />}
      <CamposRitmo ritmo={s.valores.ritmo_semanal} pilares={empresa.pilares ?? []} onChange={(r) => s.alterar({ ritmo_semanal: r })} disabled={!podeEditar} />
    </MolduraSecao>
  );
}

function AnaliseRitmoCaixa({ analise, podeEditar, onAplicar }: { analise: AnaliseRitmo; podeEditar: boolean; onAplicar: () => void }) {
  const comHora = analise.porFormato.filter((f) => f.melhorHora);
  return (
    <section aria-labelledby="analise-ritmo" className="space-y-3 rounded-xl border border-real/40 bg-real/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="analise-ritmo" className="flex items-center gap-2 text-base font-semibold text-real"><BarChart3 className="h-4 w-4" aria-hidden /> Análise do sistema</h3>
        <Selo tom="real">Dado real · calculado pelo sistema</Selo>
      </div>
      {comHora.length === 0 ? (
        <p className="text-sm text-texto-2">
          Ainda não há posts suficientes para sugerir horários{analise.totalPosts ? ` (${analise.totalPosts} posts nas últimas 8 semanas; é preciso pelo menos 2 no mesmo horário e formato)` : ""}. Importe do Metricool para o sistema analisar.
        </p>
      ) : (
        <>
          <p className="text-sm text-texto-2">Melhor horário por formato nas últimas 8 semanas, pela média de interações:</p>
          <ul className="space-y-1 text-sm">
            {analise.porFormato.map((f) => (
              <li key={f.formato} className="flex flex-wrap justify-between gap-2">
                <span>{f.formato}</span>
                <span className="tabular text-texto-2">
                  {f.melhorHora ? <><strong className="text-texto">{f.melhorHora}</strong> · média {formatarNumero(f.mediaInteracoes)} interações ({f.posts} de {f.totalPosts} posts)</> : `sem dado suficiente (${f.totalPosts} posts)`}
                </span>
              </li>
            ))}
          </ul>
          {analise.mudancas.length === 0 ? (
            <p className="text-sm text-texto-2">O ritmo atual já usa os melhores horários.</p>
          ) : (
            <>
              <ul className="space-y-1 text-sm">
                {analise.mudancas.map((m) => (
                  <li key={m.dia}><strong>{DIAS[m.dia - 1]}</strong>: {m.horaAtual} → <strong>{m.horaSugerida}</strong> <span className="text-texto-2">({m.motivo})</span></li>
                ))}
              </ul>
              {podeEditar && (
                <div className="flex flex-wrap items-center gap-2">
                  <Botao type="button" tamanho="sm" variante="secundaria" onClick={onAplicar}><Check className="h-4 w-4" aria-hidden /> Aplicar horários sugeridos</Botao>
                  <span className="text-xs text-texto-2">Muda só as horas; confira e clique em Salvar.</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}

// ---------- Campanhas ----------

type FormCampanha = { id?: string; nome: string; inicio: string; fim: string; descricao: string };
const campanhaVazia: FormCampanha = { nome: "", inicio: "", fim: "", descricao: "" };

function formatarPeriodo(c: Campanha) {
  const f = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : null);
  const i = f(c.inicio), fim = f(c.fim);
  if (i && fim) return `${i} a ${fim}`;
  if (i) return `a partir de ${i}`;
  if (fim) return `até ${fim}`;
  return "sem período definido";
}

function statusCampanha(c: Campanha): { tom: "real" | "neutro" | "manual"; texto: string } {
  const hoje = new Date().toISOString().slice(0, 10);
  if (c.inicio && c.inicio > hoje) return { tom: "manual", texto: "Em breve" };
  if (c.fim && c.fim < hoje) return { tom: "neutro", texto: "Encerrada" };
  return { tom: "real", texto: "Ativa" };
}

function SecaoCampanhas({ empresaId, campanhas, podeEditar }: { empresaId: string; campanhas: Campanha[]; podeEditar: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FormCampanha | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function salvar() {
    if (!form) return;
    setErro(null);
    iniciar(async () => {
      const r = await salvarCampanha(empresaId, form);
      if (!r.ok) return setErro(r.erro);
      setForm(null);
      router.refresh();
    });
  }

  function excluir(id: string) {
    setErro(null);
    iniciar(async () => {
      const r = await excluirCampanha(empresaId, id);
      if (!r.ok) setErro(r.erro);
      setExcluindo(null);
      router.refresh();
    });
  }

  return (
    <section className="cartao space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Campanhas</h2>
          <p className="mt-1 text-sm text-texto-2">Lançamentos, datas especiais e promoções. A IA usa as campanhas ativas ao gerar o calendário.</p>
        </div>
        {podeEditar && !form && <Botao tamanho="sm" onClick={() => setForm({ ...campanhaVazia })}>Nova campanha</Botao>}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {form && (
        <form className="space-y-3 rounded-xl border border-primaria/40 bg-primaria/5 p-3" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
          <CampoTexto rotulo="Nome da campanha" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} maxLength={120} placeholder="Ex.: Matrículas 2027" />
          <div className="grid grid-cols-2 gap-3">
            <CampoTexto rotulo="Início" type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="tabular" />
            <CampoTexto rotulo="Fim" type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="tabular" />
          </div>
          <CampoArea rotulo="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Oferta, público, mensagem principal e chamada para ação." />
          <div className="flex gap-2">
            <Botao type="submit" carregando={pendente}>{form.id ? "Salvar campanha" : "Criar campanha"}</Botao>
            <Botao type="button" variante="secundaria" onClick={() => setForm(null)} disabled={pendente}>Cancelar</Botao>
          </div>
        </form>
      )}

      {campanhas.length === 0 && !form ? (
        <div className="rounded-xl border border-dashed border-borda p-4 text-center text-sm text-texto-2">
          Nenhuma campanha ainda. {podeEditar ? "Clique em Nova campanha para cadastrar um lançamento ou data especial." : "Quem edita a marca pode cadastrar campanhas."}
        </div>
      ) : (
        <ul className="divide-y divide-borda">
          {campanhas.map((c) => {
            const st = statusCampanha(c);
            return (
              <li key={c.id} className="space-y-2 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{c.nome}</p>
                      <Selo tom={st.tom}>{st.texto}</Selo>
                    </div>
                    <p className="text-xs text-texto-3 tabular">{formatarPeriodo(c)}</p>
                    {c.descricao && <p className="mt-1 whitespace-pre-wrap text-sm text-texto-2">{c.descricao}</p>}
                  </div>
                  {podeEditar && excluindo !== c.id && (
                    <div className="flex gap-1">
                      <Botao tamanho="sm" variante="secundaria" disabled={pendente} onClick={() => setForm({ id: c.id, nome: c.nome, inicio: c.inicio ?? "", fim: c.fim ?? "", descricao: c.descricao ?? "" })}>Editar</Botao>
                      <Botao tamanho="sm" variante="fantasma" className="text-atrasado" disabled={pendente} onClick={() => setExcluindo(c.id)} aria-label={`Excluir ${c.nome}`}><Trash2 className="h-4 w-4" aria-hidden /></Botao>
                    </div>
                  )}
                </div>
                {excluindo === c.id && (
                  <Confirmacao titulo={`Excluir a campanha ${c.nome}?`} descricao="Os conteúdos ligados a ela continuam, sem campanha." rotuloConfirmar="Excluir" carregando={pendente} onConfirmar={() => excluir(c.id)} onCancelar={() => setExcluindo(null)} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------- Integração Metricool (só Dono) ----------

function SecaoIntegracao({ empresaId, integracao }: { empresaId: string; integracao: IntegracaoResumo }) {
  const router = useRouter();
  const [userId, setUserId] = useState(integracao.metricool_user_id);
  const [brandId, setBrandId] = useState(integracao.metricool_brand_id);
  const [token, setToken] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [pendente, iniciar] = useTransition();
  const [testando, iniciarTeste] = useTransition();

  function salvar() {
    setErro(null); setOk(null);
    iniciar(async () => {
      const r = await salvarIntegracao(empresaId, { metricool_user_id: userId, metricool_brand_id: brandId, metricool_token: token });
      if (!r.ok) return setErro(r.erro);
      setToken("");
      setOk(r.tokenFinal ? "Integração salva. O token foi guardado cifrado. Clique em “Testar conexão” para conferir." : "IDs salvos.");
      router.refresh();
    });
  }

  function testar() {
    setErro(null); setOk(null);
    iniciarTeste(async () => {
      const r = await testarConexaoMetricool(empresaId);
      if (!r.ok) return setErro(r.erro);
      setOk(`Conexão OK: marca “${r.marca.label}” (ID ${r.marca.id})${r.marca.instagram ? ` · Instagram @${r.marca.instagram}` : " · sem Instagram conectado"}${r.marca.timezone ? ` · fuso ${r.marca.timezone}` : ""}.`);
    });
  }

  function remover() {
    setErro(null); setOk(null);
    iniciar(async () => {
      const r = await removerTokenMetricool(empresaId);
      if (!r.ok) setErro(r.erro);
      else setOk("Token removido.");
      setRemovendo(false);
      router.refresh();
    });
  }

  return (
    <section className="cartao space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Integração com o Metricool</h2>
        <p className="mt-1 text-sm text-texto-2">
          No Metricool, em Configurações → API, ficam o <strong>User ID</strong> e o <strong>token</strong> (disponíveis nos planos Advanced ou superior). O <strong>ID da marca</strong> (blogId) aparece na URL ao abrir a marca e na lista de marcas. O token é guardado cifrado e só o servidor lê.
        </p>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {ok && <Aviso tipo="sucesso">{ok}</Aviso>}
      {integracao.tokenIlegivel && <Aviso tipo="erro">Há um token salvo, mas o servidor não conseguiu lê-lo (a chave ESTUDIO_CRYPTO_KEY mudou?). Salve o token de novo.</Aviso>}

      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div className="grid grid-cols-2 gap-3">
          <CampoTexto rotulo="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} inputMode="numeric" placeholder="Ex.: 5391741" className="tabular" />
          <CampoTexto rotulo="ID da marca (blogId)" value={brandId} onChange={(e) => setBrandId(e.target.value)} inputMode="numeric" placeholder="Ex.: 6987210" className="tabular" />
        </div>
        <CampoTexto
          rotulo={integracao.tokenMascarado ? "Novo token (deixe em branco para manter o atual)" : "Token de acesso"}
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder={integracao.tokenMascarado ?? "Cole o token aqui"}
          ajuda={integracao.tokenMascarado ? `Token atual: ${integracao.tokenMascarado}` : "Sem token salvo."}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Botao type="submit" carregando={pendente}><Check className="h-4 w-4" aria-hidden /> Salvar integração</Botao>
          <Botao type="button" variante="secundaria" carregando={testando} disabled={!integracao.tokenMascarado || pendente} onClick={testar}>Testar conexão</Botao>
          {integracao.tokenMascarado && !removendo && <Botao type="button" variante="fantasma" className="text-atrasado" disabled={pendente} onClick={() => setRemovendo(true)}>Remover token</Botao>}
        </div>
        <p className="text-xs text-texto-3">
          {integracao.ultimaImportacao ? `Última importação: ${new Date(integracao.ultimaImportacao).toLocaleString("pt-BR")}.` : "Nenhuma importação ainda."} A importação fica no Painel, botão “Atualizar do Metricool”.
        </p>
      </form>
      {removendo && <Confirmacao titulo="Remover o token do Metricool?" descricao="A importação para de funcionar até salvar um token novo. As métricas já importadas continuam." rotuloConfirmar="Remover" carregando={pendente} onConfirmar={remover} onCancelar={() => setRemovendo(false)} />}
    </section>
  );
}
