import { AppLayout } from "@/components/layout/AppLayout";
import { HardHat, Calendar, ChevronRight, FileText, Loader2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";

interface ObraSummary {
  id: string;
  nome: string;
  codigo: string;
  diarios_count: number;
  ultimo_diario: string | null;
}

export default function DiarioObra() {
  const [obras, setObras] = useState<ObraSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Busca as obras ativas
        const { data: obrasData, error: errObras } = await supabase
          .from("obras")
          .select("id, nome, codigo")
          .in("status", OBRA_STATUS_ATIVOS_ARR)
          .order("nome");

        if (errObras || !obrasData) return;

        // Busca o resumo dos diários por obra (count e última data)
        // Como o Supabase RPC não temos acesso fácil pra criar um, vamos trazer os dados agregados via query
        const { data: diariosData } = await supabase
          .from("diarios_obra")
          .select("obra_id, data");

        const resumo = obrasData.map(obra => {
          const diariosDaObra = diariosData?.filter(d => d.obra_id === obra.id) || [];
          const count = diariosDaObra.length;
          // Ordena as datas em ordem decrescente para pegar a mais recente
          const datas = diariosDaObra.map(d => new Date(d.data).getTime()).filter(t => !isNaN(t));
          datas.sort((a, b) => b - a);
          const ultimaData = datas.length > 0 ? new Date(datas[0]).toISOString() : null;

          return {
            id: obra.id,
            nome: obra.nome,
            codigo: obra.codigo,
            diarios_count: count,
            ultimo_diario: ultimaData
          };
        });

        setObras(resumo);
      } catch (error) {
        console.error("Erro ao carregar dashboard de diários:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredObras = obras.filter(o => 
    o.nome.toLowerCase().includes(search.toLowerCase()) || 
    o.codigo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diários de Obra</h1>
            <p className="text-sm text-muted-foreground">Selecione uma obra para gerenciar seus relatórios diários (RDO)</p>
          </div>
          <div className="flex w-full max-w-sm items-center space-x-2">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar obra..."
                className="w-full bg-background pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredObras.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-20 text-center shadow-sm">
            <div className="rounded-full bg-muted p-3">
              <HardHat className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nenhuma obra encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique os filtros ou cadastre novas obras ativas no sistema.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredObras.map((obra) => (
              <div 
                key={obra.id} 
                onClick={() => navigate(`/diario-obra/${obra.id}`)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <HardHat className="h-5 w-5" />
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground opacity-50 transition-transform group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100" />
                </div>
                
                <div className="mt-4 space-y-1">
                  <p className="text-xs font-medium text-primary">{obra.codigo}</p>
                  <h3 className="font-semibold leading-tight line-clamp-2">{obra.nome}</h3>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Lançamentos
                    </p>
                    <p className="mt-1 text-lg font-bold text-foreground">
                      {obra.diarios_count}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Último RDO
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {obra.ultimo_diario ? new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "numeric"
                      }).format(new Date(obra.ultimo_diario)) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
