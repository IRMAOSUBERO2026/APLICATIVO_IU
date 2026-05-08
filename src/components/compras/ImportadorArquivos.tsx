import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, FileCode, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Compra, ItemCompra } from "./types";
import { toast } from "sonner";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ImportadorArquivosProps {
  onImport: (compra: Partial<Compra>) => void;
  obras: string[];
}

// ─── XML NF-e parser ────────────────────────────────────────────────────────
function parseXMLNFe(xmlText: string): Partial<Compra> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const getText = (tag: string, parent?: Element | Document): string => {
    const el = (parent || doc).getElementsByTagName(tag)[0];
    return el?.textContent?.trim() || "";
  };

  const emit = doc.getElementsByTagName("emit")[0];
  const fornecedor = emit ? getText("xNome", emit) : "";
  const cnpj = emit ? getText("CNPJ", emit) : "";

  const ide = doc.getElementsByTagName("ide")[0];
  const nfeNumero = ide ? getText("nNF", ide) : "";
  const dataRaw = ide ? (getText("dhEmi", ide) || getText("dEmi", ide)) : "";
  const dataEmissao = dataRaw.split("T")[0] || dataRaw;

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  const nfeChave = infNFe?.getAttribute("Id")?.replace("NFe", "") || "";

  const dets = doc.getElementsByTagName("det");
  const itens: ItemCompra[] = [];
  for (let i = 0; i < dets.length; i++) {
    const det = dets[i];
    const prod = det.getElementsByTagName("prod")[0];
    if (!prod) continue;
    const descricao = getText("xProd", prod);
    const unidade = (getText("uCom", prod) || "un").toLowerCase();
    const quantidade = parseFloat(getText("qCom", prod)) || 0;
    const valorUnitario = parseFloat(getText("vUnCom", prod)) || 0;
    itens.push({
      id: crypto.randomUUID(),
      descricao,
      unidade,
      quantidade,
      valorUnitario,
      subtotal: quantidade * valorUnitario,
      categoria: "Outros",
    });
  }

  const totalCompra = itens.reduce((s, i) => s + i.subtotal, 0);
  return {
    fornecedor,
    cnpjFornecedor: cnpj,
    nfeNumero,
    nfeChave,
    dataEmissao,
    itens,
    totalCompra,
    origem: "xml",
  };
}

// ─── PDF parser (heurístico) ────────────────────────────────────────────────
async function extractTextFromPDF(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    text += content.items.map((it: any) => it.str).join(" ") + "\n";
  }
  return text;
}

function parsePDFNota(text: string, fileName: string): Partial<Compra> {
  const norm = text.replace(/\s+/g, " ");

  // CNPJ
  const cnpjMatch = norm.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/);
  const cnpj = cnpjMatch?.[0] || "";

  // Nº NF-e
  const nfMatch = norm.match(/(?:n[º°o]?\s*(?:da\s*)?(?:nota|nf-?e?)[\s.:]*)(\d{3,9})/i)
    || norm.match(/n[º°o]?\.?\s*(\d{6,9})/);
  const nfeNumero = nfMatch?.[1] || "";

  // Chave de acesso (44 dígitos)
  const chaveMatch = norm.match(/(\d[\s.]*){44}/);
  const nfeChave = chaveMatch ? chaveMatch[0].replace(/\D/g, "") : "";

  // Data emissão
  const dataMatch = norm.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  const dataEmissao = dataMatch
    ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`
    : new Date().toISOString().split("T")[0];

  // Fornecedor: tenta capturar primeira linha em maiúsculas longa
  let fornecedor = "";
  const linhas = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  for (const l of linhas.slice(0, 30)) {
    if (l.length > 8 && l.length < 80 && /[A-ZÁÉÍÓÚÃÂÊÔÇ]/.test(l) && l === l.toUpperCase() && !/^\d/.test(l)) {
      fornecedor = l.replace(/\s{2,}/g, " ");
      break;
    }
  }

  // Total
  const totalMatch = norm.match(/(?:valor\s*total|total\s*da\s*nota|total\s*nf)[^\d]*([\d.,]+)/i);
  const totalCompra = totalMatch ? parseFloat(totalMatch[1].replace(/\./g, "").replace(",", ".")) || 0 : 0;

  return {
    fornecedor,
    cnpjFornecedor: cnpj,
    nfeNumero,
    nfeChave,
    dataEmissao,
    totalCompra,
    itens: [],
    origem: "pdf",
    observacoes: `Importado de ${fileName}. Confira itens e valores.`,
  };
}

// ────────────────────────────────────────────────────────────────────────────
interface ArquivoStatus { nome: string; tipo: string; status: "sucesso" | "erro"; itens?: number; }

export function ImportadorArquivos({ onImport }: ImportadorArquivosProps) {
  const [arquivos, setArquivos] = useState<ArquivoStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setLoading(true);
    const novos: ArquivoStatus[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      try {
        if (ext === "xml") {
          const text = await file.text();
          const data = parseXMLNFe(text);
          if (data.itens && data.itens.length > 0) {
            onImport(data);
            novos.push({ nome: file.name, tipo: "XML", status: "sucesso", itens: data.itens.length });
            toast.success(`${file.name}: ${data.itens.length} itens`);
          } else {
            novos.push({ nome: file.name, tipo: "XML", status: "erro" });
            toast.error(`${file.name}: nenhum item encontrado`);
          }
        } else if (ext === "pdf") {
          const text = await extractTextFromPDF(file);
          const data = parsePDFNota(text, file.name);
          onImport(data);
          novos.push({ nome: file.name, tipo: "PDF", status: "sucesso" });
          toast.success(`${file.name}: dados extraídos. Confira/adicione os itens manualmente.`);
        } else {
          novos.push({ nome: file.name, tipo: ext || "?", status: "erro" });
          toast.error(`${file.name}: formato não suportado`);
        }
      } catch (err: any) {
        console.error(err);
        novos.push({ nome: file.name, tipo: ext || "?", status: "erro" });
        toast.error(`${file.name}: ${err?.message || "erro ao processar"}`);
      }
    }

    setArquivos(prev => [...prev, ...novos]);
    setLoading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />Importar Arquivos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Selecione um ou mais arquivos <Badge variant="outline" className="mx-1"><FileCode className="h-3 w-3 mr-1" />XML</Badge>
            ou <Badge variant="outline" className="mx-1"><FileText className="h-3 w-3 mr-1" />PDF</Badge>.
            Cada arquivo gera uma compra com os dados extraídos automaticamente.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml,.pdf"
            multiple
            onChange={handleFileChange}
            className="hidden"
            id="import-file"
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {loading ? "Processando..." : "Selecionar arquivos"}
          </Button>

          {arquivos.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pt-2 border-t">
              {arquivos.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded border ${
                    a.status === "sucesso"
                      ? "bg-success/10 border-success/30 text-success"
                      : "bg-destructive/10 border-destructive/30 text-destructive"
                  }`}
                >
                  {a.status === "sucesso" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  <span className="font-medium">{a.tipo}</span>
                  <span className="truncate flex-1">{a.nome}</span>
                  {a.itens != null && <span className="opacity-70">{a.itens} itens</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
