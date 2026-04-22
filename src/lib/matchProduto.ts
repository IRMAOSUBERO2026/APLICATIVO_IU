/**
 * Heurística simples de matching produto da NF ↔ produto cadastrado no estoque.
 * Score baseado em tokens em comum normalizados (Jaccard).
 */
function normalize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length >= 2);
}

function jaccard(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  setA.forEach(t => { if (setB.has(t)) inter++; });
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

export interface ProdutoLike {
  id: string;
  descricao: string;
  codigo?: string | null;
  unidade?: string;
}

export function suggestProduto<T extends ProdutoLike>(
  itemDescricao: string,
  produtos: T[],
  threshold = 0.25,
): { produto: T; score: number } | null {
  const tokensItem = normalize(itemDescricao);
  let best: { produto: T; score: number } | null = null;

  for (const p of produtos) {
    const tokensP = normalize(`${p.descricao} ${p.codigo || ""}`);
    const score = jaccard(tokensItem, tokensP);
    if (score > (best?.score || 0)) best = { produto: p, score };
  }

  if (!best || best.score < threshold) return null;
  return best;
}
