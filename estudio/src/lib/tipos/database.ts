/**
 * Tipos do banco (escritos à mão a partir das migrations). Tudo vive no schema "estudio".
 * Depois de aplicar as migrations, podem ser regenerados com:
 *   npx supabase gen types typescript --project-id <id> --schema estudio > src/lib/tipos/database.ts
 */
export type Papel = "dono" | "editor" | "colaborador" | "leitor";
export type FormatoConteudo = "Reels" | "Carrossel" | "Estático";
export type StatusConteudo = "sugestao" | "aprovado" | "producao" | "publicado";
export type Origem = "ia" | "equipe";
export type TipoTarefa = "Gravar" | "Fotografar" | "Criar arte" | "Editar" | "Revisar" | "Publicar" | "Planejamento" | "Outro";
export type Prioridade = "Alta" | "Média" | "Baixa";
export type StatusTarefa = "pendente" | "em_producao" | "aguardando" | "concluido";
export type FonteMetrica = "metricool" | "manual";
export type TipoTelaStory =
  | "Foto ou vídeo" | "Texto" | "Compartilhar post" | "Enquete" | "Caixa de pergunta"
  | "Quiz" | "Slider de emoji" | "Slider" | "Contagem regressiva" | "Link";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Metas = {
  visualizacoes_dia: number | null;
  seguidores_liquidos_mes: number | null;
  mensagens_mes: number | null;
  salvamentos_carrossel: number | null;
  alcance_reels: number | null;
  engajamento_pct: number | null;
}

export type RitmoDia = {
  dia: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = segunda … 7 = domingo
  hora: string;                   // "HH:MM"
  formato: FormatoConteudo;
  tipo: string;
  pilar: string;
  objetivo: string;
}

export type TelaStory = {
  tipo: TipoTelaStory;
  texto: string;
  interacao?: { pergunta?: string; opcoes?: string[]; emoji?: string; url?: string; data?: string } | null;
}

export type IdeiaSugestao = {
  titulo: string;
  formato: FormatoConteudo;
  dia: string;   // AAAA-MM-DD
  motivo: string;
  legenda: string;
  cta: string;
  conteudo_id?: string | null; // preenchido quando a ideia vira item do calendário
}

export type SlidePeca = { papel: "capa" | "conteudo" | "fechamento"; titulo: string; texto: string; destaque: string | null };
export type CenaVideo = { texto: string; destaque: string | null; segundos: number };
export type CenaFalada = { inicio_s: number; fim_s: number; fala: string; enquadramento: string; texto_na_tela: string | null };
export type Pecas =
  | { tipo: "carrossel"; gerado_em: string; slides: SlidePeca[] }
  | { tipo: "estatico"; gerado_em: string; titulo: string; texto: string; destaque: string | null; rodape: string | null }
  | { tipo: "video"; gerado_em: string; cenas: CenaVideo[] }
  | { tipo: "roteiro_falado"; gerado_em: string; duracao_s: number; cenas: CenaFalada[]; dicas: string[] };

type Linha<Row, Insert = Partial<Row>, Update = Partial<Row>> = { Row: Row; Insert: Insert; Update: Update; Relationships: [] };

export type EmpresaRow = {
  id: string; nome: string; perfil_instagram: string | null; sobre: string | null; publico: string | null;
  objetivos: string | null; tom_de_voz: string | null; regras_de_linguagem: string | null; regras_de_imagem: string | null;
  pilares: string[]; melhores_horarios: string | null; cor_primaria: string; cor_secundaria: string;
  fuso_horario: string; metas: Metas; ritmo_semanal: RitmoDia[]; arquivada: boolean; logo_url: string | null;
  criado_por: string | null; criado_em: string; atualizado_em: string;
}

