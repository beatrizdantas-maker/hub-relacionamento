export function EmBreve({ titulo, etapa, descricao }: { titulo: string; etapa: number; descricao: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
      <div className="cartao border-dashed text-center">
        <p className="font-medium">Chega na Etapa {etapa}</p>
        <p className="mt-1 text-sm text-texto-2">{descricao}</p>
      </div>
    </div>
  );
}
