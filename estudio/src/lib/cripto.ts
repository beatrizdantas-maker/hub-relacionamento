import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Cifra tokens de integração (Metricool) com AES-256-GCM antes de gravar no banco.
 * Só roda no servidor. A chave vem de ESTUDIO_CRYPTO_KEY (32 bytes em base64).
 * Formato gravado: "v1.<iv>.<tag>.<cifrado>" (tudo em base64url).
 */
function chave(): Buffer {
  const bruta = process.env.ESTUDIO_CRYPTO_KEY;
  if (!bruta) throw new Error("ESTUDIO_CRYPTO_KEY não configurada");
  const k = Buffer.from(bruta, "base64");
  if (k.length !== 32) throw new Error("ESTUDIO_CRYPTO_KEY precisa ter 32 bytes (openssl rand -base64 32)");
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", chave(), iv);
  const cifrado = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), cifrado.toString("base64url")].join(".");
}

export function decifrar(empacotado: string): string {
  const [versao, iv, tag, cifrado] = empacotado.split(".");
  if (versao !== "v1" || !iv || !tag || !cifrado) throw new Error("Token cifrado em formato inválido");
  const decipher = createDecipheriv("aes-256-gcm", chave(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(cifrado, "base64url")), decipher.final()]).toString("utf8");
}

/** Mostra só o fim do token na interface (ex.: "••••••••a1b2"). */
export function mascarar(token: string): string {
  return "••••••••" + token.slice(-4);
}
