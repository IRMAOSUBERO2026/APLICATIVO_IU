import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import {
  Wrench, Plus, Search, MapPin, ShoppingCart, Settings, History,
  Trash2, Edit, HardHat, Zap, Wind, Hammer, Box, Layers,
  CheckCircle2, AlertTriangle, Clock, XCircle, Package, Camera
} from "lucide-react";
import { ScrollableTable } from "@/components/shared/ScrollableTable";

// Tipagens
interface Equipamento { id: string; codigo: string; descricao: string; tipo: string; marca: string | null; modelo: string | null; numero_serie: string | null; data_aquisicao: string | null; valor_aquisicao: number; obra_id: string | null; empresa_id: string | null; status: string; observacoes: string | null; foto_url?: string | null; }
interface Manutencao { id: string; equipamento_id: string; tipo: string; descricao: string; data_solicitacao: string; data_realizacao: string | null; fornecedor: string | null; valor_orcamento: number; valor_aprovado: number; status: string; observacoes: string | null; }
interface HistoricoAlocacao { id: string; data_movimentacao: string; obra_origem?: { nome: string }; obra_destino?: { nome: string }; responsavel: string | null; }

export default function EquipamentosProprios() {
  const [tab, setTab] = useState("painel");
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([]);
  const [obras, setObras] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [showEquipForm, setShowEquipForm] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [formEquip, setFormEquip] = useState({ codigo: "", descricao: "", tipo: "Outros", marca: "", modelo: "", numero_serie: "", data_aquisicao: "", valor_aquisicao: 0, obra_id: "", empresa_id: "", status: "disponivel", observacoes: "", foto_url: "" });

  const loadData = async () => {
    try {
      const { data: eq } = await supabase.from("equipamentos_proprios").select("*");
      const { data: mt } = await supabase.from("manutencoes_equipamento").select("*");
      const { data: ob } = await supabase.from("obras").select("id, nome, codigo");
      const { data: em } = await supabase.from("empresas").select("id, razao_social");
      if (eq) setEquipamentos(eq);
      if (mt) setManutencoes(mt);
      if (ob) setObras(ob);
      if (em) setEmpresas(em);
    } catch (e) {
      console.error("Erro ao carregar dados", e);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredEquip = useMemo(() => {
    return equipamentos.filter(e => e.descricao.toLowerCase().includes(busca.toLowerCase()) || e.codigo.toLowerCase().includes(busca.toLowerCase()));
  }, [equipamentos, busca]);

  async function saveEquip() {
    const payload = { ...formEquip, obra_id: formEquip.id || null, empresa_id: formEquip.empresa_id || null };
    if (editingEquip) await supabase.from("equipamentos_proprios").update(payload).eq("id", editingEquip.id);
    else await supabase.from("equipamentos_proprios").insert(payload);
    setShowEquipForm(false); loadData(); toast({ title: "Salvo!" });
  }

  return (
    <AppLayout>
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Equipamentos IU</h1>
          <Button onClick={() => setShowEquipForm(true)}><Plus className="mr-2" /> Novo</Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList><TabsTrigger value="painel">Resumo</TabsTrigger><TabsTrigger value="cadastro">Catalogo</TabsTrigger></TabsList>
          
          <TabsContent value="painel" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-4"><p className="text-sm">Total</p><p className="text-2xl font-bold">{equipamentos.length}</p></CardContent></Card>
              <Card><CardContent className="p-4"><p className="text-sm">Em Uso</p><p className="text-2xl font-bold">{equipamentos.filter(e => e.obra_id).length}</p></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="cadastro" className="mt-4 space-y-4">
            <Input placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-xs" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredEquip.map(eq => (
                <Card key={eq.id}>
                  <CardContent className="p-4">
                    <p className="font-bold">{eq.descricao}</p>
                    <p className="text-xs text-muted-foreground">{eq.codigo}</p>
                    <div className="mt-4 flex gap-2">
                       <Button size="sm" variant="outline" onClick={() => { setEditingEquip(eq); setFormEquip(eq as any); setShowEquipForm(true); }}><Edit size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showEquipForm} onOpenChange={setShowEquipForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>Equipamento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Codigo</Label><Input value={formEquip.codigo} onChange={e => setFormEquip({...formEquip, codigo: e.target.value})} /></div>
            <div><Label>Descricao</Label><Input value={formEquip.descricao} onChange={e => setFormEquip({...formEquip, descricao: e.target.value})} /></div>
          </div>
          <DialogFooter><Button onClick={saveEquip} className="w-full">Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
