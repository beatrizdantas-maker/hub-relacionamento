"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Botao } from "@/components/ui/Botao";
import { Aviso } from "@/components/ui/Aviso";
import { CampoArea, CampoTexto } from "@/components/ui/Campo";
import type { EntradaEmpresa } from "@/lib/validacao/empresa";
import { criarEmpresa, atualizarEmpresa, salvarLogo } from "@/app/(app)/empresas/acoes";
import { enviarLogo } from "@/lib/logo";
import { CampoLogo } from "./CampoLogo";
import type { Empresa, RitmoDia } from "@/lib/tipos/database";
import { CampoCor, EditorPilares, PreviaCores, metasParaTexto, ritmoOuPadrao, type MetasTexto } from "./campos";

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
  metas: MetasTexto;
  ritmo_semanal: RitmoDia[];
};

function estadoInicial(e?: Empresa | null): Estado {
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
    metas: metasParaTexto(e?.metas),
    ritmo_semanal: ritmoOuPadrao(e?.ritmo_semanal),
  };
}

const PASSOS = ["Dados da marca", "Público e objetivos"];

/**
 * Assistente de 2 passos para criar uma empresa; também serve para editar
 * (mesmos passos, botão "Salvar"). Metas e ritmo não são pedidos aqui: a
 * empresa nasce com o ritmo padrão e sem metas, e a tela Marca sugere os dois
 * a partir dos dados reais (análise do sistema).
 */
export function FormularioEmpresa({ empresa }: { empresa?: Empresa | null }) {
  const router = useRouter();
  const [passo, setPasso] = useState(0);
  const [dados, setDados] = useState<Estado>(() => estadoInicial(empresa));
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
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
      if (editando) {
        const r = await atualizarEmpresa(empresa!.id, montarEntrada());
        if (!r.ok) return setErro(r.erro);
        router.push("/empresas");
        router.refresh();
        return;
      }
      const r = await criarEmpresa(montarEntrada());
      if (!r.ok) return setErro(r.erro);
      if (logo) {
        try {
          const url = await enviarLogo(r.id, logo);
          const g = await salvarLogo(r.id, url);
          if (!g.ok) throw new Error(g.erro);
        } catch (e) {
          // A empresa já existe: avisa e segue; a logo pode ser enviada depois em Marca.
          setAviso(`Empresa criada, mas a logo não foi enviada: ${(e as Error).message} Você pode enviar depois em Marca → Identidade.`);
          router.refresh();
          return;
        }
      }
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-2 gap-2" aria-label="Passos">
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
      {aviso && <Aviso tipo="info">{aviso} <Link href="/" className="underline">Ir para o Início</Link></Aviso>}

      <div className="cartao space-y-4">
        {passo === 0 && (
          <>
            <h2 className="text-lg font-semibold">Dados da marca</h2>
            <CampoTexto rotulo="Nome da empresa" required value={dados.nome} onChange={(e) => alterar("nome", e.target.value)} placeholder="Ex.: NARAEDU" maxLength={120} />
            <CampoLogo empresaId={empresa?.id} logoAtual={empresa?.logo_url} nome={dados.nome} onArquivo={setLogo} />
            <CampoTexto rotulo="Perfil no Instagram" value={dados.perfil_instagram} onChange={(e) => alterar("perfil_instagram", e.target.value)} placeholder="@perfil" ajuda="Só o @, sem link." />
            <CampoArea rotulo="Sobre a marca" value={dados.sobre} onChange={(e) => alterar("sobre", e.target.value)} placeholder="O que a empresa faz, para quem e o que a diferencia." />
            <CampoArea rotulo="Tom de voz" value={dados.tom_de_voz} onChange={(e) => alterar("tom_de_voz", e.target.value)} placeholder="Ex.: próximo, direto, sem jargão; fala com a pessoa, não com a multidão." />
            <CampoArea rotulo="Regras de linguagem" value={dados.regras_de_linguagem} onChange={(e) => alterar("regras_de_linguagem", e.target.value)} placeholder="Ex.: nunca usar 'IA' nem 'inteligência artificial' no conteúdo publicado." ajuda="Valem para tudo que a IA escrever para esta empresa." />
            <CampoArea rotulo="Regras de imagem" value={dados.regras_de_imagem} onChange={(e) => alterar("regras_de_imagem", e.target.value)} placeholder="Ex.: fotos reais da equipe, sem banco de imagens; fundo claro." />
            <div className="grid grid-cols-2 gap-3">
              <CampoCor rotulo="Cor primária" valor={dados.cor_primaria} onChange={(v) => alterar("cor_primaria", v)} />
              <CampoCor rotulo="Cor secundária" valor={dados.cor_secundaria} onChange={(v) => alterar("cor_secundaria", v)} />
            </div>
            <PreviaCores primaria={dados.cor_primaria} secundaria={dados.cor_secundaria} />
          </>
        )}

        {passo === 1 && (
          <>
            <h2 className="text-lg font-semibold">Público e objetivos</h2>
            <CampoArea rotulo="Público" value={dados.publico} onChange={(e) => alterar("publico", e.target.value)} placeholder="Quem é a pessoa que segue e compra: idade, momento de vida, dores, desejos." />
            <CampoArea rotulo="Objetivos" value={dados.objetivos} onChange={(e) => alterar("objetivos", e.target.value)} placeholder="Ex.: gerar conversas no direct; crescer em seguidores qualificados; vender X." />
            <EditorPilares pilares={dados.pilares} onChange={(p) => alterar("pilares", p)} onErro={setErro} />
            <CampoArea rotulo="Melhores horários" value={dados.melhores_horarios} onChange={(e) => alterar("melhores_horarios", e.target.value)} placeholder="Ex.: 12h e 20h nos dias de semana; 10h aos sábados." />
            {!editando && (
              <Aviso tipo="info">
                Metas e ritmo semanal não precisam ser definidos agora. A empresa começa com o ritmo padrão e sem metas. Depois de importar os dados do Metricool, a tela Marca mostra a análise do sistema com metas e horários sugeridos a partir dos números reais.
              </Aviso>
            )}
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
}
