import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";
import { toast } from "@/hooks/use-toast";
import { MessageCircle, Mail, Users, Send, Search, UserCheck, Building2, HardHat, Filter, Bot, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeradorDocumentos } from "@/components/comunicacoes/GeradorDocumentos";

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  telefone: string | null;
  email: string | null;
  empresa_id: string;
  obra_id: string | null;
  status: string;
}

interface Empresa { id: string; razao_social: string; nome_fantasia: string | null; }
interface Obra { id: string; nome: string; codigo: string; }

type Canal = "whatsapp" | "email";
type Modo = "individual" | "grupo";

export default function Comunicacoes() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [canal, setCanal] = useState<Canal>("whatsapp");
  const [modo, setModo] = useState<Modo>("individual");
  const [search, setSearch] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("");
  const [filterObra, setFilterObra] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mensagem, setMensagem] = useState("");
  const [assunto, setAssunto] = useState("");

  useEffect(() => {
    Promise.all([
      supabase.from("funcionarios").select("id, nome, cargo, telefone, email, empresa_id, obra_id, status").eq("status", "ativo"),
      supabase.from("empresas").select("id, razao_social, nome_fantasia").eq("ativo", true),
      supabase.from("obras").select("id, nome, codigo").in("status", OBRA_STATUS_ATIVOS_ARR),
    ]).then(([fRes, eRes, oRes]) => {
      if (fRes.data) setFuncionarios(fRes.data);
      if (eRes.data) setEmpresas(eRes.data);
      if (oRes.data) setObras(oRes.data);
    });
  }, []);

  const filtered = funcionarios.filter(f => {
    if (search && !f.nome.toLowerCase().includes(search.toLowerCase()) && !f.cargo.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterEmpresa && f.empresa_id !== filterEmpresa) return false;
    if (filterObra && f.obra_id !== filterObra) return false;
    if (canal === "whatsapp" && !f.telefone) return false;
    if (canal === "email" && !f.email) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(f => f.id)));
    }
  };

  const formatPhone = (tel: string) => {
    const clean = tel.replace(/\D/g, "");
    return clean.startsWith("55") ? clean : `55${clean}`;
  };

  const enviar = () => {
    const selecionados = funcionarios.filter(f => selectedIds.has(f.id));
    if (selecionados.length === 0) { toast({ title: "Selecione ao menos um destinatário", variant: "destructive" }); return; }
    if (!mensagem.trim()) { toast({ title: "Digite uma mensagem", variant: "destructive" }); return; }

    if (canal === "whatsapp") {
      if (modo === "individual") {
        selecionados.forEach(f => {
          if (f.telefone) {
            const url = `https://wa.me/${formatPhone(f.telefone)}?text=${encodeURIComponent(mensagem)}`;
            window.open(url, "_blank");
          }
        });
        toast({ title: `${selecionados.length} conversa(s) aberta(s) no WhatsApp` });
      } else {
        const numeros = selecionados.filter(f => f.telefone).map(f => formatPhone(f.telefone!));
        const text = `Enviar para ${numeros.length} contatos:\n\n${mensagem}\n\nNúmeros:\n${numeros.join("\n")}`;
        navigator.clipboard.writeText(text);
        toast({ title: "Lista copiada!", description: "Os números e a mensagem foram copiados para a área de transferência." });
      }
    } else {
      const emails = selecionados.filter(f => f.email).map(f => f.email!);
      const mailtoUrl = `mailto:${modo === "grupo" ? "" : emails[0]}?${modo === "grupo" ? `bcc=${emails.join(",")}` : ""}&subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(mensagem)}`;
      window.open(mailtoUrl);
      toast({ title: `E-mail preparado para ${emails.length} destinatário(s)` });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Comunicações e Documentos</h1>
          <p className="text-sm text-muted-foreground">Envie mensagens instantâneas ou gere documentos oficiais (Advertências, Recibos) com assistência inteligente.</p>
        </div>

        <Tabs defaultValue="mensagens" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="mensagens" className="gap-2"><MessageCircle className="h-4 w-4"/> Avisos Rápidos</TabsTrigger>
            <TabsTrigger value="documentos" className="gap-2"><Bot className="h-4 w-4 text-primary"/> Gerador Oficial (IA)</TabsTrigger>
          </TabsList>

          <TabsContent value="mensagens" className="space-y-6">

        {/* Canal + Modo */}
        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            <button onClick={() => setCanal("whatsapp")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${canal === "whatsapp" ? "bg-success text-success-foreground shadow" : "text-muted-foreground"}`}>
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={() => setCanal("email")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${canal === "email" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>
              <Mail className="h-4 w-4" /> E-mail
            </button>
          </div>
          <div className="flex gap-2 rounded-xl bg-muted p-1">
            <button onClick={() => setModo("individual")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${modo === "individual" ? "bg-card shadow" : "text-muted-foreground"}`}>
              <UserCheck className="h-4 w-4" /> Individual
            </button>
            <button onClick={() => setModo("grupo")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${modo === "grupo" ? "bg-card shadow" : "text-muted-foreground"}`}>
              <Users className="h-4 w-4" /> Grupo
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left: Recipients */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Destinatários</h3>
                <button onClick={selectAll} className="text-xs text-primary hover:underline">
                  {selectedIds.size === filtered.length ? "Desmarcar todos" : "Selecionar todos"}
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou cargo..."
                  className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm" />
              </div>

              <div className="flex gap-2">
                <select value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs">
                  <option value="">Todas empresas</option>
                  {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
                </select>
                <select value={filterObra} onChange={e => setFilterObra(e.target.value)}
                  className="flex-1 rounded-lg border bg-background px-3 py-2 text-xs">
                  <option value="">Todas obras</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
                </select>
              </div>

              <div className="max-h-[350px] overflow-y-auto space-y-1">
                {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">Nenhum funcionário encontrado.</p>}
                {filtered.map(f => (
                  <label key={f.id} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${selectedIds.has(f.id) ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"}`}>
                    <input type="checkbox" checked={selectedIds.has(f.id)} onChange={() => toggleSelect(f.id)} className="rounded" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{f.cargo} • {canal === "whatsapp" ? f.telefone : f.email}</p>
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-xs text-muted-foreground text-center">{selectedIds.size} de {filtered.length} selecionados</p>
            </div>
          </div>

          {/* Right: Message */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Send className="h-4 w-4" /> Mensagem</h3>

              {canal === "email" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Assunto</label>
                  <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)}
                    placeholder="Assunto do e-mail..."
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm mt-1" />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground">Mensagem</label>
                <textarea value={mensagem} onChange={e => setMensagem(e.target.value)}
                  rows={8} placeholder={canal === "whatsapp" ? "Digite a mensagem para o WhatsApp..." : "Digite o corpo do e-mail..."}
                  className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm mt-1 resize-none" />
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Variáveis disponíveis:</p>
                <p>Use no texto para personalizar: <code className="bg-muted px-1 rounded">{"{{nome}}"}</code></p>
              </div>

              <button onClick={enviar} disabled={selectedIds.size === 0 || !mensagem.trim()}
                className={`w-full rounded-lg py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40 ${
                  canal === "whatsapp"
                    ? "bg-success text-success-foreground hover:bg-success/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}>
                {canal === "whatsapp" ? <MessageCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                Enviar {canal === "whatsapp" ? "WhatsApp" : "E-mail"} ({selectedIds.size})
              </button>
            </div>
          </div>
          </TabsContent>

          <TabsContent value="documentos">
            <GeradorDocumentos />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