export interface Database {
  estudio: {
    Tables: {
      perfis: Linha<{
        id: string; nome: string | null; email: string | null; empresa_ativa_id: string | null;
        tema: "claro" | "escuro" | "sistema"; criado_em: string; atualizado_em: string;
      }>;
      empresas: Linha<EmpresaRow, { nome: string } & Partial<Omit<EmpresaRow, "id" | "criado_em" | "atualizado_em">>>;
      empresas_integracoes: Linha<{
        empresa_id: string; metricool_brand_id: string | null; metricool_user_id: string | null; metricool_token_cifrado: string | null;
        ultima_importacao_em: string | null; ultima_semana_importada: string | null; atualizado_em: string;
      }>;
      membros: Linha<{ empresa_id: string; user_id: string; papel: Papel; nome_exibicao: string | null; email: string | null; convidado_em: string }>;
      convites: Linha<{
        id: string; empresa_id: string; email: string; papel: Papel; token: string; criado_por: string | null;
        criado_em: string; expira_em: string; aceito_em: string | null;
      }>;
      campanhas: Linha<{ id: string; empresa_id: string; nome: string; inicio: string | null; fim: string | null; descricao: string | null; criado_em: string }>;
      conteudos: Linha<{
        id: string; empresa_id: string; data: string; hora: string | null; formato: FormatoConteudo; tipo: string | null;
        pilar: string | null; tema: string; objetivo: string | null; roteiro: string | null; legenda: string | null; cta: string | null;
        orientacao_arte: string | null; ganchos: string[]; notas: string | null; status: StatusConteudo; origem: Origem; pecas?: Pecas | null;
        campanha_id: string | null; criado_por: string | null; criado_em: string; atualizado_em: string;
      }>;
      stories: Linha<{
        id: string; empresa_id: string; data: string; objetivo: string | null; telas: TelaStory[]; status: StatusConteudo;
        origem: Origem; conteudo_id: string | null; criado_por: string | null; criado_em: string; atualizado_em: string;
      }>;
      tarefas: Linha<{
        id: string; empresa_id: string; titulo: string; conteudo_id: string | null; tipo: TipoTarefa; responsavel_id: string | null;
        prazo: string | null; prioridade: Prioridade; status: StatusTarefa; concluido_em: string | null; origem: Origem;
        criado_por: string | null; criado_em: string; atualizado_em: string;
      }>;
      comentarios: Linha<{ id: string; empresa_id: string; tarefa_id: string | null; conteudo_id: string | null; autor_id: string; texto: string; criado_em: string }>;
      metricas_semanais: Linha<{
        empresa_id: string; semana: string; fim: string; fonte: FonteMetrica; seguidores: number | null; seguidores_ganhos: number | null;
        seguidores_perdidos: number | null; visualizacoes: number | null; alcance: number | null; interacoes: number | null;
        alcance_posts: number | null; compartilhamentos: number | null; salvamentos: number | null; posts: number | null; reels: number | null;
        stories: number | null; respostas_stories: number | null; cliques_link: number | null; mensagens_direct: number | null;
        dias_com_dados: number; ultimo_dia: string | null; editado_manual: boolean; notas: string | null; atualizado_em: string;
      }>;
      resultados_posts: Linha<{
        id: string; empresa_id: string; id_externo: string | null; publicado_em: string; formato: FormatoConteudo | null; titulo: string | null;
        url: string | null; alcance: number | null; visualizacoes: number | null; curtidas: number | null; comentarios: number | null;
        salvamentos: number | null; compartilhamentos: number | null; interacoes: number | null; seguidores_ganhos: number | null;
        tempo_medio: number | null; taxa_visualizacao: number | null; fonte: FonteMetrica; conteudo_id: string | null; atualizado_em: string;
      }>;
      sugestoes: Linha<{
        id: string; empresa_id: string; semana: string; gerado_em: string; gerado_por: string | null; resumo: string;
        dados_reais_usados: string[]; manter: string[]; melhorar: string[]; testar: string[]; ideias: IdeiaSugestao[];
      }>;
    };
    Views: { [_ in never]: never };
    Functions: {
      papel_em: { Args: { p_empresa: string }; Returns: Papel | null };
      e_membro: { Args: { p_empresa: string }; Returns: boolean };
      e_dono: { Args: { p_empresa: string }; Returns: boolean };
      pode_editar: { Args: { p_empresa: string }; Returns: boolean };
      pode_colaborar: { Args: { p_empresa: string }; Returns: boolean };
      ver_convite: { Args: { p_token: string }; Returns: { empresa_nome: string; papel: Papel; email: string; expirado: boolean; aceito: boolean }[] };
      aceitar_convite: { Args: { p_token: string }; Returns: string };
      criar_empresa: { Args: { p_dados: Json }; Returns: string };
      ritmo_semanal_padrao: { Args: Record<string, never>; Returns: RitmoDia[] };
      metas_padrao: { Args: Record<string, never>; Returns: Metas };
    };
    Enums: {
      papel_membro: Papel; formato_conteudo: FormatoConteudo; status_conteudo: StatusConteudo; origem_item: Origem;
      tipo_tarefa: TipoTarefa; prioridade_tarefa: Prioridade; status_tarefa: StatusTarefa; fonte_metrica: FonteMetrica;
      tipo_tela_story: TipoTelaStory;
    };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Tabelas = Database["estudio"]["Tables"];
export type Empresa = Tabelas["empresas"]["Row"];
export type Perfil = Tabelas["perfis"]["Row"];
export type Membro = Tabelas["membros"]["Row"];
export type Convite = Tabelas["convites"]["Row"];
export type Campanha = Tabelas["campanhas"]["Row"];
export type Conteudo = Tabelas["conteudos"]["Row"];
export type Story = Tabelas["stories"]["Row"];
export type Tarefa = Tabelas["tarefas"]["Row"];
export type Comentario = Tabelas["comentarios"]["Row"];
export type MetricaSemanal = Tabelas["metricas_semanais"]["Row"];
export type ResultadoPost = Tabelas["resultados_posts"]["Row"];
export type Sugestao = Tabelas["sugestoes"]["Row"];
