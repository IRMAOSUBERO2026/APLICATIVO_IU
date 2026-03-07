export type CompraStatus = "pendente" | "aprovada" | "recebida" | "cancelada";
export type FormaPagamento = "boleto" | "pix" | "transferencia" | "cartao" | "dinheiro";
export type OrigemLancamento = "manual" | "xml" | "pdf";

export interface ItemCompra {
  id: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  subtotal: number;
  categoria: string;
}

export interface Compra {
  id: string;
  numero: string;
  fornecedor: string;
  cnpjFornecedor: string;
  dataEmissao: string;
  dataEntrega: string;
  obra: string;
  status: CompraStatus;
  origem: OrigemLancamento;
  formaPagamento: FormaPagamento;
  parcelas: number;
  observacoes: string;
  itens: ItemCompra[];
  totalCompra: number;
  nfeNumero?: string;
  nfeChave?: string;
}

export const STATUS_LABELS: Record<CompraStatus, string> = {
  pendente: "Pendente",
  aprovada: "Aprovada",
  recebida: "Recebida",
  cancelada: "Cancelada",
};

export const STATUS_COLORS: Record<CompraStatus, string> = {
  pendente: "bg-warning/20 text-warning-foreground border-warning/30",
  aprovada: "bg-primary/15 text-primary border-primary/30",
  recebida: "bg-success/15 text-success border-success/30",
  cancelada: "bg-destructive/15 text-destructive border-destructive/30",
};

export const ORIGEM_LABELS: Record<OrigemLancamento, string> = {
  manual: "Manual",
  xml: "XML (NF-e)",
  pdf: "PDF",
};

export const CATEGORIAS_MATERIAL = [
  "Cimento e Argamassa",
  "Aço e Ferragens",
  "Madeira",
  "Elétrica",
  "Hidráulica",
  "Pintura",
  "Acabamento",
  "EPI",
  "Ferramentas",
  "Outros",
];

export const UNIDADES = ["un", "kg", "m", "m²", "m³", "l", "pç", "cx", "sc", "tn"];
