import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Users, FileText, Download, Send, Save, Bot, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gerarTextoDocumentoOficial, TipoDocumentoOficial } from "@/lib/motorIaDocumentos";
import { gerarPdfA4, downloadBlob } from "@/lib/gerarPdfOficial";

interface FuncionarioSimplificado {
  id: string;
  nome: string;
  cargo: string;
  telefone: string | null;
  empresa: { razao_social: string; nome_fantasia: string | null } | null;
}

export function GeradorDocumentos() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioSimplificado[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form State
  const [funcId, setFuncId] = useState<string>("");
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoOficial>("advertencia");
  const [contextoUsuario, setContextoUsuario] = useState("");
  
  // Generation Content
  const [textoGerado, setTextoGerado] = useState("");
  const [gerando, setGerando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("funcionarios")
        .select("id, nome, cargo, telefone, empresa_id")
        .eq("status", "ativo")
        .order("nome");
      
      if (data) {
        // Buscar empresas atreladas
        const empresaIds = [...new Set(data.filter(f => f.empresa_id).map(f => f.empresa_id))];
        const { data: empresasm } = await supabase.from("empresas").select("id, razao_social, nome_fantasia").in("id", empresaIds);
        
        const empMap = new Map(empresasm?.map(e => [e.id, e]) || []);
        
        const fFormatado = data.map(f => ({
          id: f.id,
          nome: f.nome,
          cargo: f.cargo || "Não Informado",
          telefone: f.telefone,
          empresa: f.empresa_id ? empMap.get(f.empresa_id) || null : null
        }));
        
        setFuncionarios(fFormatado);
      }
      setLoadingConfig(false);
    }
    load();
  }, []);

  const handleGerar = () => {
    if (!funcId) {
      toast({ title: "Selecione um funcionário", variant: "destructive" });
      return;
    }

    const func = funcionarios.find(f => f.id === funcId);
    if (!func) return;

    setGerando(true);
    // Simular delay de processamento LLM para melhor UX
    setTimeout(() => {
      const req = {
        tipo: tipoDoc,
        nomeFuncionario: func.nome,
        cargoFuncionario: func.cargo,
        nomeEmpresa: func.empresa?.nome_fantasia || func.empresa?.razao_social || "Empresa Logada",
        contexto: contextoUsuario
      };

      const docFinal = gerarTextoDocumentoOficial(req);
      setTextoGerado(docFinal);
      setGerando(false);
    }, 1200);
  };

  const mapTipoParaPasta = (tipo: TipoDocumentoOficial): string => {
    switch (tipo) {
      case "advertencia": return "Advertências";
      case "suspensao": return "Advertências";
      case "recibo": return "Holerites";
      case "justificativa_falta": return "Cartão Ponto";
      default: return "Documentos";
    }
  };

  const formatFileName = (tipo: string, func_nome: string) => {
    const dataHoje = new Date().toISOString().split("T")[0];
    return `${tipo}_${func_nome.replace(/[^a-zA-Z0-9]/g, "_")}_${dataHoje}.pdf`;
  };

  const handleDownload = async () => {
    if (!textoGerado) return;
    const func = funcionarios.find(f => f.id === funcId);
    if (!func) return;

    const blob = await gerarPdfA4(textoGerado, formatFileName(tipoDoc, func.nome));
    downloadBlob(blob, formatFileName(tipoDoc, func.nome));
  };

  const formatPhone = (tel: string) => {
    const clean = tel.replace(/\D/g, "");
    return clean.startsWith("55") ? clean : `55${clean}`;
  };

  const handleWhatsApp = () => {
    if (!textoGerado) return;
    const func = funcionarios.find(f => f.id === funcId);
    if (!func) return;

    const zapText = `Olá ${func.nome},
Temos um documento oficial do RH para sua ciência:

---------------------------------
${textoGerado}
---------------------------------

Por favor, dirija-se ao departamento para assinar a via física.`;
    
    if (func.telefone) {
        window.open(`https://wa.me/${formatPhone(func.telefone)}?text=${encodeURIComponent(zapText)}`, "_blank");
    } else {
        navigator.clipboard.writeText(zapText);
        toast({ title: "Copiado para WhatsApp!", description: "O funcionário não tem telefone cadastrado. Cole no Whatsapp dele."});
    }
  };

  const handleSalvarRh = async () => {
    if (!textoGerado) return;
    const func = funcionarios.find(f => f.id === funcId);
    if (!func) return;

    setSalvando(true);
    try {
      const blob = await gerarPdfA4(textoGerado, formatFileName(tipoDoc, func.nome));
      const file = new File([blob], formatFileName(tipoDoc, func.nome), { type: "application/pdf" });
      const pastaRelacionada = mapTipoParaPasta(tipoDoc);
      const filePath = `funcionarios/${func.id}/${pastaRelacionada}/${file.name}`;

      const { error } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true });

      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Documento Anexado com Sucesso", description: `O arquivo foi salvo na pasta ${pastaRelacionada} do funcionário.` });
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erro desconhecido", variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  if (loadingConfig) {
      return <div className="p-8 text-center text-muted-foreground"><Loader2 className="animate-spin h-6 w-6 mx-auto mb-2"/> Carregando motor...</div>;
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6 items-start">
      {/* Coluna Esquerda: SETUP DA IA */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="border-primary/20 bg-primary/5 shadow-sm">
          <CardContent className="p-4 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                 <Bot className="h-5 w-5 text-primary" />
                 <h3 className="font-semibold text-primary">Motor de Documentos</h3>
             </div>

             <div className="space-y-1">
               <Label className="text-xs font-semibold">1. Selecione o Funcionário</Label>
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
             </div>

             <div className="space-y-1">
               <Label className="text-xs font-semibold">2. Tipo de Documento</Label>
               <Select value={tipoDoc} onValueChange={(v: TipoDocumentoOficial) => setTipoDoc(v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="advertencia">Advertência Disciplinar (Ex: Falta EPI)</SelectItem>
                      <SelectItem value="suspensao">Suspensão de Contrato Mensal</SelectItem>
                      <SelectItem value="comunicado">Comunicado Formal Genérico</SelectItem>
                      <SelectItem value="recibo">Recibo de Pagamento Avulso</SelectItem>
                      <SelectItem value="justificativa_falta">Abono / Justificativa de Faltas</SelectItem>
                  </SelectContent>
               </Select>
             </div>

             <div className="space-y-1">
               <Label className="text-xs font-semibold">3. Descreva o Contexto (Prompt)</Label>
               <Textarea 
                 placeholder="Ex: Miguel foi encontrado sem utilizar o cinto de segurança durante trabalho em altura na data 23/04/2026, ignorando avisos prévios..."
                 className="bg-background resize-none"
                 rows={5}
                 value={contextoUsuario}
                 onChange={e => setContextoUsuario(e.target.value)}
               />
               <p className="text-[10px] text-muted-foreground"><Info className="inline h-3 w-3 mr-1" />Apenas digite a situação; o sistema usará as leis trabalhistas da CLT adequadas de forma inteligente.</p>
             </div>

             <Button 
                onClick={handleGerar} 
                disabled={gerando || !funcId}
                className="w-full gap-2 mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
             >
                 {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                 {gerando ? "Formatando leis e texto..." : "Gerar Documento Oficial"}
             </Button>

          </CardContent>
        </Card>
      </div>

      {/* Coluna Direita: TEXTO PROCESSADO E EDIÇÃO */}
      <div className="lg:col-span-7 space-y-4">
        {textoGerado ? (
            <Card className="shadow-sm border-muted">
                <CardContent className="p-4 space-y-4">
                    <div className="flex justify-between items-end mb-2 border-b pb-2">
                        <div>
                            <Badge variant="outline" className="mb-2 bg-card text-muted-foreground">{tipoDoc.toUpperCase()}</Badge>
                            <h3 className="font-semibold text-lg">Documento Processado</h3>
                        </div>
                        <div className="flex gap-2">
                            <Button size="icon" variant="outline" onClick={handleDownload} title="Baixar PDF">
                                <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" onClick={handleWhatsApp} title="Enviar por WhatsApp" className="text-success hover:text-success hover:bg-success/10">
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Sinta-se livre para revisar e alterar os termos gerados abaixo antes de salvar ou imprimir.</Label>
                        <Textarea 
                            value={textoGerado}
                            onChange={(e) => setTextoGerado(e.target.value)}
                            className="font-mono text-sm leading-relaxed p-4 h-[400px] bg-muted/20"
                        />
                    </div>

                    <Button 
                        onClick={handleSalvarRh} 
                        disabled={salvando}
                        className="w-full gap-2 bg-success text-success-foreground hover:bg-success/90"
                    >
                        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {salvando ? "Salvando no Prontuário..." : "Anexar PDF no Prontuário Digital (RH)"}
                    </Button>
                </CardContent>
            </Card>
        ) : (
             <div className="h-full min-h-[400px] border-2 border-dashed rounded-xl flex items-center justify-center p-8 bg-muted/10">
                <div className="text-center space-y-2">
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-muted-foreground">O documento gerado aparecerá aqui.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
