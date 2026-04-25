import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileText, Download, Send, Save, Bot, Loader2, Info, Printer, Mail, FolderOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gerarTextoDocumentoOficial, TipoDocumentoOficial } from "@/lib/motorIaDocumentos";
import { gerarPdfA4, downloadBlob, imprimirBlob, EmpresaPdf } from "@/lib/gerarPdfOficial";

interface FuncionarioSimplificado {
  id: string;
  nome: string;
  cargo: string;
  telefone: string | null;
  email: string | null;
  empresa_id: string | null;
  empresa: EmpresaPdf | null;
}

interface DocumentoGerado {
  funcionarioId: string;
  funcionarioNome: string;
  funcionarioTelefone: string | null;
  funcionarioEmail: string | null;
  tipo: TipoDocumentoOficial;
  pasta: string;
  fileName: string;
  path: string;
  publicUrl: string;
  dataUpload: string; // ISO
  empresa: EmpresaPdf | null;
}

const TIPO_LABEL: Record<TipoDocumentoOficial, string> = {
  advertencia: "Advertência",
  suspensao: "Suspensão",
  comunicado: "Comunicado",
  recibo: "Recibo",
  justificativa_falta: "Justificativa",
};

const PASTAS_DOC: Record<TipoDocumentoOficial, string> = {
  advertencia: "Advertências",
  suspensao: "Advertências",
  comunicado: "Comunicados",
  recibo: "Holerites",
  justificativa_falta: "Cartão Ponto",
};

