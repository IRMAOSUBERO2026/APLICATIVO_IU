import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PenLine, Search, Plus, Copy, Eye, RefreshCw, Clock, CheckCircle2, XCircle, FileText, Send } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, addDays } from "date-fns";

interface Assinatura {
  id: string;
  documento_tipo: string;
  documento_titulo: string;
  status: string;
  token_acesso: string;
  token_expiracao: string;
  cpf_confirmado: boolean;
  selfie_url: string | null;
  data_visualizacao: string | null;
  data_assinatura: string | null;
  motivo_recusa: string | null;
  solicitado_por: string | null;
  created_at: string;
  funcionario_id: string;
  empresa_id: string;
  funcionario?: { nome: string; cpf: string; cargo: string } | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: "Pendente", color: "bg-warning/10 text-warning", icon: Clock },
  visualizado: { label: "Visualizado", color: "bg-accent/10 text-accent", icon: Eye },
  assinado: { label: "Assinado", color: "bg-success/10 text-success", icon: CheckCircle2 },
  recusado: { label: "Recusado", color: "bg-destructive/10 text-destructive", icon: XCircle },
  expirado: { label: "Expirado", color: "bg-muted text-muted-foreground", icon: Clock },
};

const tipoOptions = [
  { value: "ficha_epi", label: "Ficha de EPI" },
  { value: "holerite", label: "Holerite" },
  { value: "advertencia", label: "Advertência" },
  { value: "ferias", label: "Férias" },
  { value: "contrato", label: "Contrato" },
  { value: "treinamento", label: "Treinamento" },
  { value: "rescisao", label: "Rescisão" },
  { value: "outros", label: "Outros" },
];

