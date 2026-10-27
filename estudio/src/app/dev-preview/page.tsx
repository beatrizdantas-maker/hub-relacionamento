import { notFound } from "next/navigation";
import { Casca } from "@/components/casca/Casca";
import { Inicio } from "@/components/inicio/Inicio";
import { Sugestoes } from "@/components/sugestoes/Sugestoes";
import { Calendario } from "@/components/calendario/Calendario";
import { QuadroTarefas } from "@/components/tarefas/QuadroTarefas";
import { PainelEvolucao } from "@/components/painel/PainelEvolucao";
import { EditorMarca } from "@/components/marca/EditorMarca";
import { FormularioEmpresa } from "@/components/empresas/FormularioEmpresa";
import { estiloEmpresa } from "@/lib/cores";
import { agruparTarefasInicio } from "@/lib/inicio";
import { analisarMetas, analisarRitmo } from "@/lib/analiseSistema";
import { compararUltimos, progressoMetas, semanaParaPeriodo } from "@/lib/metricas";
import { CAMPANHAS, CONTEUDOS, EMPRESA, HOJE, POSTS, SEMANAS, STORIES, SUGESTAO, TAREFAS } from "./fixtures";
import type { Papel } from "@/lib/tipos/database";
import { RITMO_LINKEDIN_PADRAO } from "@/lib/redes";

/**
 * Telas com dados de exemplo, sem login, para a auditoria de acessibilidade
 * (scripts/a11y.mjs). Só existe quando ESTUDIO_PREVIEW=1; em produção é 404.
 */
export default async function Pagina({ searchParams }: { searchParams: Promise<{ tela?: string; papel?: string; abrir?: string; rede?: string }> }) {
  if (process.env.ESTUDIO_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const papel = (sp.papel ?? "dono") as Papel;
  const tela = sp.tela ?? "inicio";
  const { atual, anterior } = compararUltimos(SEMANAS.map((s) => semanaParaPeriodo(s, HOJE)));
  let conteudo: React.ReactNode;
  switch (tela) {
    case "sugestoes":
      conteudo = <Sugestoes empresa={{ id: "e1", nome: "NARAEDU" }} papel={papel} hoje={HOJE} proximaSemana="2026-11-02" dadosReais={{ vazio: false, linhas: SUGESTAO.dados_reais_usados }} sugestoes={[SUGESTAO]} iaConfigurada />;
      break;
    case "calendario":
    case "calendario-dia":
    case "calendario-mes":
      conteudo = (
        <Calendario empresa={{ id: "e1", nome: "NARAEDU", fuso: "America/Sao_Paulo", pilares: EMPRESA.pilares, ritmo: EMPRESA.ritmo_semanal, ritmoLinkedin: RITMO_LINKEDIN_PADRAO }} rede={sp.rede ?? "todas"} papel={papel} usuarioId="u1" hoje={HOJE} segunda={tela === "calendario-mes" ? "2026-09-28" : "2026-10-26"} dia={tela === "calendario-dia" ? HOJE : null} mes={tela === "calendario-mes" ? "2026-10" : null} filtro="todos" abrir={sp.abrir ?? null} iaConfigurada conteudos={CONTEUDOS} stories={STORIES} tarefas={TAREFAS} campanhas={CAMPANHAS.map((k) => ({ id: k.id, nome: k.nome }))} />
      );
      break;
    case "tarefas":
      conteudo = <QuadroTarefas empresaId="e1" papel={papel} usuarioId="u1" hoje={HOJE} segunda="2026-10-26" filtro="abertas" responsavel="" abrir={sp.abrir ?? null} tarefas={TAREFAS} membros={[{ id: "u1", nome: "Beatriz" }]} conteudos={CONTEUDOS.map((x) => ({ id: x.id, data: x.data, formato: x.formato, tema: x.tema }))} />;
      break;
    case "painel":
      conteudo = <PainelEvolucao empresa={{ id: "e1", nome: "NARAEDU", metas: EMPRESA.metas }} papel={papel} hoje={HOJE} visao="semanas" abrir={sp.abrir ?? null} semanas={SEMANAS} posts={POSTS} metricool={papel === "dono" ? { configurado: true, ultimaImportacao: "2026-10-27T09:00:00Z" } : null} />;
      break;
    case "marca":
      conteudo = <EditorMarca empresa={EMPRESA} papel={papel} abaInicial={sp.abrir === "linkedin" ? "linkedin" : undefined} campanhas={CAMPANHAS} integracao={papel === "dono" ? { metricool_user_id: "5391741", metricool_brand_id: "6987210", tokenMascarado: "abcd…wxyz", tokenIlegivel: false, ultimaImportacao: null } : null} analise={{ metas: analisarMetas({ hoje: HOJE, semanas: sp.abrir === "vazio" ? [] : SEMANAS, posts: sp.abrir === "vazio" ? [] : POSTS }), ritmo: analisarRitmo({ hoje: HOJE, posts: POSTS, ritmo: EMPRESA.ritmo_semanal, fuso: "America/Sao_Paulo" }) }} />;
      break;
    case "empresa-nova":
      conteudo = <FormularioEmpresa />;
      break;
    default:
      conteudo = (
        <Inicio
          empresa={{ id: "e1", nome: "NARAEDU" }} usuario={{ id: "u1", nome: "Beatriz Dantas" }} papel={papel} hoje={HOJE}
          alertas={[{ chave: "atrasadas", tom: "atrasado", texto: "2 tarefas atrasadas", href: "/tarefas?filtro=atrasadas", acao: "Ver tarefas" }, { chave: "sugestoes", tom: "ia", texto: "5 sugestões da IA aguardando aprovação", href: "/calendario", acao: "Revisar no calendário" }]}
          conteudos={CONTEUDOS} stories={STORIES} tarefas={agruparTarefasInicio(TAREFAS, HOJE)} membros={{ u1: "Beatriz" }}
          indicadores={{ atual, anterior }} metas={progressoMetas(EMPRESA.metas, SEMANAS.filter((s) => s.semana.startsWith("2026-10")), POSTS)}
          ultimaSugestao={{ id: SUGESTAO.id, semana: SUGESTAO.semana, gerado_em: SUGESTAO.gerado_em, resumo: SUGESTAO.resumo, ideias: 2 }}
        />
      );
  }
  return (
    <div className="marca-empresa" style={estiloEmpresa(EMPRESA.cor_primaria, EMPRESA.cor_secundaria)}>
      <Casca usuario={{ id: "u1", email: "bia@exemplo.com", nome: "Beatriz" }} empresas={[{ id: "e1", nome: "NARAEDU", cor_primaria: "#7c3aed", arquivada: false }, { id: "e2", nome: "Outra marca", cor_primaria: "#0ea5e9", arquivada: false }]} empresaAtivaId="e1" atrasadas={2}>
        {conteudo}
      </Casca>
    </div>
  );
}
