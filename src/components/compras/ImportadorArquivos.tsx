import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, FileCode, AlertCircle, CheckCircle2 } from "lucide-react";
import { Compra, ItemCompra } from "./types";
import { toast } from "sonner";

interface ImportadorArquivosProps {
  onImport: (compra: Partial<Compra>) => void;
  obras: string[];
}

function parseXMLNFe(xmlText: string): Partial<Compra> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "text/xml");

  const getText = (tag: string, parent?: Element): string => {
    const el = parent ? parent.getElementsByTagName(tag)[0] : doc.getElementsByTagName(tag)[0];
    return el?.textContent?.trim() || "";
  };

  const emit = doc.getElementsByTagName("emit")[0];
  const fornecedor = getText("xNome", emit);
  const cnpj = getText("CNPJ", emit);

  const ide = doc.getElementsByTagName("ide")[0];
  const nfeNumero = getText("nNF", ide);
  const dataEmissao = getText("dhEmi", ide).split("T")[0] || getText("dEmi", ide);

  const infNFe = doc.getElementsByTagName("infNFe")[0];
  const nfeChave = infNFe?.getAttribute("Id")?.replace("NFe", "") || "";

  const dets = doc.getElementsByTagName("det");
  const itens: ItemCompra[] = [];

  for (let i = 0; i < dets.length; i++) {
    const det = dets[i];
    const prod = det.getElementsByTagName("prod")[0];
    if (!prod) continue;

    const descricao = getText("xProd", prod);
    const unidade = getText("uCom", prod).toLowerCase();
    const quantidade = parseFloat(getText("qCom", prod)) || 0;
    const valorUnitario = parseFloat(getText("vUnCom", prod)) || 0;

    itens.push({
      id: crypto.randomUUID(),
      descricao,
      unidade: unidade || "un",
      quantidade,
      valorUnitario,
      subtotal: quantidade * valorUnitario,
      categoria: "Outros",
    });
  }

  const totalCompra = itens.reduce((s, i) => s + i.subtotal, 0);

  return { fornecedor, cnpjFornecedor: cnpj, nfeNumero, nfeChave, dataEmissao, itens, totalCompra, origem: "xml" };
}

export function ImportadorArquivos({ onImport, obras }: ImportadorArquivosProps) {
  const [arquivoInfo, setArquivoInfo] = useState<{ nome: string; tipo: string; status: "sucesso" | "erro" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "xml") {
      try {
        const text = await file.text();
        const data = parseXMLNFe(text);
        if (data.itens && data.itens.length > 0) {
          setArquivoInfo({ nome: file.name, tipo: "XML", status: "sucesso" });
          onImport(data);
          toast.success(`XML importado: ${data.itens.length} itens encontrados`);
        } else {
          setArquivoInfo({ nome: file.name, tipo: "XML", status: "erro" });
          toast.error("Nenhum item encontrado no XML");
        }
      } catch {
        setArquivoInfo({ nome: file.name, tipo: "XML", status: "erro" });
        toast.error("Erro ao processar arquivo XML");
      }
    } else if (ext === "pdf") {
      setArquivoInfo({ nome: file.name, tipo: "PDF", status: "sucesso" });
      toast.info("PDF carregado. Os dados devem ser preenchidos manualmente com base no documento.");
      onImport({ origem: "pdf", observacoes: `Importado do arquivo: ${file.name}` });
    } else {
      toast.error("Formato não suportado. Use XML ou PDF.");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" />Importar Arquivo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-3">
              Importe notas fiscais em <Badge variant="outline" className="mx-1"><FileCode className="h-3 w-3 mr-1" />XML</Badge>
              para preenchimento automático ou <Badge variant="outline" className="mx-1"><FileText className="h-3 w-3 mr-1" />PDF</Badge>
              como referência para lançamento manual.
            </p>
            <input ref={fileInputRef} type="file" accept=".xml,.pdf" onChange={handleFileChange} className="hidden" id="import-file" />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />Selecionar Arquivo
            </Button>
          </div>
          {arquivoInfo && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md border ${arquivoInfo.status === "sucesso" ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
              {arquivoInfo.status === "sucesso" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{arquivoInfo.nome} ({arquivoInfo.tipo})</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
