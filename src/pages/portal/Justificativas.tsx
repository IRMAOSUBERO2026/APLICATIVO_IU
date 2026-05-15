import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { FileText, Plus, Clock, CheckCircle2, XCircle, Paperclip } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Justificativas() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');
  const { user } = useAuth();
  const { toast } = useToast();
  const [justificativas, setJustificativas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!dateParam);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [funcionarioId, setFuncionarioId] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(dateParam || format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState("atestado");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    async function getFuncionario() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('funcionario_id')
        .eq('id', user.id)
        .single();
      
      if (data?.funcionario_id) {
        setFuncionarioId(data.funcionario_id);
        loadJustificativas(data.funcionario_id);
      }
    }
    getFuncionario();
  }, [user]);

  const loadJustificativas = async (fId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('justificativas_ponto')
      .select('*')
      .eq('funcionario_id', fId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJustificativas(data);
    }
    setLoading(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!funcionarioId) return;
    
    setIsSubmitting(true);
    try {
      let anexoUrl = null;
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${funcionarioId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('justificativas')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        anexoUrl = uploadData.path;
      }

      const { error } = await supabase
        .from('justificativas_ponto')
        .insert({
          funcionario_id: funcionarioId,
          data_ocorrencia: date,
          tipo: type,
          descricao: description,
          anexo_url: anexoUrl,
          status: 'pendente'
        });

      if (error) throw error;

      toast({ title: "Justificativa enviada", description: "Sua solicitação será analisada pelo RH." });
      setShowForm(false);
      resetForm();
      loadJustificativas(funcionarioId);
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setType("atestado");
    setDescription("");
    setFile(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente': return <Badge variant="outline" className="text-orange-500 border-orange-200 bg-orange-50">Pendente</Badge>;
      case 'aprovado': return <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50">Aprovado</Badge>;
      case 'reprovado': return <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">Recusado</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Justificativas</h2>
          <p className="text-muted-foreground text-sm">Envie atestados ou justifique faltas/atrasos.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Justificativa
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle>Nova Justificativa</CardTitle>
            <CardDescription>Preencha os dados abaixo e anexe o comprovante se necessário.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data da Ocorrência</Label>
                  <Input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Justificativa</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="atestado">Atestado Médico</SelectItem>
                      <SelectItem value="esquecimento">Esquecimento de Batida</SelectItem>
                      <SelectItem value="viagem">Viagem a Serviço</SelectItem>
                      <SelectItem value="servico_externo">Serviço Externo</SelectItem>
                      <SelectItem value="folga">Folga / Compensação</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Descrição / Observações</Label>
                <Textarea id="desc" placeholder="Explique o motivo..." value={description} onChange={e => setDescription(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Anexo (Foto ou PDF)</Label>
                <div className="flex items-center gap-3">
                  <Input id="file" type="file" onChange={handleFileUpload} className="hidden" />
                  <Button type="button" variant="outline" className="w-full h-24 border-dashed border-2 flex flex-col gap-2" onClick={() => document.getElementById('file')?.click()}>
                    <Paperclip className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {file ? file.name : "Clique para selecionar arquivo"}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Enviar Justificativa"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider">Histórico de Envios</h3>
        
        {loading ? (
          <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
        ) : justificativas.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-dashed">
            <p className="text-muted-foreground text-sm">Nenhuma justificativa enviada ainda.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {justificativas.map((j) => (
              <Card key={j.id} className="hover:border-primary/30 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-muted p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">
                          {format(parseISO(j.data_ocorrencia), "dd/MM/yyyy")}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">{j.tipo}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{j.descricao || "Sem descrição"}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {getStatusBadge(j.status)}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Enviado em {format(parseISO(j.created_at), "dd/MM/yy HH:mm")}
                      </p>
                    </div>
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
