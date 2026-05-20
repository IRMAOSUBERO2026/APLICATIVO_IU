import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderOpen, Upload, Trash2, FileText, ChevronRight, ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocumentManagerGenericProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  entityNome: string;
  basePath: string;
  subpastas: string[];
}

interface StorageFile {
  name: string;
}

export function DocumentManagerGeneric({ open, onOpenChange, entityId, entityNome, basePath, subpastas }: DocumentManagerGenericProps) {
  const [selectedPasta, setSelectedPasta] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fullPath = `${basePath}/${entityId}`;

  useEffect(() => {
    if (open && selectedPasta) loadFiles();
  }, [open, selectedPasta]);

  const loadFiles = async () => {
    if (!selectedPasta) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("documentos")
      .list(`${fullPath}/${selectedPasta}`, { limit: 100 });
    if (error) { setFiles([]); } else {
      setFiles((data || []).filter(f => f.name !== ".emptyFolderPlaceholder"));
    }
    setLoading(false);
  };

  const sanitizeName = (name: string) => {
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    const safe = base
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/_+/g, "_").replace(/^_|_$/g, "");
    return (safe || "arquivo") + ext.toLowerCase();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPasta) return;
    setUploading(true);
    const safeName = sanitizeName(file.name);
    const filePath = `${fullPath}/${selectedPasta}/${safeName}`;
    const { error } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true, contentType: file.type || undefined });
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo enviado", description: safeName });
      loadFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (fileName: string) => {
    if (!selectedPasta) return;
    const { error } = await supabase.storage.from("documentos").remove([`${fullPath}/${selectedPasta}/${fileName}`]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Excluído", description: fileName }); loadFiles(); }
  };

  const handleDownload = async (fileName: string) => {
    if (!selectedPasta) return;
    const filePath = `${fullPath}/${selectedPasta}/${fileName}`;
    try {
      const { data, error } = await supabase.storage.from("documentos").download(filePath);
      if (error || !data) throw error || new Error("Arquivo não encontrado");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: any) {
      toast({ title: "Erro ao baixar", description: err?.message || "Falha no download", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documentos — {entityNome}
          </DialogTitle>
        </DialogHeader>

        {!selectedPasta ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {subpastas.map((pasta) => (
              <button key={pasta} onClick={() => setSelectedPasta(pasta)} className="flex items-center gap-2 rounded-xl border bg-card p-4 text-left hover:bg-muted/50 transition-colors group">
                <FolderOpen className="h-5 w-5 text-warning flex-shrink-0" />
                <span className="text-sm font-medium truncate">{pasta}</span>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <button onClick={() => { setSelectedPasta(null); setFiles([]); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">{selectedPasta}</span>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
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
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                {files.map((file) => (
                  <div key={file.name} className="flex items-center gap-3 border-b last:border-0 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <button onClick={() => handleDownload(file.name)} className="p-1 text-muted-foreground hover:text-primary transition-colors"><Download className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(file.name)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
