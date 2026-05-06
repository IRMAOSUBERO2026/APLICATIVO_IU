import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Search, Calendar, FileText, ArrowLeft, Loader2, Download, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { generateDiarioPdf } from "@/lib/diarioPdfGenerator";

export default function DiarioObraPainel() {
  const { obraId } = useParams();
  const [obra, setObra] = useState<any>(null);
  const [diarios, setDiarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!obraId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Obra details
        const { data: obraData } = await supabase
          .from("obras")
          .select("id, nome, codigo")
          .eq("id", obraId)
          .single();
        if (obraData) setObra(obraData);

        // Diários list (traz observacoes para o PDF)
        const { data: diariosData, error } = await supabase
          .from("diarios_obra")
          .select("id, data, responsavel, clima, mao_de_obra_presente, atividades_executadas, observacoes, ocorrencias, created_at")
          .eq("obra_id", obraId)
          .order("data", { ascending: false });
        
        if (error) throw error;
        if (diariosData) setDiarios(diariosData);
      } catch (error: any) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [obraId]);

  const filteredDiarios = diarios.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    const dStr = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d.data));
    return dStr.includes(s) || (d.responsavel || "").toLowerCase().includes(s);
  });

  const totalPages = Math.ceil(filteredDiarios.length / itemsPerPage);
  const paginatedDiarios = filteredDiarios.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const handleGeneratePdf = async (id: string) => {
    const diarioToExport = diarios.find(d => d.id === id);
    if (diarioToExport && obra) {
      toast({ title: "Gerando PDF", description: "Carregando logo, fotos e resumo IA..." });
      try {
        await generateDiarioPdf(diarioToExport, obra);
      } catch (e: any) {
        toast({ title: "Erro ao gerar PDF", description: e?.message || "Falha desconhecida", variant: "destructive" });
      }
    } else {
      toast({ title: "Erro", description: "Dados insuficientes para gerar o PDF.", variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Breadcrumb / Header */}
        <div className="flex flex-col gap-4">
          <Link to="/diario-obra" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar para Obras
          </Link>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Painel do Diário</h1>
              {obra ? (
                <p className="text-sm font-medium text-primary mt-1">{obra.codigo} - {obra.nome}</p>
              ) : (
                <div className="h-5 w-48 bg-muted animate-pulse rounded mt-1"></div>
              )}
            </div>
            
            <Link to={`/diario-obra/${obraId}/novo`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all">
              <Plus className="h-4 w-4" /> Novo Lançamento Diário
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por data ou responsável..."
              className="w-full bg-background pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="text-sm font-medium text-muted-foreground">
            {filteredDiarios.length} registro(s) encontrado(s)
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredDiarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="rounded-full bg-muted p-3">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Nenhum RDO encontrado</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Esta obra ainda não possui relatórios diários ou sua busca não retornou resultados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-4">Data do RDO</th>
                    <th className="px-6 py-4">Responsável</th>
                    <th className="px-6 py-4">Clima</th>
                    <th className="px-6 py-4 text-center">Efetivo</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedDiarios.map((d) => (
                    <tr key={d.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(d.data))}
                      </td>
                      <td className="px-6 py-4">{d.responsavel || "Não informado"}</td>
                      <td className="px-6 py-4 capitalize">{d.clima || "—"}</td>
                      <td className="px-6 py-4 text-center font-semibold text-primary">{d.mao_de_obra_presente || 0}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            className="inline-flex h-8 items-center justify-center rounded-md border bg-background px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={() => toast({ title: "Visualizar", description: "Em construção" })}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> Ver
                          </button>
                          <button 
                            className="inline-flex h-8 items-center justify-center rounded-md bg-primary/10 px-3 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                            onClick={() => handleGeneratePdf(d.id)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" /> PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Página <span className="font-medium text-foreground">{page}</span> de <span className="font-medium text-foreground">{totalPages}</span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
