import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileText, Download, Send, Save, Bot, Loader2, Info, Printer, Mail, FolderOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { gerarTextoDocumentoOficial, TipoDocumentoOficial, TIPO_DOCUMENTO_LABEL, TIPO_DOCUMENTO_PASTA, TITULOS_SUGERIDOS, TONS_DOCUMENTO } from "@/lib/motorIaDocumentos";
import { gerarPdfA4, downloadBlob, imprimirBlob, EmpresaPdf } from "@/lib/gerarPdfOficial";
import { gerarReciboPdf } from "@/lib/gerarReciboPdf";
import { Input } from "@/components/ui/input";
import { VARIAVEIS_DOCUMENTO, aplicarVariaveis, inserirVariavel, resolverVariaveis, temVariaveis, type ContextoVariaveis } from "@/lib/variaveisDocumento";
import { BIBLIOTECA_MODELOS, CATEGORIAS_MODELO, modelosPorCategoria, type CategoriaModelo, type ModeloComunicacao } from "@/lib/bibliotecaModelos";



interface FuncionarioSimplificado {
  id: string;
  nome: string;
  cargo: string;
  telefone: string | null;
  email: string | null;
  cpf: string | null;
  rg: string | null;
  matricula: string | null;
  admissao: string | null;
  obraNome: string | null;
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

const TIPO_LABEL = TIPO_DOCUMENTO_LABEL;
const PASTAS_DOC = TIPO_DOCUMENTO_PASTA;

export function GeradorDocumentos() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioSimplificado[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Form
  const [funcId, setFuncId] = useState<string>("");
  const [tipoDoc, setTipoDoc] = useState<TipoDocumentoOficial>("advertencia");
  const [contextoUsuario, setContextoUsuario] = useState("");
  const [reciboValor, setReciboValor] = useState<string>("");
  const [dataDoc, setDataDoc] = useState<string>(new Date().toISOString().slice(0, 10));
  const [usarIA, setUsarIA] = useState(true);
  const [titulo, setTitulo] = useState<string>(TITULOS_SUGERIDOS["advertencia"][0]);
  const [tom, setTom] = useState<string>("formal");
  const [categoriaModelo, setCategoriaModelo] = useState<CategoriaModelo>("rh");
  const [modeloId, setModeloId] = useState<string>("");
  const tituloRef = useRef<HTMLInputElement>(null);

  const ideiaRef = useRef<HTMLTextAreaElement>(null);


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
        .select("id, nome, cargo, telefone, email, cpf, rg, numero_registro, data_admissao, obra_id, empresa_id")
        .eq("status", "ativo")
        .order("nome");

      if (data) {
        const empresaIds = [...new Set(data.filter(f => f.empresa_id).map(f => f.empresa_id))];
        const obraIds = [...new Set(data.map(f => (f as any).obra_id).filter(Boolean))];
        const [{ data: empresasm }, { data: obrasm }] = await Promise.all([
          supabase
            .from("empresas")
            .select("id, razao_social, nome_fantasia, cnpj, endereco, cidade, uf, cep, telefone, email, logo_url, cor_primaria, cor_secundaria")
            .in("id", empresaIds),
          obraIds.length
            ? supabase.from("obras").select("id, nome, codigo").in("id", obraIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const empMap = new Map(empresasm?.map(e => [e.id, e]) || []);
        const obraMap = new Map((obrasm || []).map((o: any) => [o.id, o.codigo ? `${o.codigo} — ${o.nome}` : o.nome]));

        const fFormatado: FuncionarioSimplificado[] = data.map(f => ({
          id: f.id,
          nome: f.nome,
          cargo: f.cargo || "Não Informado",
          telefone: f.telefone,
          email: f.email,
          cpf: (f as any).cpf || null,
          rg: (f as any).rg || null,
          matricula: (f as any).numero_registro || null,
          admissao: (f as any).data_admissao || null,
          obraNome: (f as any).obra_id ? obraMap.get((f as any).obra_id) || null : null,
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
  const isComunicadoGeral = tipoDoc === "comunicado_geral";

  // Ao trocar o tipo, sugere automaticamente o primeiro modelo de título do tipo.
  const handleTipoChange = (v: TipoDocumentoOficial) => {
    setTipoDoc(v);
    setTitulo(TITULOS_SUGERIDOS[v]?.[0] || TIPO_LABEL[v]);
  };

  const aplicarModelo = (m: ModeloComunicacao) => {
    setTipoDoc(m.tipo);
    setTitulo(m.titulo);
    setContextoUsuario(m.ideia);
    if (m.tom) setTom(m.tom);
    setModeloId(m.id);
    toast({ title: "Modelo aplicado", description: `${m.nome} — revise as variáveis e gere o texto.` });
  };


  const handleGerar = async () => {
    if (!funcId && !isComunicadoGeral) {
      toast({ title: "Selecione um funcionário", variant: "destructive" });
      return;
    }
    const func = funcionarios.find(f => f.id === funcId);
    const nomeEmpresa = func?.empresa?.nome_fantasia || func?.empresa?.razao_social || funcionarios[0]?.empresa?.nome_fantasia || funcionarios[0]?.empresa?.razao_social || "Empresa";

    // Resolve as variáveis dinâmicas ({{nome}}, {{cargo}}, {{obra}}, {{data}}...)
    const ctxVars: ContextoVariaveis = {
      nome: func?.nome,
      cargo: func?.cargo,
      cpf: func?.cpf,
      rg: func?.rg,
      matricula: func?.matricula,
      admissao: func?.admissao,
      empresa: nomeEmpresa,
      cnpj: func?.empresa?.cnpj || funcionarios[0]?.empresa?.cnpj || null,
      obra: func?.obraNome,
      data: dataDoc,
    };
    const tituloFinal = aplicarVariaveis(titulo, ctxVars);
    const contextoFinal = aplicarVariaveis(contextoUsuario, ctxVars);

    setGerando(true);

    // Fallback local (template) usado quando a IA não estiver disponível.
    const gerarLocal = () =>
      aplicarVariaveis(
        gerarTextoDocumentoOficial({
          tipo: tipoDoc,
          nomeFuncionario: func?.nome || "",
          cargoFuncionario: func?.cargo || "",
          nomeEmpresa,
          contexto: contextoFinal,
          data: dataDoc,
          titulo: tituloFinal,
        }),
        ctxVars
      );

    try {
      if (usarIA && contextoFinal.trim().length >= 3) {
        const { data, error } = await supabase.functions.invoke("gerar-documento-ia", {
          body: {
            tipo: tipoDoc,
            ideia: contextoFinal,
            titulo: tituloFinal,
            tom,
            nomeFuncionario: func?.nome || "",
            cargoFuncionario: func?.cargo || "",
            nomeEmpresa,
            obra: func?.obraNome || "",
            matriculaFuncionario: func?.matricula || "",
            admissaoFuncionario: func?.admissao || "",
            data: dataDoc,
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.texto) {
          setTextoGerado(aplicarVariaveis(data.texto, ctxVars));
          toast({ title: "Texto gerado com IA ✨", description: "Revise e ajuste antes de enviar." });
          return;
        }
        setTextoGerado(gerarLocal());
      } else {
        setTextoGerado(gerarLocal());
      }
    } catch (err: any) {
      setTextoGerado(gerarLocal());
      toast({ title: "IA indisponível", description: "Gerado a partir do modelo padrão. " + (err?.message || ""), variant: "destructive" });
    } finally {
      setGerando(false);
    }
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

  const buildBlob = async (): Promise<Blob | null> => {
    // Comunicado geral pode não ter funcionário específico selecionado.
    if (!funcSelecionado && !isComunicadoGeral) return null;
    const empresaPdf = funcSelecionado?.empresa || funcionarios[0]?.empresa || null;
    if (tipoDoc === "recibo") {
      if (!funcSelecionado) return null;
      const valorNum = parseFloat((reciboValor || "0").replace(/\./g, "").replace(",", "."));
      if (!valorNum || valorNum <= 0) {
        toast({ title: "Informe o valor do recibo", variant: "destructive" });
        return null;
      }
      return await gerarReciboPdf({
        empresa: (funcSelecionado.empresa || { razao_social: "Empresa" }) as any,
        funcionario: {
          nome: funcSelecionado.nome,
          cargo: funcSelecionado.cargo,
          cpf: funcSelecionado.cpf,
          rg: funcSelecionado.rg,
        },
        valor: valorNum,
        referencia: contextoUsuario || "Pagamento avulso",
      });
    }
    return await gerarPdfA4(textoGerado, "doc.pdf", empresaPdf);
  };

  const handleDownload = async () => {
    const blob = await buildBlob();
    if (!blob || !funcSelecionado) return;
    downloadBlob(blob, formatFileName(tipoDoc, funcSelecionado.nome));
  };

  const handleImprimir = async () => {
    const blob = await buildBlob();
    if (!blob) return;
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
    if (!funcSelecionado) return;
    setSalvando(true);
    try {
      const blob = await buildBlob();
      if (!blob) { setSalvando(false); return; }
      const fname = formatFileName(tipoDoc, funcSelecionado.nome);
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

  // ---- Variáveis dinâmicas ----
  const ctxPreview: ContextoVariaveis = {
    nome: funcSelecionado?.nome,
    cargo: funcSelecionado?.cargo,
    cpf: funcSelecionado?.cpf,
    rg: funcSelecionado?.rg,
    matricula: funcSelecionado?.matricula,
    admissao: funcSelecionado?.admissao,
    empresa: funcSelecionado?.empresa?.nome_fantasia || funcSelecionado?.empresa?.razao_social || funcionarios[0]?.empresa?.nome_fantasia || funcionarios[0]?.empresa?.razao_social,
    cnpj: funcSelecionado?.empresa?.cnpj || funcionarios[0]?.empresa?.cnpj,
    obra: funcSelecionado?.obraNome,
    data: dataDoc,
  };
  const valoresVars = resolverVariaveis(ctxPreview);

  const ChipsVariaveis = ({ target }: { target: "titulo" | "ideia" }) => (
    <div className="flex flex-wrap gap-1 pt-1">
      {VARIAVEIS_DOCUMENTO.map(v => (
        <button
          key={v.chave}
          type="button"
          title={`${v.label}${valoresVars[v.chave] ? ` — atual: ${valoresVars[v.chave]}` : " — sem valor no cadastro"}`}
          onClick={() => {
            if (target === "titulo") {
              const el = tituloRef.current;
              const r = inserirVariavel(titulo, v.chave, el?.selectionStart ?? null);
              setTitulo(r.texto);
              requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(r.cursor, r.cursor); });
            } else {
              const el = ideiaRef.current;
              const r = inserirVariavel(contextoUsuario, v.chave, el?.selectionStart ?? null);
              setContextoUsuario(r.texto);
              requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(r.cursor, r.cursor); });
            }
          }}
          className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {`{{${v.chave}}}`}
        </button>
      ))}
    </div>
  );

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

              {/* Biblioteca de modelos por categoria */}
              <div className="space-y-2 rounded-lg border border-primary/20 bg-background p-3">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-primary" />
                  <Label className="text-xs font-semibold">Biblioteca de Modelos ({BIBLIOTECA_MODELOS.length})</Label>
                </div>
                <Select value={categoriaModelo} onValueChange={(v: CategoriaModelo) => { setCategoriaModelo(v); setModeloId(""); }}>
                  <SelectTrigger className="bg-background h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS_MODELO.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {CATEGORIAS_MODELO.find(c => c.value === categoriaModelo)?.descricao}
                </p>
                <div className="max-h-[190px] space-y-1 overflow-y-auto pr-1">
                  {modelosPorCategoria(categoriaModelo).map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => aplicarModelo(m)}
                      className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                        modeloId === m.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                      }`}
                    >
                      <p className="text-xs font-medium">{m.nome}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{m.titulo}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Ao aplicar um modelo, título, ideia e tom são preenchidos com variáveis dinâmicas prontas para edição.
                </p>
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
                <Select value={tipoDoc} onValueChange={(v: TipoDocumentoOficial) => handleTipoChange(v)}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(Object.keys(TIPO_LABEL) as TipoDocumentoOficial[]).map(k => (
                      <SelectItem key={k} value={k}>{TIPO_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Modelo de Título / Assunto</Label>
                <Select value={titulo} onValueChange={setTitulo}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Escolha um modelo de título" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {(TITULOS_SUGERIDOS[tipoDoc] || []).map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  ref={tituloRef}
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ou digite um título personalizado"
                  className="bg-background text-xs"
                />
                <ChipsVariaveis target="titulo" />
                {temVariaveis(titulo) && (
                  <p className="text-[10px] text-muted-foreground">
                    Prévia: <span className="font-medium text-foreground">{aplicarVariaveis(titulo, ctxPreview)}</span>
                  </p>
                )}
              </div>


              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tom da Redação</Label>
                <Select value={tom} onValueChange={setTom}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TONS_DOCUMENTO.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data do Documento</Label>
                <Input
                  type="date"
                  value={dataDoc}
                  onChange={e => setDataDoc(e.target.value)}
                  className="bg-background"
                />
              </div>

              <label className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={usarIA} onChange={e => setUsarIA(e.target.checked)} className="rounded" />
                <span className="text-xs font-medium flex items-center gap-1"><Bot className="h-3.5 w-3.5 text-primary" /> Desenvolver texto com IA a partir da minha ideia</span>
              </label>

              {tipoDoc === "recibo" && (
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Valor (R$)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={reciboValor}
                    onChange={e => setReciboValor(e.target.value)}
                    className="bg-background font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">Valor em reais — o sistema gera automaticamente o valor por extenso.</p>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-semibold">{tipoDoc === "recibo" ? "Referência do pagamento" : usarIA ? "3. Descreva sua ideia (a IA desenvolve o texto)" : "3. Contexto / Motivo"}</Label>
                <Textarea
                  ref={ideiaRef}
                  placeholder={tipoDoc === "recibo" ? "Ex: Adiantamento salarial referente à obra Terrace - novembro/2025" : "Ex: comunicar {{nome}} ({{cargo}}) que na {{obra}} o horário muda a partir de {{data}}..."}
                  className="bg-background resize-none"
                  rows={5}
                  value={contextoUsuario}
                  onChange={e => setContextoUsuario(e.target.value)}
                />
                <ChipsVariaveis target="ideia" />
                {temVariaveis(contextoUsuario) && (
                  <p className="rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
                    Prévia com dados reais: <span className="text-foreground">{aplicarVariaveis(contextoUsuario, ctxPreview)}</span>
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground"><Info className="inline h-3 w-3 mr-1" />{usarIA ? "Escreva a ideia em linguagem simples e use as variáveis acima — elas são substituídas pelos dados do colaborador antes de gerar." : "O sistema aplica automaticamente a fundamentação legal CLT e substitui as variáveis."}</p>
              </div>


              <Button onClick={handleGerar} disabled={gerando || (!funcId && !isComunicadoGeral)} className="w-full gap-2 mt-2">
                {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                {gerando ? "Gerando..." : usarIA ? "Gerar com IA" : "Gerar Documento"}
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
