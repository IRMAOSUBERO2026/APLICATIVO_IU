import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useEmpresasObras } from "@/hooks/useEmpresasObras";
import { EmpresaSelect, ObraSelect } from "@/components/shared/EmpresaObraSelects";
import { BonificacoesPadraoEditor, type BonificacaoPadrao } from "@/components/rh/BonificacoesPadraoEditor";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarioId: string;
  onSaved: () => void;
}

const FIELDS: { key: string; label: string; type?: string; options?: string[] }[] = [
  { key: "nome", label: "Nome Completo" },
  { key: "cpf", label: "CPF" },
  { key: "rg", label: "RG" },
  { key: "cargo", label: "Cargo" },
  { key: "salario_base", label: "Salário Base", type: "number" },
  { key: "salario_combinado", label: "Salário Combinado", type: "number" },
  { key: "tipo_remuneracao", label: "Tipo de Remuneração", options: ["mensal", "quinzenal", "semanal", "producao"] },
  { key: "escala", label: "Escala", options: ["5x2", "6x1"] },
  { key: "data_admissao", label: "Data de Admissão", type: "date" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "pis", label: "PIS/PASEP" },
  { key: "ctps", label: "CTPS" },
  { key: "serie_ctps", label: "Série CTPS" },
  { key: "nacionalidade", label: "Nacionalidade" },
  { key: "rne", label: "RNE" },
  { key: "data_entrada_pais", label: "Data Entrada no País", type: "date" },
  { key: "estado_civil", label: "Estado Civil", options: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"] },
  { key: "data_nascimento", label: "Data de Nascimento", type: "date" },
  { key: "nome_mae", label: "Nome da Mãe" },
  { key: "nome_pai", label: "Nome do Pai" },
  { key: "escolaridade", label: "Escolaridade", options: ["Ensino Fundamental Incompleto", "Ensino Fundamental", "Ensino Médio Incompleto", "Ensino Médio", "Ensino Superior Incompleto", "Ensino Superior", "Pós-Graduação"] },
  { key: "endereco", label: "Endereço" },
  { key: "bairro", label: "Bairro" },
  { key: "cidade", label: "Cidade" },
  { key: "uf", label: "UF" },
  { key: "cep", label: "CEP" },
  { key: "banco", label: "Banco" },
  { key: "agencia", label: "Agência" },
  { key: "conta", label: "Conta" },
  { key: "tipo_conta", label: "Tipo de Conta", options: ["Corrente", "Poupança", "Salário"] },
  { key: "codigo_pix", label: "Código PIX" },
  { key: "cnh", label: "CNH" },
  { key: "categoria_cnh", label: "Categoria CNH", options: ["A", "B", "AB", "C", "D", "E"] },
  { key: "validade_cnh", label: "Validade CNH", type: "date" },
  { key: "titulo_eleitor", label: "Título de Eleitor" },
  { key: "zona_eleitoral", label: "Zona Eleitoral" },
  { key: "secao_eleitoral", label: "Seção Eleitoral" },
  { key: "clinica_aso", label: "Clínica ASO" },
  { key: "numero_registro", label: "Nº Registro" },
];

export function EditFuncionarioForm({ open, onOpenChange, funcionarioId, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { empresas, obras, obrasPorEmpresa } = useEmpresasObras();

  useEffect(() => {
    if (!open || !funcionarioId) return;
    setLoading(true);
    supabase.from("funcionarios").select("*").eq("id", funcionarioId).single()
      .then(({ data }) => {
        if (data) setForm(data);
        setLoading(false);
      });
  }, [open, funcionarioId]);

  const obrasDisponiveis = obrasPorEmpresa(form.empresa_id || "");

  const handleSave = async () => {
    setSaving(true);
    const updateData: Record<string, any> = {};
    FIELDS.forEach(f => {
      const val = form[f.key];
      if (f.type === "number") {
        updateData[f.key] = val ? Number(val) : 0;
      } else if (f.type === "date") {
        updateData[f.key] = val || null;
      } else {
        updateData[f.key] = val || null;
      }
    });
    updateData.empresa_id = form.empresa_id;
    updateData.obra_id = form.obra_id && form.obra_id !== "__none__" ? form.obra_id : null;

    const { error } = await supabase.from("funcionarios").update(updateData).eq("id", funcionarioId);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Funcionário atualizado com sucesso!" });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Editar Funcionário
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : (
          <>
            {/* Empresa e Obra - sempre no topo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4 border-b mb-4">
              <EmpresaSelect
                value={form.empresa_id || ""}
                onChange={v => setForm(prev => ({ ...prev, empresa_id: v, obra_id: "" }))}
                empresas={empresas}
                required
              />
              <ObraSelect
                value={form.obra_id || ""}
                onChange={v => setForm(prev => ({ ...prev, obra_id: v }))}
                obras={obrasDisponiveis}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FIELDS.map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  {f.options ? (
                    <select
                      value={form[f.key] ?? ""}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Selecione...</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input
                      type={f.type || "text"}
                      value={form[f.key] ?? ""}
                      onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
