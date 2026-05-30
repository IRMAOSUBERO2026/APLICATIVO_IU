import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Smartphone, Building2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OBRA_STATUS_ATIVOS_ARR } from "@/lib/obraStatus";

interface Equipamento {
  id: string;
  serial_numero: string;
  modelo: string;
  descricao: string;
  obra_id: string;
  ativo: boolean;
  obras?: {
    nome: string;
    codigo: string;
  };
}

export default function EquipamentosPonto() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipamento | null>(null);

  const [formData, setFormData] = useState({
    serial_numero: "",
    modelo: "",
    descricao: "",
    obra_id: "",
    ativo: true,
  });

  const loadData = async () => {
    setLoading(true);
    const { data: eqs } = await supabase
      .from("ponto_equipamentos")
      .select("*, obras:obra_id(nome, codigo)")
      .order("criado_em", { ascending: false });
    
    if (eqs) setEquipamentos(eqs as any);

    const { data: obs } = await supabase
      .from("obras")
      .select("id, nome, codigo")
      .in("status", OBRA_STATUS_ATIVOS_ARR)
      .order("codigo");
    
    if (obs) setObras(obs);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpen = (eq?: Equipamento) => {
    if (eq) {
      setEditing(eq);
      setFormData({
        serial_numero: eq.serial_numero,
        modelo: eq.modelo || "",
        descricao: eq.descricao || "",
        obra_id: eq.obra_id,
        ativo: eq.ativo,
      });
    } else {
      setEditing(null);
      setFormData({
        serial_numero: "",
        modelo: "",
        descricao: "",
        obra_id: "",
        ativo: true,
      });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!formData.serial_numero || !formData.obra_id) {
      toast({ title: "Erro", description: "Número de série e obra são obrigatórios.", variant: "destructive" });
      return;
    }

    try {
      if (editing) {
        const { error } = await supabase
          .from("ponto_equipamentos")
          .update(formData)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Equipamento atualizado" });
      } else {
        const { error } = await supabase
          .from("ponto_equipamentos")
          .insert([formData]);
        if (error) throw error;
        toast({ title: "Equipamento cadastrado" });
      }
      setOpen(false);
      loadData();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Equipamentos de Ponto</h1>
            <p className="text-sm text-muted-foreground">Gerencie os relógios de ponto das obras</p>
          </div>
          <Button onClick={() => handleOpen()} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Equipamento
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipamentos.map((eq) => (
            <div key={eq.id} className={`rounded-xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${!eq.ativo && "opacity-60"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleOpen(eq)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <div className={`h-2 w-2 rounded-full ${eq.ativo ? "bg-success" : "bg-muted-foreground"}`} title={eq.ativo ? "Ativo" : "Inativo"} />
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="font-bold text-lg">{eq.serial_numero}</h3>
                <p className="text-sm text-muted-foreground">{eq.modelo || "Modelo não informado"}</p>
              </div>

              <div className="mt-4 pt-4 border-t flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Obra Vinculada</p>
                  <p className="text-sm font-semibold truncate">
                    {eq.obras?.codigo} - {eq.obras?.nome}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {equipamentos.length === 0 && !loading && (
            <div className="col-span-full py-12 text-center rounded-xl border border-dashed bg-muted/20">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Nenhum equipamento cadastrado.</p>
              <Button variant="link" onClick={() => handleOpen()} className="text-primary mt-2">Cadastrar o primeiro relógio</Button>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="serial">Número de Série *</Label>
              <Input
                id="serial"
                placeholder="Ex: 000123456789"
                value={formData.serial_numero}
                onChange={(e) => setFormData({ ...formData, serial_numero: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelo">Modelo</Label>
                <Input
                  id="modelo"
                  placeholder="Ex: Control ID Class"
                  value={formData.modelo}
                  onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="obra">Obra *</Label>
                <select
                  id="obra"
                  value={formData.obra_id}
                  onChange={(e) => setFormData({ ...formData, obra_id: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecione...</option>
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Descrição / Localização</Label>
              <Input
                id="desc"
                placeholder="Ex: Relógio Entrada Principal"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="ativo">Equipamento Ativo</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
