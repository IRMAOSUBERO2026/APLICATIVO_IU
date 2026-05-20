import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { User, MapPin, Phone, CreditCard, Edit2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function MeusDados() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [funcionario, setFuncionario] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<any[]>([]);

  // Edit states
  const [editData, setEditData] = useState<any>({});

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      setLoading(true);
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('funcionario_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.funcionario_id) {
        const { data: func } = await supabase
          .from('funcionarios')
          .select('*')
          .eq('id', profile.funcionario_id)
          .single();
        
        if (func) {
          setFuncionario(func);
          setEditData({
            telefone: func.telefone || "",
            endereco: func.endereco || "",
            bairro: func.bairro || "",
            cidade: func.cidade || "",
            uf: func.uf || "",
            cep: func.cep || "",
            codigoPix: (func as any).codigo_pix || ""
          });
        }

        const { data: sols } = await supabase
          .from('solicitacoes_atualizacao')
          .select('*')
          .eq('funcionario_id', profile.funcionario_id)
          .order('created_at', { ascending: false });
        
        if (sols) setSolicitacoes(sols);
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionario || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('solicitacoes_atualizacao')
        .insert({
          funcionario_id: funcionario.id,
          dados_novos: editData,
          status: 'pendente'
        });

      if (error) throw error;

      toast({ title: "Solicitação enviada!", description: "O RH analisará seu pedido de atualização." });
      setIsEditing(false);
      
      // Reload solicitations
      const { data: sols } = await supabase
        .from('solicitacoes_atualizacao')
        .select('*')
        .eq('funcionario_id', funcionario.id)
        .order('created_at', { ascending: false });
      if (sols) setSolicitacoes(sols);
    } catch (error: any) {
      toast({ title: "Erro ao solicitar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const DataRow = ({ label, value, icon: Icon }: any) => (
    <div className="flex items-center gap-4 py-3 border-b last:border-0">
      <div className="bg-muted p-2 rounded-lg">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || "Não informado"}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meus Dados</h2>
          <p className="text-muted-foreground text-sm">Confira suas informações e solicite atualizações.</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)} variant="outline" className="gap-2">
            <Edit2 className="h-4 w-4" /> Editar Dados
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataRow label="Nome Completo" value={funcionario?.nome} icon={User} />
              <DataRow label="CPF" value={funcionario?.cpf} icon={CreditCard} />
              <DataRow label="PIS" value={funcionario?.pis} icon={CreditCard} />
              <DataRow label="Cargo" value={funcionario?.cargo} icon={Badge} />
              <DataRow label="Data de Admissão" value={funcionario?.admissao} icon={Clock} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="h-5 w-5 text-primary" />
                Contatos e Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DataRow label="Telefone" value={funcionario?.telefone} icon={Phone} />
              <DataRow label="Endereço" value={`${funcionario?.endereco}, ${funcionario?.bairro}`} icon={MapPin} />
              <DataRow label="Cidade/UF" value={`${funcionario?.cidade} - ${funcionario?.uf}`} icon={MapPin} />
              <DataRow label="CEP" value={funcionario?.cep} icon={MapPin} />
              <DataRow label="Chave PIX" value={funcionario?.codigoPix} icon={CreditCard} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {isEditing && (
            <Card className="border-primary shadow-lg sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Solicitar Alteração</CardTitle>
                <CardDescription>Apenas campos editáveis. O RH validará os novos dados.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tel">Telefone</Label>
                    <Input id="tel" value={editData.telefone} onChange={e => setEditData({...editData, telefone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">Endereço</Label>
                    <Input id="end" value={editData.endereco} onChange={e => setEditData({...editData, endereco: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="cid">Cidade</Label>
                      <Input id="cid" value={editData.cidade} onChange={e => setEditData({...editData, cidade: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="uf">UF</Label>
                      <Input id="uf" value={editData.uf} onChange={e => setEditData({...editData, uf: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pix">Chave PIX</Label>
                    <Input id="pix" value={editData.codigoPix} onChange={e => setEditData({...editData, codigoPix: e.target.value})} />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="ghost" className="flex-1" onClick={() => setIsEditing(false)}>Cancelar</Button>
                    <Button type="submit" className="flex-1" disabled={isSubmitting}>
                      {isSubmitting ? "Enviando..." : "Solicitar"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4" /> Solicitações Recentes
            </h3>
            {solicitacoes.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-lg border border-dashed">Nenhuma solicitação pendente.</p>
            ) : (
              <div className="space-y-3">
                {solicitacoes.map(s => (
                  <Card key={s.id} className="bg-muted/10 border-muted">
                    <CardContent className="p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">
                          {s.status === 'pendente' ? 'Pendente' : s.status}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-bold text-gray-600">DADOS SOLICITADOS:</p>
                      <div className="text-[9px] text-muted-foreground mt-1 line-clamp-2">
                        {Object.entries(s.dados_novos).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </div>
                      {s.status === 'reprovado' && s.motivo_reprovacao && (
                        <div className="mt-2 text-[9px] text-red-500 bg-red-50 p-1.5 rounded border border-red-100 flex gap-1 items-start">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>{s.motivo_reprovacao}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
