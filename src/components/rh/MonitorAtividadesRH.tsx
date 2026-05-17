import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  UserCheck, 
  UserMinus, 
  FileText, 
  AlertCircle, 
  Clock,
  ExternalLink,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";

export function MonitorAtividadesRH() {
  const [atividades, setAtividades] = useState<any[]>([]);
  const [stats, setStats] = useState({
    cadastrados: 0,
    pendentes: 0,
    atestados: 0,
    atualizacoes: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Estatísticas de Acesso
      const { data: creds } = await supabase.from("portal_credentials").select("pin_configurado, ultimo_acesso");
      const { count: totalFuncs } = await supabase.from("funcionarios").select("id", { count: "exact", head: true }).eq("status", "ativo");
      
      const cadastrados = creds?.filter(c => c.pin_configurado).length || 0;
      
      // 2. Atestados/Justificativas pendentes
      const { data: justs } = await supabase
        .from("justificativas_ponto")
        .select("*, funcionarios(nome)")
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      // 3. Solicitações de atualização pendentes
      const { data: updates } = await supabase
        .from("solicitacoes_atualizacao")
        .select("*, funcionarios(nome)")
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      setStats({
        cadastrados,
        pendentes: (totalFuncs || 0) - cadastrados,
        atestados: justs?.length || 0,
        atualizacoes: updates?.length || 0
      });

      // Combinar para o mural (Timeline)
      const timeline: any[] = [];
      
      justs?.forEach((j: any) => timeline.push({
        id: j.id,
        tipo: "justificativa",
        msg: `Nova justificativa (${j.tipo}) enviada por ${j.funcionarios?.nome ?? 'funcionário'}`,
        data: j.created_at,
        status: "pendente"
      }));

      updates?.forEach((u: any) => timeline.push({
        id: u.id,
        tipo: "atualizacao",
        msg: `Solicitação de alteração de dados: ${u.funcionarios?.nome ?? 'funcionário'}`,
        data: u.created_at,
        status: "pendente"
      }));

      setAtividades(timeline.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()));

    } catch (error) {
      console.error("Erro ao carregar monitor:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Com Acesso</p>
                <p className="text-2xl font-bold text-success">{stats.cadastrados}</p>
              </div>
              <UserCheck className="h-8 w-8 text-success/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Sem Portal</p>
                <p className="text-2xl font-bold text-warning">{stats.pendentes}</p>
              </div>
              <UserMinus className="h-8 w-8 text-warning/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Justificativas</p>
                <p className="text-2xl font-bold text-blue-500">{stats.atestados}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-bold">Atualizações</p>
                <p className="text-2xl font-bold text-purple-500">{stats.atualizacoes}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mural de Atividades Recentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Mural de Interações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[500px] overflow-y-auto">
              {atividades.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  Nenhuma atividade pendente no momento.
                </div>
              ) : (
                atividades.map((atv) => (
                  <div key={atv.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 p-2 rounded-full ${atv.tipo === 'justificativa' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                        {atv.tipo === 'justificativa' ? <FileText size={16} /> : <AlertCircle size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{atv.msg}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(atv.data), "eeee, dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] uppercase font-bold">Pendente</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Busca Rápida de Acessos */}
        <Card>
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Status de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <Input 
              placeholder="Verificar funcionário..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground italic">
              Use esta busca para verificar rapidamente se o colaborador já possui PIN configurado.
            </p>
            {/* Aqui poderíamos listar os últimos acessados */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
