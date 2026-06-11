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
 * Gera uma assinatura em escrita cursiva a partir do nome.
 * Retorna um PNG (dataURL) com fundo transparente.
 */
export function gerarAssinaturaCursiva(nome: string): string {
  const W = 600;
  const H = 200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#0f172a";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";

  // Ajusta o tamanho da fonte para caber o nome
  let fontSize = 70;
  const fontFamily = `'Brush Script MT', 'Segoe Script', 'Snell Roundhand', 'Lucida Handwriting', cursive`;
  do {
    ctx.font = `italic ${fontSize}px ${fontFamily}`;
    if (ctx.measureText(nome).width <= W - 40) break;
    fontSize -= 4;
  } while (fontSize > 24);

  ctx.font = `italic ${fontSize}px ${fontFamily}`;
  ctx.fillText(nome, W / 2, H / 2 - 12);

  // Linha de assinatura
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, H / 2 + 30);
  ctx.lineTo(W - 40, H / 2 + 30);
  ctx.stroke();

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
