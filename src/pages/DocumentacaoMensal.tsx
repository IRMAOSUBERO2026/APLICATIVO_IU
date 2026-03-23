import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  FileText, FolderOpen, ChevronRight, ArrowLeft, Upload, Trash2, Download,
  Calendar, Search, Building2, RefreshCw, Users, Loader2, Archive
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const SUBPASTAS_MENSAL = [
  "Documentos Mensais",
  "Guias e Recibos de Impostos",
  "Plano de Saúde",
  "Holerites",
  "Cartão Ponto",
  "Contratações e Rescisão",
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Obra {
  id: string;
  nome: string;
  codigo: string;
  construtora: string | null;
  status: string;
}

interface Funcionario {
  id: string;
  nome: string;
  cargo: string;
  status: string;
  data_admissao: string;
  data_rescisao: string | null;
}

interface StorageFile {
  name: string;
}

export default function DocumentacaoMensal() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [selectedMesAno, setSelectedMesAno] = useState<string | null>(null);
  const [selectedPasta, setSelectedPasta] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [search, setSearch] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  useEffect(() => {
    loadObras();
  }, []);

  useEffect(() => {
    if (selectedObra) {
      loadFuncionarios(selectedObra.id);
    }
  }, [selectedObra]);

  useEffect(() => {
    if (selectedPasta && selectedMesAno && selectedObra) {
      loadFiles();
    }
  }, [selectedPasta, selectedMesAno, selectedObra]);

  const loadObras = async () => {
    const { data } = await supabase.from("obras").select("id, nome, codigo, construtora, status").order("nome");
    setObras(data || []);
  };

  const loadFuncionarios = async (obraId: string) => {
    const { data } = await supabase
      .from("funcionarios")
      .select("id, nome, cargo, status, data_admissao, data_rescisao")
      .eq("obra_id", obraId)
      .order("nome");
    setFuncionarios(data || []);
  };

  const basePath = (obraId: string, mesAno: string) =>
    `doc-mensal/${obraId}/${mesAno}`;

  const loadFiles = async () => {
    if (!selectedObra || !selectedMesAno || !selectedPasta) return;
    setLoading(true);
    const path = `${basePath(selectedObra.id, selectedMesAno)}/${selectedPasta}`;
    const { data, error } = await supabase.storage
      .from("documentos")
      .list(path, { limit: 200 });
    if (error) {
      setFiles([]);
    } else {
      setFiles((data || []).filter(f => f.name !== ".emptyFolderPlaceholder"));
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedObra || !selectedMesAno || !selectedPasta) return;
    setUploading(true);
    const path = `${basePath(selectedObra.id, selectedMesAno)}/${selectedPasta}/${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo enviado", description: file.name });
      loadFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (fileName: string) => {
    if (!selectedObra || !selectedMesAno || !selectedPasta) return;
    const path = `${basePath(selectedObra.id, selectedMesAno)}/${selectedPasta}/${fileName}`;
    const { error } = await supabase.storage.from("documentos").remove([path]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído", description: fileName }); loadFiles(); }
  };

  const handleDownload = (fileName: string) => {
    if (!selectedObra || !selectedMesAno || !selectedPasta) return;
    const path = `${basePath(selectedObra.id, selectedMesAno)}/${selectedPasta}/${fileName}`;
    const { data } = supabase.storage.from("documentos").getPublicUrl(path);
    window.open(data.publicUrl, "_blank");
  };

  // Sincronizar documentos dos funcionários (holerites, cartão ponto, contratações/rescisão)
  const syncFuncionariosDocs = async () => {
    if (!selectedObra || !selectedMesAno) return;
    setSyncing(true);

    const mesAnoLabel = selectedMesAno; // e.g. "2026-03"
    let copiedCount = 0;

    const pastaMapping: Record<string, string[]> = {
      "Holerites": ["Holerites"],
      "Cartão Ponto": ["Cartão Ponto"],
      "Contratações e Rescisão": ["Contrato", "Rescisão"],
    };

    for (const func of funcionarios) {
      for (const [destPasta, sourcePastas] of Object.entries(pastaMapping)) {
        for (const srcPasta of sourcePastas) {
          const srcPath = `funcionarios/${func.id}/${srcPasta}`;
          const { data: srcFiles } = await supabase.storage
            .from("documentos")
            .list(srcPath, { limit: 200 });

          if (!srcFiles || srcFiles.length === 0) continue;

          // Filter files that might match the month (by name containing the mesAno or month name)
          const relevantFiles = srcFiles.filter(f => {
            if (f.name === ".emptyFolderPlaceholder") return false;
            const lower = f.name.toLowerCase();
            // Match by YYYY-MM pattern or month name
            const mesNum = parseInt(mesAnoLabel.split("-")[1]);
            const mesNome = MESES[mesNum - 1]?.toLowerCase() || "";
            return lower.includes(mesAnoLabel) || lower.includes(mesNome) ||
              // For contratações/rescisão, copy all relevant docs
              destPasta === "Contratações e Rescisão";
          });

          for (const file of relevantFiles) {
            const srcFullPath = `${srcPath}/${file.name}`;
            const destFileName = `${func.nome} - ${file.name}`;
            const destFullPath = `${basePath(selectedObra.id, mesAnoLabel)}/${destPasta}/${destFileName}`;

            // Download then re-upload (Supabase doesn't have copy)
            const { data: blob } = await supabase.storage
              .from("documentos")
              .download(srcFullPath);
            if (blob) {
              await supabase.storage
                .from("documentos")
                .upload(destFullPath, blob, { upsert: true });
              copiedCount++;
            }
          }
        }
      }
    }

    setSyncing(false);
    toast({
      title: "Sincronização concluída",
      description: `${copiedCount} arquivo(s) copiado(s) das pastas dos funcionários.`,
    });

    if (selectedPasta) loadFiles();
  };

  const handleSelectMesAno = () => {
    setSelectedMesAno(`${ano}-${String(mes).padStart(2, "0")}`);
  };

  const filteredObras = obras.filter(o =>
    o.nome.toLowerCase().includes(search.toLowerCase()) ||
    (o.construtora || "").toLowerCase().includes(search.toLowerCase()) ||
    o.codigo.toLowerCase().includes(search.toLowerCase())
  );

  // Step 1: Selecionar obra
  if (!selectedObra) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentação Mensal Construtoras</h1>
            <p className="text-sm text-muted-foreground">Selecione a obra para gerar o pacote mensal</p>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar obra ou construtora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredObras.map((obra) => (
              <button
                key={obra.id}
                onClick={() => setSelectedObra(obra)}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 text-left hover:bg-muted/50 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{obra.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{obra.construtora || obra.codigo}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${
                  obra.status === "em_andamento" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                }`}>
                  {obra.status === "em_andamento" ? "Em andamento" : obra.status}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Step 2: Selecionar mês/ano
  if (!selectedMesAno) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedObra(null); setFuncionarios([]); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{selectedObra.nome}</h1>
              <p className="text-sm text-muted-foreground">{selectedObra.construtora || selectedObra.codigo} — Selecione o mês de referência</p>
            </div>
          </div>

          <div className="max-w-md rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-semibold text-sm">Mês de Referência</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mês</label>
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {MESES.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ano</label>
                <input
                  type="number"
                  value={ano}
                  onChange={(e) => setAno(Number(e.target.value))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <button
              onClick={handleSelectMesAno}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <FolderOpen className="h-4 w-4" />
              Abrir Pasta Mensal
            </button>

            {funcionarios.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <Users className="h-3.5 w-3.5" />
                  {funcionarios.length} funcionário(s) na obra
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {funcionarios.slice(0, 10).map(f => (
                    <div key={f.id} className="text-xs flex items-center justify-between py-1">
                      <span className="truncate">{f.nome}</span>
                      <span className="text-muted-foreground ml-2 flex-shrink-0">{f.cargo}</span>
                    </div>
                  ))}
                  {funcionarios.length > 10 && (
                    <p className="text-xs text-muted-foreground">+{funcionarios.length - 10} outros</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Step 3: Subpastas do mês
  if (!selectedPasta) {
    const mesNum = parseInt(selectedMesAno.split("-")[1]);
    const anoNum = parseInt(selectedMesAno.split("-")[0]);

    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedMesAno(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{selectedObra.nome}</h1>
                <p className="text-sm text-muted-foreground">
                  {MESES[mesNum - 1]} / {anoNum} — {selectedObra.construtora || selectedObra.codigo}
                </p>
              </div>
            </div>

            <button
              onClick={syncFuncionariosDocs}
              disabled={syncing || funcionarios.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground hover:bg-accent/80 transition-colors disabled:opacity-50"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Sincronizando..." : "Sincronizar Docs Funcionários"}
            </button>
          </div>

          {funcionarios.length > 0 && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span>{funcionarios.length} funcionário(s) vinculados a esta obra</span>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SUBPASTAS_MENSAL.map((pasta) => (
              <button
                key={pasta}
                onClick={() => setSelectedPasta(pasta)}
                className="flex items-center gap-2 rounded-xl border bg-card p-4 text-left hover:bg-muted/50 transition-colors group"
              >
                <FolderOpen className="h-5 w-5 text-warning flex-shrink-0" />
                <span className="text-sm font-medium truncate">{pasta}</span>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Step 4: Arquivos da subpasta
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectedPasta(null); setFiles([]); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{selectedPasta}</h1>
              <p className="text-xs text-muted-foreground">{selectedObra.nome} — {MESES[parseInt(selectedMesAno.split("-")[1]) - 1]} / {selectedMesAno.split("-")[0]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Upload className="h-3.5 w-3.5" /> {uploading ? "Enviando..." : "Upload"}
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando...</div>
        ) : files.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Nenhum documento nesta pasta</p>
            <p className="text-xs text-muted-foreground mt-1">Faça upload manual ou use "Sincronizar Docs Funcionários"</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            {files.map((file) => (
              <div key={file.name} className="flex items-center gap-3 border-b last:border-0 px-4 py-3 hover:bg-muted/30 transition-colors">
                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{file.name}</span>
                <button onClick={() => handleDownload(file.name)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                  <Download className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(file.name)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