export function GeradorDocumentos() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioSimplificado[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form
  const [funcId, setFuncId] = useState<string>("");
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoOficial>("advertencia");
  const [contextoUsuario, setContextoUsuario] = useState("");

  // Resultado
  const [textoGerado, setTextoGerado] = useState("");
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Histórico
  const [historico, setHistorico] = useState<DocumentoGerado[]>([]);
  const [carregandoHist, setCarregandoHist] = useState(false);

  // ---- Carrega funcionários + empresas completas ----
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("funcionarios")
        .select("id, nome, cargo, telefone, email, empresa_id")
        .eq("status", "ativo")
        .order("nome");

      if (data) {
        const empresaIds = [...new Set(data.filter(f => f.empresa_id).map(f => f.empresa_id))];
        const { data: empresasm } = await supabase
          .from("empresas")
          .select("id, razao_social, nome_fantasia, cnpj, endereco, cidade, uf, cep, telefone, email, logo_url, cor_primaria, cor_secundaria")
          .in("id", empresaIds);

        const empMap = new Map(empresasm?.map(e => [e.id, e]) || []);

        const fFormatado: FuncionarioSimplificado[] = data.map(f => ({
          id: f.id,
          nome: f.nome,
          cargo: f.cargo || "Não Informado",
          telefone: f.telefone,
          email: f.email,
          empresa_id: f.empresa_id,
          empresa: f.empresa_id ? (empMap.get(f.empresa_id) as EmpresaPdf) || null : null,
        }));
        setFuncionarios(fFormatado);
      }
      setLoadingConfig(false);
    }
    load();
  }, []);

  // ---- Carrega histórico de documentos ----
  const carregarHistorico = useCallback(async () => {
    if (funcionarios.length === 0) return;
    setCarregandoHist(true);
    try {
      const docs: DocumentoGerado[] = [];
      // Iteramos cada funcionário e cada pasta de documentos oficiais
      const pastasUnicas = [...new Set(Object.values(PASTAS_DOC))];
      for (const f of funcionarios) {
        for (const pasta of pastasUnicas) {
          const prefix = `funcionarios/${f.id}/${pasta}`;
          const { data: files } = await supabase.storage.from("documentos").list(prefix, {
            limit: 50,
            sortBy: { column: "created_at", order: "desc" },
          });
          (files || []).forEach(file => {
            // Tenta inferir o tipo a partir do prefixo do nome
            const baseNome = file.name.toLowerCase();
            let tipo: TipoDocumentoOficial = "comunicado";
            if (baseNome.startsWith("advertencia")) tipo = "advertencia";
            else if (baseNome.startsWith("suspensao")) tipo = "suspensao";
            else if (baseNome.startsWith("recibo")) tipo = "recibo";
            else if (baseNome.startsWith("justificativa")) tipo = "justificativa_falta";
            else if (baseNome.startsWith("comunicado")) tipo = "comunicado";

            const fullPath = `${prefix}/${file.name}`;
            const { data: pub } = supabase.storage.from("documentos").getPublicUrl(fullPath);
            docs.push({
              funcionarioId: f.id,
              funcionarioNome: f.nome,
              funcionarioTelefone: f.telefone,
              funcionarioEmail: f.email,
              tipo,
              pasta,
              fileName: file.name,
              path: fullPath,
              publicUrl: pub.publicUrl,
              dataUpload: file.created_at || new Date().toISOString(),
              empresa: f.empresa,
            });
          });
        }
      }
      docs.sort((a, b) => b.dataUpload.localeCompare(a.dataUpload));
      setHistorico(docs.slice(0, 30));
    } finally {
      setCarregandoHist(false);
    }
  }, [funcionarios]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  // ---- Gerar texto ----
  const handleGerar = () => {
    if (!funcId) {
      toast({ title: "Selecione um funcionário", variant: "destructive" });
      return;
    }
    const func = funcionarios.find(f => f.id === funcId);
    if (!func) return;

    setGerando(true);
    setTimeout(() => {
      const docFinal = gerarTextoDocumentoOficial({
        tipo: tipoDoc,
        nomeFuncionario: func.nome,
        cargoFuncionario: func.cargo,
        nomeEmpresa: func.empresa?.nome_fantasia || func.empresa?.razao_social || "Empresa",
        contexto: contextoUsuario,
      });
      setTextoGerado(docFinal);
      setGerando(false);
    }, 900);
  };

  const formatFileName = (tipo: string, nome: string) => {
    const dataHoje = new Date().toISOString().slice(0, 10);
    const hora = new Date().toTimeString().slice(0, 5).replace(":", "");
    return `${tipo}_${nome.replace(/[^a-zA-Z0-9]/g, "_")}_${dataHoje}_${hora}.pdf`;
  };

  const formatPhone = (tel: string) => {
    const clean = tel.replace(/\D/g, "");
    return clean.startsWith("55") ? clean : `55${clean}`;
  };

  // ---- Ações sobre o documento atualmente gerado ----
  const funcSelecionado = funcionarios.find(f => f.id === funcId);

  const handleDownload = async () => {
    if (!textoGerado || !funcSelecionado) return;
    const fname = formatFileName(tipoDoc, funcSelecionado.nome);
    const blob = await gerarPdfA4(textoGerado, fname, funcSelecionado.empresa);
    downloadBlob(blob, fname);
  };

  const handleImprimir = async () => {
    if (!textoGerado || !funcSelecionado) return;
    const fname = formatFileName(tipoDoc, funcSelecionado.nome);
    const blob = await gerarPdfA4(textoGerado, fname, funcSelecionado.empresa);
    imprimirBlob(blob);
  };

  const handleWhatsApp = () => {
    if (!textoGerado || !funcSelecionado) return;
    const zapText = `Olá ${funcSelecionado.nome},\nSegue documento oficial do RH para sua ciência:\n\n---------------------------------\n${textoGerado}\n---------------------------------\n\nPor favor, confirme o recebimento.`;
    if (funcSelecionado.telefone) {
      window.open(`https://wa.me/${formatPhone(funcSelecionado.telefone)}?text=${encodeURIComponent(zapText)}`, "_blank");
    } else {
      navigator.clipboard.writeText(zapText);
      toast({ title: "Texto copiado", description: "Funcionário sem telefone cadastrado." });
    }
  };

  const handleEmail = () => {
    if (!textoGerado || !funcSelecionado) return;
    const assunto = `${TIPO_LABEL[tipoDoc]} - ${funcSelecionado.nome}`;
    const corpo = textoGerado;
    const dest = funcSelecionado.email || "";
    window.location.href = `mailto:${dest}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  };

  const handleSalvarRh = async () => {
    if (!textoGerado || !funcSelecionado) return;
    setSalvando(true);
    try {
      const fname = formatFileName(tipoDoc, funcSelecionado.nome);
      const blob = await gerarPdfA4(textoGerado, fname, funcSelecionado.empresa);
      const file = new File([blob], fname, { type: "application/pdf" });
      const pasta = PASTAS_DOC[tipoDoc];
      const filePath = `funcionarios/${funcSelecionado.id}/${pasta}/${fname}`;

      const { error } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true });
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Documento anexado", description: `Salvo em ${pasta} do funcionário.` });
        carregarHistorico();
      }
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  // ---- Ações sobre item do histórico ----
  const baixarHistorico = async (doc: DocumentoGerado) => {
    const { data, error } = await supabase.storage.from("documentos").download(doc.path);
    if (error || !data) {
      toast({ title: "Erro ao baixar", description: error?.message, variant: "destructive" });
      return;
    }
    downloadBlob(data, doc.fileName);
  };

  const imprimirHistorico = async (doc: DocumentoGerado) => {
    const { data, error } = await supabase.storage.from("documentos").download(doc.path);
    if (error || !data) {
      toast({ title: "Erro ao imprimir", description: error?.message, variant: "destructive" });
      return;
    }
    imprimirBlob(data);
  };

  const whatsappHistorico = (doc: DocumentoGerado) => {
    const msg = `Olá ${doc.funcionarioNome}, segue link do documento oficial (${TIPO_LABEL[doc.tipo]}): ${doc.publicUrl}`;
    if (doc.funcionarioTelefone) {
      window.open(`https://wa.me/${formatPhone(doc.funcionarioTelefone)}?text=${encodeURIComponent(msg)}`, "_blank");
    } else {
      navigator.clipboard.writeText(msg);
      toast({ title: "Link copiado", description: "Funcionário sem telefone cadastrado." });
    }
  };

  const emailHistorico = (doc: DocumentoGerado) => {
    const dest = doc.funcionarioEmail || "";
    const assunto = `${TIPO_LABEL[doc.tipo]} - ${doc.funcionarioNome}`;
    const corpo = `Segue documento oficial em anexo (link): ${doc.publicUrl}`;
    window.location.href = `mailto:${dest}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  };

  if (loadingConfig) {
    return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin h-6 w-6 mx-auto mb-2" /> Carregando motor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-primary/20 bg-primary/5 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Motor de Documentos Oficiais</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">1. Funcionário</Label>
                <Select value={funcId} onValueChange={setFuncId}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.map(f => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.nome} <span className="text-muted-foreground text-[10px]">({f.cargo})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {funcSelecionado?.empresa && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Empresa: <span className="font-semibold">{funcSelecionado.empresa.nome_fantasia || funcSelecionado.empresa.razao_social}</span>
                    {funcSelecionado.empresa.logo_url && <span className="ml-2 text-success">• logo carregada</span>}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">2. Tipo de Documento</Label>
                <Select value={tipoDoc} onValueChange={(v: TipoDocumentoOficial) => setTipoDoc(v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="advertencia">Advertência Disciplinar</SelectItem>
                    <SelectItem value="suspensao">Suspensão de Contrato</SelectItem>
                    <SelectItem value="comunicado">Comunicado Formal</SelectItem>
                    <SelectItem value="recibo">Recibo de Pagamento Avulso</SelectItem>
                    <SelectItem value="justificativa_falta">Justificativa de Faltas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">3. Contexto / Motivo</Label>
                <Textarea
                  placeholder="Ex: Miguel foi flagrado sem cinto de segurança em trabalho em altura na obra Terrace, mesmo após advertência verbal..."
                  className="bg-background resize-none"
                  rows={5}
                  value={contextoUsuario}
                  onChange={e => setContextoUsuario(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground"><Info className="inline h-3 w-3 mr-1" />O sistema aplica automaticamente a fundamentação legal CLT.</p>
              </div>

              <Button onClick={handleGerar} disabled={gerando || !funcId} className="w-full gap-2 mt-2">
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {gerando ? "Formatando..." : "Gerar Documento"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita: pré-visualização */}
        <div className="lg:col-span-7 space-y-4">
          {textoGerado && funcSelecionado ? (
            <Card className="shadow-sm border-muted">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-end mb-2 border-b pb-3">
                  <div>
                    <Badge variant="outline" className="mb-2">{TIPO_LABEL[tipoDoc].toUpperCase()}</Badge>
                    <h3 className="font-semibold text-lg">Documento Pronto</h3>
                    <p className="text-xs text-muted-foreground">Para: {funcSelecionado.nome}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button size="sm" variant="outline" onClick={handleImprimir} title="Imprimir" className="gap-1.5">
                      <Printer className="h-3.5 w-3.5" /> Imprimir
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDownload} title="Baixar PDF" className="gap-1.5">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleWhatsApp} title="WhatsApp" className="gap-1.5 text-success hover:text-success hover:bg-success/10">
                      <Send className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleEmail} title="Email" className="gap-1.5">
                      <Mail className="h-3.5 w-3.5" /> E-mail
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Edite livremente o texto antes de salvar/exportar.</Label>
                  <Textarea
                    value={textoGerado}
                    onChange={e => setTextoGerado(e.target.value)}
                    className="font-mono text-sm leading-relaxed p-4 h-[380px] bg-muted/20"
                  />
                </div>

                <Button onClick={handleSalvarRh} disabled={salvando} className="w-full gap-2 bg-success text-success-foreground hover:bg-success/90">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {salvando ? "Salvando..." : "Anexar PDF no Prontuário do Funcionário (RH)"}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full min-h-[380px] border-2 border-dashed rounded-xl flex items-center justify-center p-8 bg-muted/10">
              <div className="text-center space-y-2">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">O documento gerado aparecerá aqui.</p>
                <p className="text-[11px] text-muted-foreground">Será impresso com logo, dados e cores da empresa do funcionário.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de documentos gerados */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Documentos já emitidos</h3>
              <Badge variant="secondary" className="text-[10px]">{historico.length}</Badge>
            </div>
            <Button size="sm" variant="ghost" onClick={carregarHistorico} disabled={carregandoHist} className="gap-1.5 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 ${carregandoHist ? "animate-spin" : ""}`} /> Atualizar
            </Button>
          </div>

          {carregandoHist && historico.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" /> Carregando histórico...
            </div>
          ) : historico.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              Nenhum documento oficial gerado ainda.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-muted-foreground border-b">
                  <tr>
                    <th className="text-left py-2 px-2 font-semibold">Tipo</th>
                    <th className="text-left py-2 px-2 font-semibold">Funcionário</th>
                    <th className="text-left py-2 px-2 font-semibold">Arquivo</th>
                    <th className="text-left py-2 px-2 font-semibold">Data</th>
                    <th className="text-right py-2 px-2 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {historico.map(doc => (
                    <tr key={doc.path} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-[10px]">{TIPO_LABEL[doc.tipo]}</Badge>
                      </td>
                      <td className="py-2 px-2 font-medium">{doc.funcionarioNome}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground truncate max-w-[260px]" title={doc.fileName}>{doc.fileName}</td>
                      <td className="py-2 px-2 text-xs text-muted-foreground">
                        {new Date(doc.dataUpload).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Imprimir" onClick={() => imprimirHistorico(doc)}>
                            <Printer className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Baixar PDF" onClick={() => baixarHistorico(doc)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-success hover:text-success hover:bg-success/10" title="WhatsApp" onClick={() => whatsappHistorico(doc)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="E-mail" onClick={() => emailHistorico(doc)}>
                            <Mail className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
