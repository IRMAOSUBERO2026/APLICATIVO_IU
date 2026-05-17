import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

type FuncionarioComPin = {
  id: string;
  nome: string;
  cpf: string;
  cargo: string;
  status: string;
  pin_configurado: boolean;
};

export function GestaoPinsModule() {
  const [funcionarios, setFuncionarios] = useState<FuncionarioComPin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [mostrarDesligados, setMostrarDesligados] = useState(false);
  const [selectedFunc, setSelectedFunc] = useState<FuncionarioComPin | null>(null);
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: funcData, error: funcError } = await supabase
        .from("funcionarios")
        .select("id, nome, cpf, cargo, status")
        .order("nome");

      if (funcError) throw funcError;

      const { data: pinData, error: pinError } = await supabase
        .from("portal_credentials")
        .select("funcionario_id, pin_configurado");

      if (pinError) throw pinError;

      const pinMap = new Map();
      pinData?.forEach(p => pinMap.set(p.funcionario_id, p.pin_configurado));

      const merged = funcData.map(f => ({
        ...f,
        pin_configurado: pinMap.get(f.id) || false
      }));

      setFuncionarios(merged);
    } catch (error: any) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (f: FuncionarioComPin) => {
    setSelectedFunc(f);
    // Generate a random 4 digit PIN suggestion
    setPin(Math.floor(1000 + Math.random() * 9000).toString());
  };

  const handleSavePin = async () => {
    if (!selectedFunc || !pin || pin.length < 4) {
      toast({ title: "PIN inválido", description: "O PIN deve ter no mínimo 4 dígitos", variant: "destructive" });
      return;
    }

    if (!selectedFunc.cpf) {
       toast({ title: "Erro", description: "Funcionário sem CPF cadastrado", variant: "destructive" });
       return;
    }

    setIsSubmitting(true);
    try {
      // Remove mask from CPF if any
      const cleanCpf = selectedFunc.cpf.replace(/\D/g, "");

      const { error } = await supabase
        .from("portal_credentials")
        .upsert({
          funcionario_id: selectedFunc.id,
          pin_configurado: true,
          pin: pin, // Salvando o PIN direto aqui
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      // Nota: Em um sistema real, aqui criaríamos o usuário no Auth também.
      // Para o seu teste de agora, o PIN salvo na tabela já permitirá o acesso se o LoginPortal ler desta tabela.

      toast({ title: "PIN configurado", description: `Acesso liberado para ${selectedFunc.nome}` });
      setSelectedFunc(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro ao salvar PIN", description: error.message || "Erro de servidor", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = funcionarios.filter(f => 
    !search || 
    f.nome.toLowerCase().includes(search.toLowerCase()) || 
    (f.cpf && f.cpf.includes(search))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Gestão de Acessos ao Portal
          </CardTitle>
          <CardDescription>
            Gere ou redefina o PIN de 4 dígitos para os colaboradores acessarem o portal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input 
              placeholder="Buscar por nome ou CPF..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="max-w-md"
            />
          </div>

          <ScrollableTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Nome</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">CPF</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Cargo</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-center">Status do Acesso</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-8">Carregando...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8">Nenhum funcionário encontrado</td></tr>
                ) : (
                  filtered.map(f => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{f.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.cpf || "Sem CPF"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{f.cargo}</td>
                      <td className="px-4 py-3 text-center">
                        {f.pin_configurado ? (
                          <span className="inline-flex items-center gap-1 text-success bg-success/10 px-2 py-1 rounded-full text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-warning bg-warning/10 px-2 py-1 rounded-full text-xs font-medium">
                            <ShieldAlert className="h-3 w-3" /> Bloqueado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant={f.pin_configurado ? "outline" : "default"} 
                          size="sm"
                          onClick={() => handleOpenModal(f)}
                          disabled={!f.cpf}
                        >
                          {f.pin_configurado ? "Redefinir PIN" : "Gerar PIN"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ScrollableTable>
        </CardContent>
      </Card>

      <Dialog open={!!selectedFunc} onOpenChange={(o) => !o && setSelectedFunc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Acesso</DialogTitle>
            <DialogDescription>
              Defina o PIN de 4 dígitos para <strong>{selectedFunc?.nome}</strong> acessar o Portal do Colaborador.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CPF do Colaborador (Login)</label>
              <Input value={selectedFunc?.cpf || ""} disabled />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">PIN (Senha)</label>
              <Input 
                value={pin} 
                onChange={e => setPin(e.target.value.replace(/\D/g, "").substring(0, 6))}
                type="text" 
                maxLength={6}
                className="text-2xl tracking-widest text-center py-6"
              />
              <p className="text-xs text-muted-foreground text-center">
                Mínimo 4 dígitos. Informe este número ao colaborador.
              </p>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedFunc(null)}>Cancelar</Button>
            <Button onClick={handleSavePin} disabled={isSubmitting || pin.length < 4}>
              {isSubmitting ? "Salvando..." : "Salvar e Liberar Acesso"}
            </Button>
            {selectedFunc?.pin_configurado && (
              <Button 
                variant="secondary" 
                className="bg-success hover:bg-success/90 text-white gap-2"
                onClick={() => {
                  const cleanPhone = (selectedFunc as any).telefone?.replace(/\D/g, "") || "";
                  const cleanCpf = (selectedFunc.cpf || "").replace(/\D/g, "");
                  const msg = `Olá *${selectedFunc.nome}*,\n\nSeu acesso ao *Portal do Colaborador* está liberado!\n\n*Link:* https://iuengenharia.lovable.app/login-portal\n*Login:* ${cleanCpf}\n*Senha (PIN):* ${pin}\n\n_Guarde este código para acessar seus recibos e ponto._`;
                  window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
                }}
              >
                Enviar via WhatsApp
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
