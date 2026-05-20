import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  ShieldCheck, ShieldAlert, Shield, FileText, RotateCcw, ChevronDown,
  ChevronUp, ArrowLeft, User, HardHat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { calcularVencimento, calcularStatus, diasRestantes } from "@/utils/seguranca";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const TIPOS = ["ASO", "NR6", "NR12", "NR18", "NR35"] as const;

export default function FichaSegurancaFuncionario() {
  const { funcionarioId } = useParams<{ funcionarioId: string }>();

  const [funcionario, setFuncionario] = useState<any>(null);
  const [clinicas, setClinicas] = useState<any[]>([]);
  const [documentos, setDocumentos] = useState<any[]>([]);  // todos (para histórico)
  const [loading, setLoading] = useState(true);
  const [historicoAberto, setHistoricoAberto] = useState(false);

  // Modal de renovação/edição
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({
    id: null, tipo: "", subtipo: "periodico",
    data_realizacao: new Date().toISOString().split("T")[0],
    clinica_id: "", arquivo: null as File | null, observacoes: ""
  });

  useEffect(() => {
    if (funcionarioId) loadData();
  }, [funcionarioId]);

  const loadData = async () => {
    setLoading(true);
    const [
      { data: func },
      { data: docs },
      { data: clins }
    ] = await Promise.all([
      supabase.from("funcionarios").select("id, nome, cpf, cargo, status, obras(nome)").eq("id", funcionarioId!).single(),
      supabase.from("seguranca_documentos")
        .select("*, seguranca_clinicas(nome)")
        .eq("funcionario_id", funcionarioId!)
        .order("data_vencimento", { ascending: false }),
      supabase.from("seguranca_clinicas").select("id, nome").eq("ativo", true)
    ]);

    if (func) setFuncionario(func);
    if (docs) setDocumentos(docs);
    if (clins) setClinicas(clins);
    setLoading(false);
  };

  // Para cada tipo, pega o documento mais recente
  const getMaisRecente = (tipo: string) =>
    documentos.filter(d => d.tipo === tipo).sort(
      (a, b) => new Date(b.data_vencimento).getTime() - new Date(a.data_vencimento).getTime()
    )[0] || null;

  // Histórico: todos menos o mais recente de cada tipo
  const historico = documentos.filter(d => {
    const recente = getMaisRecente(d.tipo);
    return recente && d.id !== recente.id;
  });

  // Banner de status geral
  const vencidos = TIPOS.filter(t => {
    const doc = getMaisRecente(t);
    if (!doc) return false;
    return diasRestantes(new Date(doc.data_vencimento + "T12:00:00")) < 0;
  }).length;
  const aVencer = TIPOS.filter(t => {
    const doc = getMaisRecente(t);
    if (!doc) return false;
    const dr = diasRestantes(new Date(doc.data_vencimento + "T12:00:00"));
    return dr >= 0 && dr <= 30;
  }).length;
  const naoRegistrados = TIPOS.filter(t => !getMaisRecente(t)).length;

  const handleVerPDF = async (filePath: string) => {
    if (!filePath) { toast({ title: "Arquivo não encontrado", variant: "destructive" }); return; }
    const { data, error } = await supabase.storage.from("documentos-seguranca").createSignedUrl(filePath, 3600);
    if (error || !data) {
      toast({ title: "Erro ao gerar link", description: error?.message, variant: "destructive" });
    } else {
      window.open(data.signedUrl, "_blank");
    }
  };

  const handleOpenModal = (tipo: string, doc: any | null, mode: "renovar" | "editar") => {
    if (mode === "renovar" || !doc) {
      setForm({
        id: null, tipo,
        subtipo: tipo === "ASO" ? "periodico" : null,
        data_realizacao: new Date().toISOString().split("T")[0],
        clinica_id: "", arquivo: null, observacoes: ""
      });
    } else {
      setForm({
        id: doc.id, tipo: doc.tipo, subtipo: doc.subtipo || "periodico",
        data_realizacao: doc.data_realizacao,
        clinica_id: doc.clinica_id || "", arquivo: null, observacoes: doc.observacoes || ""
      });
    }
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.data_realizacao) { toast({ title: "Data obrigatória", variant: "destructive" }); return; }
    const dReal = new Date(form.data_realizacao + "T12:00:00");
    const dVenc = calcularVencimento(form.tipo, dReal);
    const statusCalc = calcularStatus(dVenc);

    try {
      let arquivo_url = undefined;
      if (form.arquivo) {
        toast({ title: "Fazendo upload do PDF..." });
        const ext = form.arquivo.name.split('.').pop() || "pdf";
        const fileName = `${funcionarioId}/${form.tipo}/${Date.now()}_doc.${ext}`;
        const { error: upErr } = await supabase.storage.from("documentos-seguranca").upload(fileName, form.arquivo);
        if (upErr) throw upErr;
        arquivo_url = fileName;
      } else if (!form.id) {
        toast({ title: "PDF é obrigatório para novos registros", variant: "destructive" });
        return;
      }

      const payload = {
        funcionario_id: funcionarioId,
        obra_id: funcionario?.obras?.id || null,
        clinica_id: form.clinica_id || null,
        tipo: form.tipo,
        subtipo: form.tipo === "ASO" ? form.subtipo : null,
        data_realizacao: form.data_realizacao,
        data_vencimento: dVenc.toISOString().split("T")[0],
        status: statusCalc,
        observacoes: form.observacoes || null,
        ...(arquivo_url ? { arquivo_url } : {})
      };

      if (form.id) {
        const { error } = await supabase.from("seguranca_documentos").update(payload).eq("id", form.id);
        if (error) throw error;
        toast({ title: "Documento atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("seguranca_documentos").insert(payload);
        if (error) throw error;
        toast({ title: "Documento registrado com sucesso" });
      }
      setModalOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-[60vh] items-center justify-center">
          <Shield className="h-10 w-10 animate-pulse text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!funcionario) {
    return (
      <AppLayout>
        <div className="text-center py-20 text-muted-foreground">Funcionário não encontrado.</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-10">

        {/* Breadcrumb e cabeçalho */}
        <div className="space-y-1">
          <Link to="/rh/seguranca/painel" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Painel de Segurança
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{funcionario.nome}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><HardHat className="h-3.5 w-3.5" /> {funcionario.obras?.nome || "Sem obra vinculada"}</span>
                <span>•</span>
                <span>{funcionario.cargo}</span>
                <span>•</span>
                <span>CPF: {funcionario.cpf}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner de status geral */}
        {vencidos > 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <ShieldAlert className="h-7 w-7 text-destructive flex-shrink-0" />
            <div>
              <p className="font-bold text-destructive">🚨 {vencidos} documento{vencidos > 1 ? "s" : ""} vencido{vencidos > 1 ? "s" : ""}</p>
              {aVencer > 0 && <p className="text-sm text-muted-foreground">+ {aVencer} a vencer em breve</p>}
            </div>
          </div>
        ) : aVencer > 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
            <Shield className="h-7 w-7 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-bold text-yellow-700">⚠️ {aVencer} documento{aVencer > 1 ? "s" : ""} a vencer em breve</p>
              {naoRegistrados > 0 && <p className="text-sm text-muted-foreground">{naoRegistrados} tipo{naoRegistrados > 1 ? "s" : ""} sem registro</p>}
            </div>
          </div>
        ) : naoRegistrados > 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-4">
            <Shield className="h-7 w-7 text-orange-500 flex-shrink-0" />
            <p className="font-bold text-orange-600">⚠️ {naoRegistrados} tipo{naoRegistrados > 1 ? "s" : ""} ainda sem registro</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 p-4">
            <ShieldCheck className="h-7 w-7 text-success flex-shrink-0" />
            <p className="font-bold text-success">✅ Todos os documentos em dia</p>
          </div>
        )}

        {/* Tabela de documentos ativos (5 linhas fixas) */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="font-semibold">Documentos de Segurança Ativos</h2>
            <Button size="sm" onClick={() => handleOpenModal("ASO", null, "renovar")}>
              + Novo Registro
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Tipo</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Último realizado</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Vence em</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Dias</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">Clínica</th>
                  <th className="px-5 py-3 text-center font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {TIPOS.map((tipo) => {
                  const doc = getMaisRecente(tipo);
                  if (!doc) {
                    return (
                      <tr key={tipo} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4 font-bold text-xs uppercase tracking-wider">{tipo}</td>
                        <td colSpan={5} className="px-5 py-4 text-sm text-destructive font-medium">
                          Não cadastrado
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Button size="sm" variant="outline" onClick={() => handleOpenModal(tipo, null, "renovar")}>
                            Registrar
                          </Button>
                        </td>
                      </tr>
                    );
                  }

                  const dias = diasRestantes(new Date(doc.data_vencimento + "T12:00:00"));
                  let diasClass = "text-success";
                  let diasText = `${dias} dias`;
                  if (dias < 0) { diasClass = "text-destructive font-bold"; diasText = `Vencido há ${Math.abs(dias)} dias`; }
                  else if (dias <= 7) { diasClass = "text-orange-500 font-bold"; }
                  else if (dias <= 30) { diasClass = "text-yellow-600"; }

                  const statusNow = calcularStatus(new Date(doc.data_vencimento + "T12:00:00"));
                  const badgeMap: Record<string, { bg: string; text: string; label: string }> = {
                    vigente: { bg: "bg-success/10", text: "text-success", label: "Em Dia" },
                    a_vencer: { bg: "bg-yellow-500/10", text: "text-yellow-700", label: "A Vencer" },
                    vencido: { bg: "bg-destructive/10", text: "text-destructive", label: "Vencido" },
                  };
                  const badge = badgeMap[statusNow] || badgeMap.vigente;

                  return (
                    <tr key={tipo} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-4">
                        <span className="font-bold text-xs uppercase tracking-wider">{tipo}</span>
                        {doc.subtipo && <p className="text-[10px] text-muted-foreground capitalize">{doc.subtipo}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm">{new Date(doc.data_realizacao + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className="px-5 py-4 text-center text-sm font-medium">{new Date(doc.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                      <td className={`px-5 py-4 text-center text-xs ${diasClass}`}>{diasText}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{doc.seguranca_clinicas?.nome || "—"}</td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1">
                          {doc.arquivo_url && (
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:bg-primary/10"
                              title="Ver PDF" onClick={() => handleVerPDF(doc.arquivo_url)}>
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-warning hover:bg-warning/10"
                            title="Renovar" onClick={() => handleOpenModal(tipo, doc, "renovar")}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Histórico completo (accordion) */}
        {historico.length > 0 && (
          <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between px-6 py-4 text-sm font-semibold hover:bg-muted/30 transition-colors"
              onClick={() => setHistoricoAberto(!historicoAberto)}
            >
              <span>Ver histórico completo ({historico.length} registros anteriores)</span>
              {historicoAberto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {historicoAberto && (
              <div className="overflow-x-auto border-t">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Tipo</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Realizado</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Venceu em</th>
                      <th className="px-5 py-2 text-left text-xs font-medium text-muted-foreground">Clínica</th>
                      <th className="px-5 py-2 text-right text-xs font-medium text-muted-foreground">PDF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {historico
                      .sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime())
                      .map((doc) => (
                        <tr key={doc.id} className="hover:bg-muted/20 opacity-70">
                          <td className="px-5 py-3 font-bold text-xs uppercase">{doc.tipo}{doc.subtipo ? ` (${doc.subtipo})` : ""}</td>
                          <td className="px-5 py-3">{new Date(doc.data_realizacao + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td className="px-5 py-3 text-muted-foreground">{new Date(doc.data_vencimento + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                          <td className="px-5 py-3 text-muted-foreground">{doc.seguranca_clinicas?.nome || "—"}</td>
                          <td className="px-5 py-3 text-right">
                            {doc.arquivo_url && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleVerPDF(doc.arquivo_url)}>
                                <FileText className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Registrar/Renovar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Documento" : "Registrar / Renovar Documento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p><strong>Funcionário:</strong> {funcionario.nome}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo *</label>
              <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {form.tipo === "ASO" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Subtipo ASO</label>
                <select value={form.subtipo || "periodico"} onChange={e => setForm({ ...form, subtipo: e.target.value })}
                  className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="admissional">Admissional</option>
                  <option value="periodico">Periódico</option>
                  <option value="demissional">Demissional</option>
                  <option value="retorno">Retorno</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Data Realização *</label>
                <input type="date" value={form.data_realizacao}
                  onChange={e => setForm({ ...form, data_realizacao: e.target.value })}
                  className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Vencimento (Auto)</label>
                <input type="text" readOnly
                  className="w-full rounded-lg border bg-muted py-2 px-3 text-sm text-muted-foreground font-medium"
                  value={form.tipo && form.data_realizacao
                    ? calcularVencimento(form.tipo, new Date(form.data_realizacao + "T12:00:00")).toLocaleDateString("pt-BR")
                    : "—"}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Clínica</label>
              <select value={form.clinica_id} onChange={e => setForm({ ...form, clinica_id: e.target.value })}
                className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {form.id ? "Substituir PDF (Opcional)" : "Upload do PDF *"}
              </label>
              <input type="file" accept=".pdf"
                onChange={e => setForm({ ...form, arquivo: e.target.files?.[0] || null })}
                className="w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Observações</label>
              <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })}
                rows={2} placeholder="Opcional..."
                className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
