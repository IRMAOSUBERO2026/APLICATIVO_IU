import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Megaphone, Info, AlertTriangle, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Mural() {
  const { user } = useAuth();
  const [avisos, setAvisos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAvisos() {
      setLoading(true);
      const { data, error } = await supabase
        .from('avisos')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAvisos(data);
      }
      setLoading(false);
    }
    loadAvisos();
  }, []);

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'importante': return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'evento': return <Calendar className="h-5 w-5 text-blue-500" />;
      default: return <Megaphone className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mural de Recados</h2>
        <p className="text-muted-foreground text-sm">Fique por dentro das novidades e comunicados da empresa.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
      ) : avisos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed">
          <Bell className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground font-medium">Nenhum recado no mural no momento.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {avisos.map((aviso) => (
            <Card key={aviso.id} className={`${aviso.tipo === 'importante' ? 'border-destructive/30 bg-destructive/5' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIcon(aviso.tipo)}
                    <CardTitle className="text-lg">{aviso.titulo}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(aviso.created_at), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary" className="text-[10px] uppercase">{aviso.categoria}</Badge>
                  {aviso.tipo === 'importante' && <Badge variant="destructive" className="text-[10px] uppercase">Importante</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {aviso.mensagem}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
