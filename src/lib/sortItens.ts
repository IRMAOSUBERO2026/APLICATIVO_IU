// Ordenação natural para item_numero ("1", "2", "10", "1.1", "1.2", "1.10")
// Trata partes numéricas como número e partes não-numéricas como string.
export function sortByItemNumero<T extends { item_numero?: string | null }>(a: T, b: T): number {
  const parse = (s: any) =>
    String(s ?? "").split(".").map((p) => {
      const n = parseInt(p, 10);
      return Number.isNaN(n) ? p : n;
    });
  const pa = parse(a.item_numero);
  const pb = parse(b.item_numero);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const va = pa[i];
    const vb = pb[i];
    if (va === undefined) return -1;
    if (vb === undefined) return 1;
    if (typeof va === "number" && typeof vb === "number") {
      if (va !== vb) return va - vb;
    } else {
      const sa = String(va);
      const sb = String(vb);
      if (sa !== sb) return sa < sb ? -1 : 1;
    }
  }
  return 0;
}

export function ordenarItensContrato<T extends { item_numero?: string | null }>(itens: T[]): T[] {
  return [...itens].sort(sortByItemNumero);
}
