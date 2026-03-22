import { AppLayout } from "@/components/layout/AppLayout";
import { Search, Upload, AlertTriangle, MessageCircle, UserPlus, FolderOpen, Stethoscope, ArrowRightLeft, Save } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { Funcionario, funcionariosData, getExamStatus } from "@/components/rh/types";
import { ExamBadge } from "@/components/rh/ExamBadge";
import { FuncionarioAvatar } from "@/components/rh/FuncionarioAvatar";
import { WhatsAppSender } from "@/components/rh/WhatsAppSender";
import { PreCadastroForm } from "@/components/rh/PreCadastroForm";
import { DocumentManager } from "@/components/rh/DocumentManager";
import { ExamesModule } from "@/components/rh/ExamesModule";
import { TransferirFuncionario } from "@/components/rh/TransferirFuncionario";
import { supabase } from "@/integrations/supabase/client";

function parseCSV(text: string): Partial<Funcionario>[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[;\t,]/).map(h => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(/[;\t,]/).map(v => v.trim());
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

type TabKey = "lista" | "exames_tab" | "exames_modulo";

export default function RH() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabKey>("lista");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [funcionarios, setFuncionarios] = useState(funcionariosData);
  const [whatsOpen, setWhatsOpen] = useState(false);
  const [preCadastroOpen, setPreCadastroOpen] = useState(false);
  const [docManagerOpen, setDocManagerOpen] = useState(false);
  const [selectedFuncDoc, setSelectedFuncDoc] = useState<{ id: string; nome: string } | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [selectedFuncTransfer, setSelectedFuncTransfer] = useState<{ id: string; nome: string; obraId: string | null } | null>(null);

  // DB funcionarios
  const [dbFuncionarios, setDbFuncionarios] = useState<any[]>([]);
  const [editingRegistro, setEditingRegistro] = useState<Record<string, string>>({});

  const loadDbFuncionarios = useCallback(() => {
    supabase.from("funcionarios")
      .select("id, nome, cpf, cargo, empresa_id, status, salario_base, salario_combinado, data_admissao, data_aso, data_nr6, data_nr12, data_nr18, data_nr35, foto_url, codigo_pix, banco, agencia, conta, tipo_conta, numero_registro, obra_id")
      .then(({ data }) => { if (data) setDbFuncionarios(data); });
  }, []);

  useEffect(() => { loadDbFuncionarios(); }, [loadDbFuncionarios]);

  const filtered = funcionarios.filter((f) =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.cargo.toLowerCase().includes(search.toLowerCase()) ||
    f.obra.toLowerCase().includes(search.toLowerCase()) ||
    f.empresa.toLowerCase().includes(search.toLowerCase())
  );

  const examesVencendo = funcionarios.filter(f =>
    getExamStatus(f.aso, 1) !== "ok" ||
    getExamStatus(f.nr6, 1) !== "ok" ||
    getExamStatus(f.nr12, 2) !== "ok" ||
    getExamStatus(f.nr18, 2) !== "ok" ||
    getExamStatus(f.nr35, 2) !== "ok"
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Erro", description: "Nenhum dado encontrado no arquivo.", variant: "destructive" });
        return;
      }
      toast({ title: "Upload realizado", description: `${parsed.length} registros importados com sucesso.` });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePhotoChange = (id: number, dataUrl: string) => {
    setFuncionarios(prev => prev.map(f => f.id === id ? { ...f, foto: dataUrl } : f));
  };

  const handleNewFuncionario = (func: Funcionario) => {
    setFuncionarios(prev => [...prev, func]);
  };

  const openDocManager = (funcId: string, funcNome: string) => {
    setSelectedFuncDoc({ id: funcId, nome: funcNome });
    setDocManagerOpen(true);
  };

  const openTransfer = (funcId: string, funcNome: string, obraId: string | null) => {
    setSelectedFuncTransfer({ id: funcId, nome: funcNome, obraId });
    setTransferOpen(true);
  };

  const saveRegistro = async (funcId: string) => {
    const val = editingRegistro[funcId];
    if (val === undefined) return;
    const { error } = await supabase.from("funcionarios").update({ numero_registro: val }).eq("id", funcId);
    if (error) {
      toast({ title: "Erro ao salvar registro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Nº Registro salvo" });
      setEditingRegistro(prev => { const n = { ...prev }; delete n[funcId]; return n; });
      loadDbFuncionarios();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recursos Humanos</h1>
            <p className="text-sm text-muted-foreground">{funcionarios.length + dbFuncionarios.length} funcionários</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setWhatsOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2.5 text-sm font-medium text-success-foreground shadow-sm hover:bg-success/90 transition-colors">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Upload className="h-4 w-4" /> Importar CSV
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt,.xls,.xlsx" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => setPreCadastroOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
              <UserPlus className="h-4 w-4" /> Pré-Cadastro
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button onClick={() => setTab("lista")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "lista" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Lista de Funcionários
          </button>
          <button onClick={() => setTab("exames_tab")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors relative ${tab === "exames_tab" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            Exames e Treinamentos
            {examesVencendo.length > 0 && (
              <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {examesVencendo.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab("exames_modulo")} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${tab === "exames_modulo" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
            <span className="flex items-center justify-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" /> Gestão de Exames
            </span>
          </button>
        </div>

        {tab === "exames_modulo" ? (
          <ExamesModule />
        ) : (
          <>
            {examesVencendo.length > 0 && tab === "exames_tab" && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h3 className="text-sm font-semibold text-warning">Atenção: Exames/Treinamentos vencendo ou vencidos</h3>
                </div>
                <p className="text-xs text-muted-foreground">{examesVencendo.length} funcionário(s) com pendências</p>
              </div>
            )}

            {/* Search */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Buscar funcionário, cargo, obra ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>

            {tab === "lista" ? (
              <div className="space-y-4">
                {/* Funcionários do banco */}
                {dbFuncionarios.length > 0 && (
                  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b bg-muted/30">
                      <h3 className="text-sm font-semibold">Funcionários Cadastrados ({dbFuncionarios.length})</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nº Registro</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">CPF</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cargo</th>
                            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Pasta</th>
                            <th className="px-4 py-3 text-center font-medium text-muted-foreground">Transferir</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbFuncionarios
                            .filter(f => !search || f.nome?.toLowerCase().includes(search.toLowerCase()) || f.cargo?.toLowerCase().includes(search.toLowerCase()) || f.cpf?.includes(search))
                            .map((f) => (
                            <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3.5 font-medium">{f.nome}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={editingRegistro[f.id] ?? f.numero_registro ?? ""}
                                    onChange={e => setEditingRegistro(prev => ({ ...prev, [f.id]: e.target.value }))}
                                    placeholder="Nº registro..."
                                    className="w-28 rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                  />
                                  {editingRegistro[f.id] !== undefined && editingRegistro[f.id] !== (f.numero_registro ?? "") && (
                                    <button onClick={() => saveRegistro(f.id)} className="p-1 text-primary hover:text-primary/80">
                                      <Save className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground text-xs">{f.cpf}</td>
                              <td className="px-4 py-3.5 text-muted-foreground">{f.cargo}</td>
                              <td className="px-4 py-3.5">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${f.status === "ativo" ? "bg-success/10 text-success" : "bg-accent/10 text-accent"}`}>{f.status}</span>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => openDocManager(f.id, f.nome)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                                  title="Pasta de Documentos"
                                >
                                  <FolderOpen className="h-4 w-4" />
                                </button>
                              </td>
                              <td className="px-4 py-3.5 text-center">
                                <button
                                  onClick={() => openTransfer(f.id, f.nome, f.obra_id)}
                                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                  title="Transferir de Obra"
                                >
                                  <ArrowRightLeft className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Funcionários locais (mock) */}
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b bg-muted/30">
                    <h3 className="text-sm font-semibold">Funcionários Exemplo ({filtered.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Foto</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa/CNPJ</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Cargo</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Obra</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Admissão</th>
                          <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                          <th className="px-4 py-3 text-right font-medium text-muted-foreground">Salário</th>
                          <th className="px-4 py-3 text-center font-medium text-muted-foreground">Pasta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((f) => (
                          <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                            <td className="px-4 py-3.5">
                              <FuncionarioAvatar nome={f.nome} foto={f.foto} size="sm" editable onPhotoChange={(url) => handlePhotoChange(f.id, url)} />
                            </td>
                            <td className="px-4 py-3.5">
                              <div>
                                <span className="font-medium">{f.nome}</span>
                                <p className="text-[10px] text-muted-foreground">{f.cpf}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div>
                                <span className="text-xs font-medium">{f.empresa}</span>
                                <p className="text-[10px] text-muted-foreground">{f.cnpj}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground">{f.cargo}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">{f.obra}</td>
                            <td className="px-4 py-3.5 text-muted-foreground">{f.admissao ? new Date(f.admissao).toLocaleDateString("pt-BR") : "—"}</td>
                            <td className="px-4 py-3.5">
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                f.status === "Ativo" ? "bg-success/10 text-success" :
                                f.status === "Pré-Cadastro" ? "bg-warning/10 text-warning" :
                                "bg-accent/10 text-accent"
                              }`}>{f.status}</span>
                            </td>
                            <td className="px-4 py-3.5 text-right font-medium">
                              R$ {f.salarioCombinado.toLocaleString("pt-BR")}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                onClick={(e) => { e.stopPropagation(); openDocManager(String(f.id), f.nome); }}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-warning hover:bg-warning/10 transition-colors"
                                title="Pasta de Documentos"
                              >
                                <FolderOpen className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Empresa</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">ASO (1 ano)</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR6 (1 ano)</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR12 (2 anos)</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR18 (2 anos)</th>
                        <th className="px-4 py-3 text-center font-medium text-muted-foreground">NR35 (2 anos)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((f) => (
                        <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <FuncionarioAvatar nome={f.nome} foto={f.foto} size="sm" />
                              <span className="font-medium">{f.nome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{f.empresa}</td>
                          <td className="px-4 py-3.5 text-center"><ExamBadge date={f.aso} validityYears={1} label="ASO" /></td>
                          <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr6} validityYears={1} label="NR6" /></td>
                          <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr12} validityYears={2} label="NR12" /></td>
                          <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr18} validityYears={2} label="NR18" /></td>
                          <td className="px-4 py-3.5 text-center"><ExamBadge date={f.nr35} validityYears={2} label="NR35" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <WhatsAppSender open={whatsOpen} onOpenChange={setWhatsOpen} funcionarios={funcionarios} />
      <PreCadastroForm open={preCadastroOpen} onOpenChange={setPreCadastroOpen} onSave={handleNewFuncionario} nextId={funcionarios.length + 1} />
      {selectedFuncDoc && (
        <DocumentManager
          open={docManagerOpen}
          onOpenChange={setDocManagerOpen}
          funcionarioId={selectedFuncDoc.id}
          funcionarioNome={selectedFuncDoc.nome}
        />
      )}
      {selectedFuncTransfer && (
        <TransferirFuncionario
          open={transferOpen}
          onOpenChange={setTransferOpen}
          funcionarioId={selectedFuncTransfer.id}
          funcionarioNome={selectedFuncTransfer.nome}
          obraAtualId={selectedFuncTransfer.obraId}
          onTransferido={loadDbFuncionarios}
        />
      )}
    </AppLayout>
  );
}
