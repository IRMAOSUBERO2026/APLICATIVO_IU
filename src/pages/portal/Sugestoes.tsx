import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { Lightbulb, Send, History, CheckCircle2, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Sugestoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null);

  // Form
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anonimo, setAnonimo] = useState(false);

  useEffect(() => {
    async function init() {
      if (!user) return;
      const { data: prof } = await supabase
        .from('profiles')
        .select('funcionario_id')
        .eq('id', user.id)
        .single();
      
      if (prof?.funcionario_id) {
        setFuncionarioId(prof.funcionario_id);
        loadSugestoes(prof.funcionario_id);
      }
    }
    init();
  }, [user]);

  const loadSugestoes = async (fId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('sugestoes')
      .select('*')
      .eq('funcionario_id', fId)
      .order('created_at', { ascending: false });
    
    if (data) setSugestoes(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionarioId || !titulo.trim() || !descricao.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('sugestoes')
        .insert({
          funcionario_id: funcionarioId,
          titulo: titulo.trim(),
          descricao: descricao.trim(),
          anonimo
        });

      if (error) throw error;

      toast({ title: "Sugestão enviada!", description: "Obrigado por ajudar a melhorar nossa empresa." });
      setTitulo("");
      setDescricao("");
      loadSugestoes(funcionarioId);
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Sugestões e Ideias</h2>
        <p className="text-muted-foreground text-sm">Sua opinião é importante para nós. Compartilhe suas ideias de melhoria.</p>
      </div>

      <Card className="border-primary/20 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Nova Sugestão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Ideia</Label>
              <Input id="titulo" placeholder="Ex: Melhoria no refeitório" value={titulo} onChange={e => setTitulo(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição Detalhada</Label>
              <Textarea id="desc" placeholder="Explique sua ideia..." className="min-h-[100px]" value={descricao} onChange={e => setDescricao(e.target.value)} required />
            </div>
            <div className="flex items-center justify-between py-2 border rounded-lg px-4 bg-muted/20">
              <div className="space-y-0.5">
                <Label>Enviar como Anônimo</Label>
                <p className="text-xs text-muted-foreground">Sua identidade não será revelada ao RH.</p>
              </div>
              <Switch checked={anonimo} onCheckedChange={setAnonimo} />
            </div>
            <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
              <Send className="h-4 w-4" /> {isSubmitting ? "Enviando..." : "Enviar Sugestão"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider flex items-center gap-2">
          <History className="h-4 w-4" /> Minhas Sugestões
        </h3>

        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
        ) : sugestoes.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed">
            <p className="text-muted-foreground text-sm">Você ainda não enviou nenhuma sugestão.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {sugestoes.map((s) => (
              <Card key={s.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-sm">{s.titulo}</h4>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {s.status === 'recebido' ? 'Recebido' : s.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">{s.descricao}</p>
                  
                  {s.resposta_rh && (
                    <div className="bg-primary/5 p-3 rounded-lg border border-primary/10 mt-3">
                      <p className="text-[10px] font-bold text-primary uppercase flex items-center gap-1 mb-1">
                        <MessageCircle className="h-3 w-3" /> Resposta do RH
                      </p>
                      <p className="text-xs text-gray-700 italic">"{s.resposta_rh}"</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t pt-2">
                    <span className="text-[10px] text-muted-foreground">
                      {format(parseISO(s.created_at), "dd/MM/yyyy")}
                    </span>
                    {s.anonimo && <span className="text-[10px] font-medium text-gray-400 italic">Enviado anonimamente</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
