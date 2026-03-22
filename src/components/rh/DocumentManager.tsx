import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FolderOpen, Upload, Trash2, FileText, ChevronRight, ArrowLeft, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SUBPASTAS_FUNCIONARIO = [
  "Contrato",
  "Doc Admissionais",
  "Férias",
  "Ficha de EPI",
  "Cartão Ponto",
  "Holerites",
  "Rescisão",
  "Advertências",
  "Documentos",
  "Exames",
  "Treinamentos",
];

interface DocumentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarioId: string;
  funcionarioNome: string;
}

interface StorageFile {
  name: string;
  id?: string;
  created_at?: string;
}

export function DocumentManager({ open, onOpenChange, funcionarioId, funcionarioNome }: DocumentManagerProps) {
  const [selectedPasta, setSelectedPasta] = useState<string | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const basePath = `funcionarios/${funcionarioId}`;

  useEffect(() => {
    if (open && selectedPasta) {
      loadFiles();
    }
  }, [open, selectedPasta]);

  const loadFiles = async () => {
    if (!selectedPasta) return;
    setLoading(true);
    const { data, error } = await supabase.storage
      .from("documentos")
      .list(`${basePath}/${selectedPasta}`, { limit: 100 });
    if (error) {
      console.error(error);
      setFiles([]);
    } else {
      setFiles((data || []).filter(f => f.name !== ".emptyFolderPlaceholder"));
    }
    setLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPasta) return;
    setUploading(true);
    const filePath = `${basePath}/${selectedPasta}/${file.name}`;
    const { error } = await supabase.storage.from("documentos").upload(filePath, file, { upsert: true });
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
    if (!selectedPasta) return;
    const filePath = `${basePath}/${selectedPasta}/${fileName}`;
    const { error } = await supabase.storage.from("documentos").remove([filePath]);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Arquivo excluído", description: fileName });
      loadFiles();
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!selectedPasta) return;
    const filePath = `${basePath}/${selectedPasta}/${fileName}`;
    const { data } = supabase.storage.from("documentos").getPublicUrl(filePath);
    window.open(data.publicUrl, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documentos — {funcionarioNome}
          </DialogTitle>
        </DialogHeader>

        {!selectedPasta ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {SUBPASTAS_FUNCIONARIO.map((pasta) => (
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
        ) : (
          <div className="space-y-4 mt-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setSelectedPasta(null); setFiles([]); }}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-primary">{selectedPasta}</span>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Enviando..." : "Upload"}
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
                <p className="text-xs text-muted-foreground/70 mt-1">Clique em Upload para adicionar</p>
              </div>
            ) : (
              <div className="rounded-xl border bg-card overflow-hidden">
                {files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-3 border-b last:border-0 px-4 py-3 hover:bg-muted/30 transition-colors"
                  >
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
        )}
      </DialogContent>
    </Dialog>
  );
}
