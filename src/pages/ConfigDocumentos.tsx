import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Upload, Save, Building2, Palette, FileText, Eye } from "lucide-react";
import { createBrandedPDF, addPDFFooter, getAutoTableStyles, addSignatureBlock, type EmpresaBranding } from "@/lib/pdfTemplate";
import autoTable from "jspdf-autotable";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  logo_url: string | null;
  cor_primaria: string | null;
  cor_secundaria: string | null;
  nome_responsavel: string | null;
  cargo_responsavel: string | null;
}

export default function ConfigDocumentos() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState({
    cor_primaria: "#3c502d",
    cor_secundaria: "#1a1a1a",
    nome_responsavel: "",
    cargo_responsavel: "",
    logo_url: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { loadEmpresas(); }, []);

  const loadEmpresas = async () => {
    const { data } = await supabase.from("empresas").select("*").order("razao_social");
    if (data) setEmpresas(data as any);
  };

  useEffect(() => {
    if (!selectedId) return;
    const emp = empresas.find(e => e.id === selectedId);
    if (emp) {
      setForm({
        cor_primaria: emp.cor_primaria || "#3c502d",
        cor_secundaria: emp.cor_secundaria || "#1a1a1a",
        nome_responsavel: emp.nome_responsavel || "",
        cargo_responsavel: emp.cargo_responsavel || "",
        logo_url: emp.logo_url || "",
      });
    }
  }, [selectedId, empresas]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedId) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `empresas/${selectedId}/logo.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro ao enviar logo", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("documentos").getPublicUrl(path);
    setForm(f => ({ ...f, logo_url: urlData.publicUrl }));
    setUploading(false);
    toast({ title: "Logo enviada com sucesso" });
  };

  const handleSave = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from("empresas").update({
      cor_primaria: form.cor_primaria,
      cor_secundaria: form.cor_secundaria,
      nome_responsavel: form.nome_responsavel || null,
      cargo_responsavel: form.cargo_responsavel || null,
      logo_url: form.logo_url || null,
    }).eq("id", selectedId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Configuração salva com sucesso" });
    loadEmpresas();
  };

  const previewPDF = async () => {
    const emp = empresas.find(e => e.id === selectedId);
    if (!emp) return;
    const branding: EmpresaBranding = { ...emp, ...form };
    const { doc, startY, colors } = await createBrandedPDF({
      titulo: "Documento de Exemplo",
      subtitulo: "Preview da personalização de documentos",
      empresa: branding,
      obraNome: "Obra Exemplo — Edifício Residencial",
      obraEndereco: "Rua das Flores, 123 — São Paulo/SP",
    });

    autoTable(doc, {
      startY: startY + 4,
      head: [["Item", "Descrição", "Unid.", "Qtd.", "Valor Unit.", "Total"]],
      body: [
        ["1.1", "Fundação profunda", "m", "120", "R$ 850,00", "R$ 102.000,00"],
        ["1.2", "Forma de pilares", "m²", "350", "R$ 95,00", "R$ 33.250,00"],
        ["1.3", "Concretagem", "m³", "80", "R$ 620,00", "R$ 49.600,00"],
      ],
      foot: [["", "", "", "", "TOTAL", "R$ 184.850,00"]],
      ...getAutoTableStyles(colors.primary),
    });

    addSignatureBlock(doc, branding);
    addPDFFooter(doc, branding);
    doc.save("preview-documento.pdf");
  };

  const selected = empresas.find(e => e.id === selectedId);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Configuração de Documentos
          </h1>
          <p className="text-sm text-muted-foreground">Personalize logos, cores e rodapé dos documentos e relatórios</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Selecionar Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Escolha a empresa..." /></SelectTrigger>
              <SelectContent>
                {empresas.map(e => (
                  <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social} — {e.cnpj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Logo */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" /> Logo da Empresa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.logo_url && (
                  <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-center">
                    <img src={form.logo_url} alt="Logo" className="max-h-20 max-w-[200px] object-contain" />
                  </div>
                )}
                <div>
                  <Label>Upload da Logo</Label>
                  <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} className="mt-1" />
                  <p className="text-xs text-muted-foreground mt-1">Formatos: PNG, JPG. Recomendado: fundo transparente.</p>
                </div>
              </CardContent>
            </Card>

            {/* Colors */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Identidade Visual</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Cor Primária</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.cor_primaria} onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={form.cor_primaria} onChange={e => setForm(f => ({ ...f, cor_primaria: e.target.value }))} className="font-mono text-xs" />
                    </div>
                    <p className="text-xs text-muted-foreground">Usada em cabeçalhos, títulos e tabelas</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Cor Secundária</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.cor_secundaria} onChange={e => setForm(f => ({ ...f, cor_secundaria: e.target.value }))} className="h-9 w-12 rounded border cursor-pointer" />
                      <Input value={form.cor_secundaria} onChange={e => setForm(f => ({ ...f, cor_secundaria: e.target.value }))} className="font-mono text-xs" />
                    </div>
                    <p className="text-xs text-muted-foreground">Usada em títulos de documento</p>
                  </div>
                </div>
                <div className="flex gap-3 mt-2">
                  <div className="h-8 flex-1 rounded" style={{ backgroundColor: form.cor_primaria }} />
                  <div className="h-8 flex-1 rounded" style={{ backgroundColor: form.cor_secundaria }} />
                </div>
              </CardContent>
            </Card>

            {/* Responsible */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> Assinatura e Rodapé</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Nome do Responsável Técnico</Label>
                  <Input value={form.nome_responsavel} onChange={e => setForm(f => ({ ...f, nome_responsavel: e.target.value }))} placeholder="Eng. João da Silva" />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input value={form.cargo_responsavel} onChange={e => setForm(f => ({ ...f, cargo_responsavel: e.target.value }))} placeholder="Engenheiro Civil — CREA 123456" />
                </div>
              </CardContent>
            </Card>

            {/* Preview card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border rounded-lg p-4 bg-white text-xs space-y-2">
                  <div className="h-1 rounded" style={{ backgroundColor: form.cor_primaria }} />
                  <div className="flex items-center justify-between">
                    <div>
                      {form.logo_url ? (
                        <img src={form.logo_url} alt="Logo" className="h-8 object-contain" />
                      ) : (
                        <div className="h-8 w-20 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground">Logo</div>
                      )}
                    </div>
                    <div className="text-right text-muted-foreground">
                      <div className="font-bold" style={{ color: form.cor_primaria }}>{selected?.nome_fantasia || selected?.razao_social}</div>
                      <div>CNPJ: {selected?.cnpj}</div>
                    </div>
                  </div>
                  <hr />
                  <div className="font-bold text-sm" style={{ color: form.cor_secundaria }}>Título do Documento</div>
                  <div className="text-muted-foreground">Subtítulo</div>
                  <div className="h-12 rounded" style={{ backgroundColor: form.cor_primaria, opacity: 0.1 }} />
                  <div className="flex justify-between pt-2 border-t">
                    <span>{form.nome_responsavel || "Responsável"}</span>
                    <span>Contratante</span>
                  </div>
                  <div className="h-4 rounded text-center text-white text-[9px] leading-4" style={{ backgroundColor: form.cor_primaria }}>
                    {selected?.nome_fantasia || selected?.razao_social} — CNPJ: {selected?.cnpj}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={previewPDF} variant="outline" className="gap-2 flex-1"><Eye className="h-4 w-4" /> Gerar PDF Preview</Button>
                  <Button onClick={handleSave} className="gap-2 flex-1"><Save className="h-4 w-4" /> Salvar</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
