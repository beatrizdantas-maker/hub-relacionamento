import Link from "next/link";
export default function NaoEncontrada() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-3xl font-semibold">Página não encontrada</h1>
      <p className="text-texto-2">O endereço não existe ou foi movido.</p>
      <Link href="/" className="text-primaria underline-offset-2 hover:underline">Voltar ao início</Link>
    </main>
  );
}
