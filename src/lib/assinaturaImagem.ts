import { supabase } from "@/integrations/supabase/client";
import { normalizeStorageUrl } from "@/lib/storageUrl";

/**
 * Geração de imagens de assinatura/rubrica para documentos com validade jurídica.
 *
 * Estratégia:
 * 1. Se o funcionário cadastrou uma assinatura no Portal (assinaturas_perfil.assinatura_url),
 *    usamos a imagem real desenhada por ele.
 * 2. Caso contrário, geramos um "carimbo" de assinatura em escrita cursiva (canvas)
 *    contendo o nome por extenso + CPF, servindo como rubrica/assinatura eletrônica.
 */

export interface AssinaturaFuncionario {
  assinaturaDataUrl: string | null; // imagem cadastrada no portal (PNG dataURL)
  selfieUrl: string | null;
  cpfConfirmado: boolean;
  origem: "portal" | "carimbo";
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(normalizeStorageUrl(url));
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.onerror = () => resolve(null as any);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Gera um "carimbo" de assinatura padrão a partir do nome (e CPF, quando houver).
 * Usado para funcionários que ainda NÃO cadastraram a assinatura no Portal.
 * Retorna um PNG (dataURL). Nunca retorna vazio se houver nome.
 */
export function gerarAssinaturaCursiva(nome: string, cpf?: string | null): string {
  const W = 600;
  const H = 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const nomeSeguro = (nome || "Colaborador").trim();

  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // 1) Nome em escrita cursiva (assinatura)
  ctx.fillStyle = "#0f172a";
  let fontSize = 64;
  const fontFamily = `'Brush Script MT', 'Segoe Script', 'Snell Roundhand', 'Lucida Handwriting', cursive`;
  do {
    ctx.font = `italic ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(nomeSeguro).width <= W - 60) break;
    fontSize -= 4;
  } while (fontSize > 22);
  ctx.font = `italic ${fontSize}px ${fontFamily}`;
  ctx.fillText(nomeSeguro, W / 2, H / 2 - 22);

  // 2) Linha de assinatura
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, H / 2 + 16);
  ctx.lineTo(W - 40, H / 2 + 16);
  ctx.stroke();

  // 3) Carimbo com dados (nome impresso + CPF) abaixo da linha
  ctx.fillStyle = "#1A3D0A";
  ctx.font = `bold 22px Arial, Helvetica, sans-serif`;
  ctx.fillText(nomeSeguro.toUpperCase(), W / 2, H / 2 + 38);

  if (cpf) {
    ctx.fillStyle = "#475569";
    ctx.font = `18px Arial, Helvetica, sans-serif`;
    ctx.fillText(`CPF: ${cpf}`, W / 2, H / 2 + 62);
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = `italic 14px Arial, Helvetica, sans-serif`;
  ctx.fillText("Assinatura eletrônica - MP 2.200-2/2001 / Lei 14.063/2020", W / 2, H / 2 + 84);

  return canvas.toDataURL("image/png");
}

/**
 * Carrega a assinatura do funcionário (portal) ou gera o carimbo cursivo.
 * Sempre retorna uma imagem utilizável (assinaturaDataUrl nunca é vazio se houver nome).
 */
export async function carregarAssinaturaFuncionario(
  funcionarioId: string,
  nome: string
): Promise<AssinaturaFuncionario> {
  let assinaturaDataUrl: string | null = null;
  let selfieUrl: string | null = null;
  let cpfConfirmado = false;
  let origem: "portal" | "carimbo" = "carimbo";

  try {
    const { data: perfil } = await supabase
      .from("assinaturas_perfil")
      .select("assinatura_url, selfie_url, cpf_confirmado")
      .eq("funcionario_id", funcionarioId)
      .maybeSingle();

    if (perfil?.assinatura_url) {
      assinaturaDataUrl = await fetchAsDataUrl(perfil.assinatura_url);
      selfieUrl = perfil.selfie_url ?? null;
      cpfConfirmado = !!perfil.cpf_confirmado;
      if (assinaturaDataUrl) origem = "portal";
    }
  } catch {
    /* ignore */
  }

  // Fallback: carimbo cursivo gerado a partir do nome
  if (!assinaturaDataUrl && nome) {
    assinaturaDataUrl = gerarAssinaturaCursiva(nome);
    origem = "carimbo";
  }

  return { assinaturaDataUrl, selfieUrl, cpfConfirmado, origem };
}