export default function Assinaturas() {
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState<Assinatura | null>(null);

  // New form
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [formEmpresa, setFormEmpresa] = useState("");
  const [formFuncionario, setFormFuncionario] = useState("");
  const [formTipo, setFormTipo] = useState("");
  const [formTitulo, setFormTitulo] = useState("");
  const [formDescricao, setFormDescricao] = useState("");
  const [formSolicitante, setFormSolicitante] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("assinaturas_digitais")
      .select("*")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const funcIds = [...new Set(data.map(a => a.funcionario_id))];
      const { data: funcs } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf, cargo")
        .in("id", funcIds);

      const mapped = data.map(a => ({
        ...a,
        funcionario: funcs?.find(f => f.id === a.funcionario_id) || null,
      }));
      setAssinaturas(mapped);
    } else {
      setAssinaturas([]);
    }

    const { data: emps } = await supabase.from("empresas").select("id, razao_social, nome_fantasia").eq("ativo", true);
    setEmpresas(emps || []);
    setLoading(false);
  };

  const loadFuncionarios = async (empresaId: string) => {
    const { data } = await supabase
      .from("funcionarios")
      .select("id, nome, cpf, cargo")
      .eq("empresa_id", empresaId)
      .eq("status", "ativo");
    setFuncionarios(data || []);
  };

  const generateToken = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 48; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const createAssinatura = async () => {
    if (!formEmpresa || !formFuncionario || !formTipo || !formTitulo) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    setCreating(true);
    const token = generateToken();
    const { error } = await supabase.from("assinaturas_digitais").insert({
      empresa_id: formEmpresa,
      funcionario_id: formFuncionario,
      documento_tipo: formTipo,
      documento_titulo: formTitulo,
      documento_descricao: formDescricao || null,
      token_acesso: token,
      token_expiracao: addDays(new Date(), 7).toISOString(),
      solicitado_por: formSolicitante || null,
    });

    if (error) {
      toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Solicitação criada!", description: "Link de assinatura gerado." });
      setShowNew(false);
      resetForm();
      loadAll();
    }
    setCreating(false);
  };

  const resetForm = () => {
    setFormEmpresa(""); setFormFuncionario(""); setFormTipo(""); setFormTitulo(""); setFormDescricao(""); setFormSolicitante("");
  };

  const getSignLink = (token: string) => `${window.location.origin}/assinar?token=${token}`;

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(getSignLink(token));
    toast({ title: "Link copiado!", description: "Cole no WhatsApp ou e-mail para enviar." });
  };

  const resend = async (assinatura: Assinatura) => {
    const newToken = generateToken();
    await supabase.from("assinaturas_digitais").update({
      token_acesso: newToken,
      token_expiracao: addDays(new Date(), 7).toISOString(),
      status: "pendente",
      cpf_confirmado: false,
      selfie_url: null,
      data_visualizacao: null,
      data_assinatura: null,
    }).eq("id", assinatura.id);
    toast({ title: "Novo link gerado!", description: "Copie e envie novamente." });
    loadAll();
  };

  const filtered = assinaturas.filter(a => {
    const matchSearch = a.funcionario?.nome?.toLowerCase().includes(search.toLowerCase()) ||
      a.documento_titulo.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "todos" || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: assinaturas.length,
    pendentes: assinaturas.filter(a => a.status === "pendente" || a.status === "visualizado").length,
    assinados: assinaturas.filter(a => a.status === "assinado").length,
    recusados: assinaturas.filter(a => a.status === "recusado").length,
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <PenLine className="h-6 w-6 text-primary" /> Assinaturas Digitais
            </h1>
            <p className="text-sm text-muted-foreground">Solicite e acompanhe assinaturas de documentos</p>
          </div>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-foreground" },
            { label: "Pendentes", value: stats.pendentes, color: "text-warning" },
            { label: "Assinados", value: stats.assinados, color: "text-success" },
            { label: "Recusados", value: stats.recusados, color: "text-destructive" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou documento..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="visualizado">Visualizados</SelectItem>
              <SelectItem value="assinado">Assinados</SelectItem>
              <SelectItem value="recusado">Recusados</SelectItem>
              <SelectItem value="expirado">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center">
            <PenLine className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Nenhuma assinatura encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(a => {
              const cfg = statusConfig[a.status] || statusConfig.pendente;
              const Icon = cfg.icon;
              return (
                <div key={a.id} className="rounded-xl border bg-card p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-semibold text-sm truncate">{a.documento_titulo}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="h-3 w-3" /> {cfg.label}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {a.funcionario?.nome || "—"} • {a.funcionario?.cargo || ""} • {tipoOptions.find(t => t.value === a.documento_tipo)?.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Criado em {format(new Date(a.created_at), "dd/MM/yyyy HH:mm")}
                        {a.data_assinatura && ` • Assinado em ${format(new Date(a.data_assinatura), "dd/MM/yyyy HH:mm")}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(a.status === "pendente" || a.status === "visualizado") && (
                        <Button variant="ghost" size="icon" onClick={() => copyLink(a.token_acesso)} title="Copiar link">
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      {(a.status === "expirado" || a.status === "recusado") && (
                        <Button variant="ghost" size="icon" onClick={() => resend(a)} title="Reenviar">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setShowDetail(a)} title="Detalhes">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* New Dialog */}
        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nova Solicitação de Assinatura</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Empresa *</label>
                <Select value={formEmpresa} onValueChange={(v) => { setFormEmpresa(v); loadFuncionarios(v); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Funcionário *</label>
                <Select value={formFuncionario} onValueChange={setFormFuncionario}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome} — {f.cargo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Tipo de Documento *</label>
                <Select value={formTipo} onValueChange={setFormTipo}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {tipoOptions.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Título do Documento *</label>
                <Input value={formTitulo} onChange={e => setFormTitulo(e.target.value)} placeholder="Ex: Ficha de EPI - Março 2026" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Descrição</label>
                <Input value={formDescricao} onChange={e => setFormDescricao(e.target.value)} placeholder="Detalhes adicionais (opcional)" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Solicitado por</label>
                <Input value={formSolicitante} onChange={e => setFormSolicitante(e.target.value)} placeholder="Nome do gestor" />
              </div>
              <Button onClick={createAssinatura} className="w-full" disabled={creating}>
                <Send className="h-4 w-4 mr-2" /> Gerar Link de Assinatura
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!showDetail} onOpenChange={() => setShowDetail(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Detalhes da Assinatura</DialogTitle></DialogHeader>
            {showDetail && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Funcionário</span><p className="font-medium">{showDetail.funcionario?.nome}</p></div>
                  <div><span className="text-muted-foreground">CPF</span><p className="font-medium">{showDetail.funcionario?.cpf}</p></div>
                  <div><span className="text-muted-foreground">Documento</span><p className="font-medium">{showDetail.documento_titulo}</p></div>
                  <div><span className="text-muted-foreground">Status</span>
                    <p className={`font-medium ${statusConfig[showDetail.status]?.color}`}>
                      {statusConfig[showDetail.status]?.label}
                    </p>
                  </div>
                  <div><span className="text-muted-foreground">CPF Verificado</span><p className="font-medium">{showDetail.cpf_confirmado ? "✅ Sim" : "❌ Não"}</p></div>
                  <div><span className="text-muted-foreground">Selfie</span><p className="font-medium">{showDetail.selfie_url ? "✅ Registrada" : "❌ Não"}</p></div>
                  {showDetail.data_visualizacao && (
                    <div><span className="text-muted-foreground">Visualizado em</span><p className="font-medium">{format(new Date(showDetail.data_visualizacao), "dd/MM/yyyy HH:mm")}</p></div>
                  )}
                  {showDetail.data_assinatura && (
                    <div><span className="text-muted-foreground">Assinado em</span><p className="font-medium">{format(new Date(showDetail.data_assinatura), "dd/MM/yyyy HH:mm")}</p></div>
                  )}
                  {showDetail.motivo_recusa && (
                    <div className="col-span-2"><span className="text-muted-foreground">Motivo da Recusa</span><p className="font-medium text-destructive">{showDetail.motivo_recusa}</p></div>
                  )}
                </div>

                {showDetail.selfie_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">Selfie registrada:</p>
                    <img src={showDetail.selfie_url} alt="Selfie" className="w-full max-h-48 object-cover rounded-lg border" />
                  </div>
                )}

                {(showDetail.status === "pendente" || showDetail.status === "visualizado") && (
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { copyLink(showDetail.token_acesso); }}>
                      <Copy className="h-4 w-4 mr-2" /> Copiar Link
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
