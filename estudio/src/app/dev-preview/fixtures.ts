import type { Campanha, Conteudo, Empresa, MetricaSemanal, ResultadoPost, Story, Sugestao, Tarefa } from "@/lib/tipos/database";
import { RITMO_PADRAO } from "@/lib/padroes";
import { RITMO_LINKEDIN_PADRAO } from "@/lib/redes";
import { somarDias } from "@/lib/datas";

export const HOJE = "2026-10-28";
export const EMPRESA: Empresa = {
  id: "e1", nome: "NARAEDU", perfil_instagram: "@naraeducacional", sobre: "Tecnologia educacional para escolas.", publico: "Famílias e escolas",
  objetivos: "Gerar conversas no direct", tom_de_voz: "Próximo e direto", regras_de_linguagem: "Nunca usar 'IA' ou 'inteligência artificial'.", regras_de_imagem: null,
  pilares: ["Educação", "Prova social", "Bastidores"], melhores_horarios: "20h", cor_primaria: "#7c3aed", cor_secundaria: "#f59e0b", fuso_horario: "America/Sao_Paulo",
  metas: { visualizacoes_dia: 3000, seguidores_liquidos_mes: 100, mensagens_mes: 40, salvamentos_carrossel: 40, alcance_reels: 5000, engajamento_pct: 6 },
  ritmo_semanal: RITMO_PADRAO, redes: ["instagram", "linkedin"], ritmo_linkedin: RITMO_LINKEDIN_PADRAO, arquivada: false, logo_url: null, criado_por: null, criado_em: "", atualizado_em: "2026-10-01T00:00:00Z",
};
export const c = (p: Partial<Conteudo> & { id: string; data: string; formato: Conteudo["formato"]; tema: string }): Conteudo => ({
  empresa_id: "e1", hora: "20:00", tipo: null, pilar: null, objetivo: null, roteiro: "0–3 s: gancho…", legenda: "Legenda. Comenta EU QUERO", cta: "Comenta EU QUERO", orientacao_arte: null, ganchos: ["g1", "g2", "g3"], notas: null,
  status: "aprovado", origem: "equipe", campanha_id: null, criado_por: null, criado_em: "", atualizado_em: "", ...p,
});
export const t = (p: Partial<Tarefa> & { id: string; titulo: string; prazo: string | null }): Tarefa => ({
  empresa_id: "e1", conteudo_id: "c1", tipo: "Outro", responsavel_id: "u1", prioridade: "Média", status: "pendente", concluido_em: null, origem: "equipe", criado_por: null, criado_em: "", atualizado_em: "", ...p,
});
export const CONTEUDOS: Conteudo[] = [
  c({ id: "c1", data: HOJE, formato: "Reels", tema: "Por que seu filho esquece o que estudou", status: "producao", tipo: "Reels pessoa falando",
    roteiro: 'DURAÇÃO: cerca de 30 segundos\nMÚSICA: Áudio em alta, batida leve\n\nCENA 1 · 0s–3s\nIMAGEM: Close no rosto, olhando para a câmera, fundo da sala de estudos\nFALA: "Seu filho estudou ontem e hoje não lembra de nada?"\nTEXTO NA TELA: Ele esqueceu tudo?\n\nCENA 2 · 3s–20s\nIMAGEM: Plano médio, gesticulando; corte para o caderno aberto\nFALA: "Não é preguiça. A memória precisa de revisão: dez minutos no dia seguinte valem mais que duas horas na véspera."\n\nCENA 3 · 20s–30s\nIMAGEM: Close, sorrindo\nFALA: "Comenta REVISÃO que eu te mando o roteiro de estudo."\nTEXTO NA TELA: Comenta REVISÃO',
    orientacao_arte: "ESTILO: Natural, luz do dia\nCORES: Roxo da marca nos textos\nTIPOGRAFIA: Legendas grandes em caixa alta\nFOTOGRAFIA E VÍDEO: Celular na vertical, altura dos olhos\nELEMENTOS: Logo no fim\n\nDICAS DE PRODUÇÃO:\n- Grave perto de uma janela" }),
  c({ id: "c2", data: "2026-10-29", formato: "Reels", tema: "3 frases que travam o estudo", status: "sugestao", origem: "ia", tipo: "Reels com texto na tela" }),
  c({ id: "c3", data: "2026-10-30", formato: "Carrossel", tema: "5 sinais de que a rotina de estudos não funciona", hora: "12:00",
    roteiro: "SLIDE 1 — CAPA\nTÍTULO NA ARTE: 5 sinais de que a rotina não funciona\nIMAGEM: Fundo roxo, título grande centralizado\n\nSLIDE 2\nTÍTULO NA ARTE: Ele estuda, mas esquece\nIMAGEM: Foto de caderno aberto",
    orientacao_arte: "ESTILO: Editorial limpo\nCORES: Roxo e amarelo da marca" }),
  c({ id: "c5", data: "2026-10-14", formato: "Estático", tema: "Frase da semana" }),
  c({ id: "c6", data: "2026-10-20", formato: "Reels", tema: "Bastidores da aula" }),
  c({ id: "c4", data: "2026-11-01", formato: "Estático", tema: "Você também já se sentiu assim?", status: "sugestao", origem: "ia" }),
  c({ id: "l1", rede: "linkedin", data: HOJE, hora: "08:00", formato: "Texto", tema: "O que aprendemos com 40 escolas em 2026", status: "sugestao", origem: "ia", ganchos: [],
    legenda: "Nós visitamos 40 escolas este ano.\n\nO que mais trava a gestão não é tecnologia.\n\n#gestaoescolar #educacao", roteiro: "IMAGEM DE APOIO: Foto da equipe numa sala de aula" }),
  c({ id: "l2", rede: "linkedin", data: "2026-10-31", hora: "10:00", formato: "Estático", tema: "1 em cada 3 coordenadores sente falta de tempo", ganchos: [] }),
];
export const STORIES: Story[] = [{ id: "s1", empresa_id: "e1", data: HOJE, objetivo: "Puxar o Reels", telas: [{ tipo: "Texto", texto: "Abertura" }, { tipo: "Compartilhar post", texto: "" }, { tipo: "Enquete", texto: "", interacao: { pergunta: "Qual?", opcoes: ["A", "B"] } }, { tipo: "Texto", texto: "Fecho" }], status: "sugestao", origem: "ia", conteudo_id: "c1", criado_por: null, criado_em: "", atualizado_em: "" }];
export const TAREFAS: Tarefa[] = [
  t({ id: "t1", titulo: "Gravar · Por que seu filho esquece", prazo: "2026-10-24", prioridade: "Alta" }),
  t({ id: "t2", titulo: "Criar arte · 5 sinais", prazo: "2026-10-27", conteudo_id: "c3" }),
  t({ id: "t3", titulo: "Editar e legendar", prazo: HOJE, prioridade: "Alta", status: "em_producao" }),
  t({ id: "t4", titulo: "Revisar e agendar · Depoimento", prazo: "2026-10-29", responsavel_id: null, status: "aguardando" }),
  t({ id: "t5", titulo: "Agendar · 5 sinais", prazo: "2026-10-29", prioridade: "Baixa", status: "concluido", concluido_em: "2026-10-27T10:00:00Z" }),
];
export const SEMANAS: MetricaSemanal[] = Array.from({ length: 9 }, (_, i) => {
  const semana = ["2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19"][i];
  return {
    empresa_id: "e1", semana, fim: somarDias(semana, 6), fonte: i < 6 ? "metricool" : "manual", seguidores: 4600 + i * 25, seguidores_ganhos: 40 + i, seguidores_perdidos: 20,
    visualizacoes: 15000 + i * 800, alcance: i % 3 === 0 ? null : 9000 + i * 300, interacoes: 500 + i * 20, alcance_posts: 10000, compartilhamentos: 30 + i, salvamentos: 60 + i * 2,
    posts: 3, reels: 2, stories: 10, respostas_stories: 40, cliques_link: i > 5 ? 12 : null, mensagens_direct: i > 5 ? 8 : null, dias_com_dados: 7, ultimo_dia: null, editado_manual: i === 8, notas: null, atualizado_em: "",
  } as MetricaSemanal;
});
export const POSTS: ResultadoPost[] = [
  { id: "p1", empresa_id: "e1", id_externo: null, publicado_em: "2026-10-14T20:00:00", formato: "Reels", titulo: "3 erros ao organizar a rotina de estudos", url: null, alcance: 41000, visualizacoes: 52000, curtidas: 2100, comentarios: 300, salvamentos: 500, compartilhamentos: 300, interacoes: 3200, seguidores_ganhos: 40, tempo_medio: 8.2, taxa_visualizacao: 0.6, fonte: "metricool", conteudo_id: null, atualizado_em: "" },
  { id: "p2", empresa_id: "e1", id_externo: null, publicado_em: "2026-10-12T12:00:00", formato: "Carrossel", titulo: "Checklist da volta às aulas", url: null, alcance: 8000, visualizacoes: null, curtidas: 300, comentarios: 20, salvamentos: 120, compartilhamentos: 15, interacoes: 455, seguidores_ganhos: null, tempo_medio: null, taxa_visualizacao: null, fonte: "manual", conteudo_id: null, atualizado_em: "" },
];
export const CAMPANHAS: Campanha[] = [{ id: "k1", empresa_id: "e1", nome: "Matrículas 2027", inicio: "2026-10-15", fim: "2026-12-15", descricao: "Campanha de matrículas", criado_em: "" }];
export const SUGESTAO: Sugestao = {
  id: "11111111-1111-1111-1111-111111111111", empresa_id: "e1", semana: "2026-11-02", gerado_em: "2026-10-25T14:12:00Z", gerado_por: null,
  resumo: "Os Reels com pessoa falando puxam o engajamento (3.200 interações no melhor post), enquanto os carrosséis ficam abaixo da meta de salvamentos.",
  dados_reais_usados: ["Período analisado: 8 semanas completas (31/08 a 25/10), fonte: Metricool.", "Visualizações: média de 18.420 por semana; última semana 21.300 (+12,4% vs semana anterior)."],
  manter: ["Reels de terça com pessoa falando (média de 2.100 interações)"], melhorar: ["Carrosséis de segunda: 18 salvamentos contra meta de 40"], testar: ["Reels texto na tela no domingo (sem dado: hipótese)"],
  ideias: [
    { titulo: "Por que seu filho esquece o que estudou", formato: "Reels", dia: "2026-11-03", motivo: "Reels pessoa falando é o formato com mais interações (2.100 em média).", legenda: "Ele estudou, você viu… Comenta ESQUECE.", cta: "Comenta ESQUECE", conteudo_id: null },
    { titulo: "5 sinais de que a rotina não funciona", formato: "Carrossel", dia: "2026-11-02", motivo: "(sem dado: hipótese)", legenda: "Salva pra conferir.", cta: "Salva pra conferir", conteudo_id: "22222222-2222-2222-2222-222222222222" },
  ],
};
