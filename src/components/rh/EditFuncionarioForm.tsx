import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Save, FileDown, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CARGOS_PADRAO } from "@/lib/cargosPadrao";
import { toast } from "@/hooks/use-toast";
import { useEmpresasObras } from "@/hooks/useEmpresasObras";
import { EmpresaSelect, ObraSelect } from "@/components/shared/EmpresaObraSelects";
import { BonificacoesPadraoEditor, type BonificacaoPadrao } from "@/components/rh/BonificacoesPadraoEditor";
import { getBonificacoesFromFuncionario, salvarFuncionarioComBonificacoes, stripBonificacoesFromObservacoes } from "@/lib/bonificacoesPadrao";
import { FuncionarioAvatar } from "@/components/rh/FuncionarioAvatar";
import { gerarFichaPreCadastroPdf, type FichaPreCadastroData } from "@/lib/gerarFichaPreCadastroPdf";

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
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const { empresas, obras, obrasPorEmpresa } = useEmpresasObras();

  useEffect(() => {
    if (!open || !funcionarioId) return;
    setLoading(true);
    supabase.from("funcionarios").select("*").eq("id", funcionarioId).single()
      .then(({ data }) => {
        if (data) {
          let depsList: any[] = [];
          try {
            const raw = (data as any).dependentes_json;
            if (Array.isArray(raw)) depsList = raw;
            else if (typeof raw === "string" && raw.trim()) depsList = JSON.parse(raw);
          } catch { depsList = []; }
          setForm({
            ...data,
            observacoes: stripBonificacoesFromObservacoes((data as any).observacoes),
            bonificacoes_padrao: getBonificacoesFromFuncionario(data as any),
            dependentes_lista: depsList,
          });
        }
        setLoading(false);
      });
  }, [open, funcionarioId]);

  const obrasDisponiveis = obrasPorEmpresa(form.empresa_id || "");

  const handleSave = async () => {
    setSaving(true);
    if (form.pis && !/^\d{11}$/.test(form.pis.replace(/\D/g, ""))) {
      toast({ title: "PIS Inválido", description: "O PIS deve conter exatamente 11 dígitos numéricos.", variant: "destructive" });
      setSaving(false);
      return;
    }
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
    updateData.observacoes = stripBonificacoesFromObservacoes(form.observacoes);
    updateData.bonificacoes_padrao = Array.isArray(form.bonificacoes_padrao) ? form.bonificacoes_padrao : [];
    updateData.foto_url = form.foto_url || null;
    const depsList = Array.isArray(form.dependentes_lista) ? form.dependentes_lista.filter((d: any) => d && (d.nome || d.cpf)) : [];
    updateData.dependentes_json = depsList;
    updateData.dependentes = depsList.length || Number(form.dependentes) || 0;

    const { error } = await salvarFuncionarioComBonificacoes(funcionarioId, updateData);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Funcionário atualizado com sucesso!" });
      onSaved();
      onOpenChange(false);
    }
    setSaving(false);
  };

  const buildFichaData = (): FichaPreCadastroData => {
    let dependentesLista: any[] = [];
    try {
      const raw = (form as any).dependentes_json;
      if (Array.isArray(raw)) dependentesLista = raw;
      else if (typeof raw === "string" && raw.trim()) dependentesLista = JSON.parse(raw);
    } catch { dependentesLista = []; }
    const obraSel = obrasDisponiveis.find((o: any) => o.id === form.obra_id);
    return {
      nome: form.nome || "",
      foto: form.foto_url || null,
      data_nascimento: form.data_nascimento,
      estado_civil: form.estado_civil,
      nacionalidade: form.nacionalidade,
      nome_mae: form.nome_mae,
      nome_pai: form.nome_pai,
      escolaridade: form.escolaridade,
      telefone: form.telefone,
      dependentes: Number(form.dependentes) || dependentesLista.length || 0,
      rne: form.rne,
      data_entrada_pais: form.data_entrada_pais,
      cpf: form.cpf,
      rg: form.rg,
      pis: form.pis,
      ctps: form.ctps,
      serie_ctps: form.serie_ctps,
      titulo_eleitor: form.titulo_eleitor,
      zona_eleitoral: form.zona_eleitoral,
      secao_eleitoral: form.secao_eleitoral,
      cnh: form.cnh,
      categoria_cnh: form.categoria_cnh,
      validade_cnh: form.validade_cnh,
      endereco: form.endereco,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      cep: form.cep,
      cargo: form.cargo,
      data_admissao: form.data_admissao,
      salario_base: Number(form.salario_base) || 0,
      salario_combinado: Number(form.salario_combinado) || 0,
      tipo_remuneracao: form.tipo_remuneracao,
      escala: form.escala,
      obra_nome: obraSel?.nome || "",
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      tipo_conta: form.tipo_conta,
      codigo_pix: form.codigo_pix,
      dependentes_lista: dependentesLista,
    };
  };

  const handleGerarPdf = async () => {
    if (!form.nome) {
      toast({ title: "Nome obrigatório", description: "Preencha o nome do funcionário.", variant: "destructive" });
      return;
    }
    setGerandoPdf(true);
    try {
      const fichaData = buildFichaData();
      const blob = (await gerarFichaPreCadastroPdf(fichaData, form.empresa_id || null, {
        download: true,
        returnBlob: true,
      })) as Blob;

      const dateTag = new Date().toISOString().slice(0, 10);
      const safeName = (form.nome || "funcionario").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
      const filePath = `funcionarios/${funcionarioId}/Doc Admissionais/Ficha_Pre_Cadastro_${safeName}_${dateTag}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("documentos")
        .upload(filePath, blob, { upsert: true, contentType: "application/pdf" });
      if (upErr) {
        toast({ title: "PDF gerado, mas falhou ao salvar na pasta", description: upErr.message, variant: "destructive" });
      } else {
        toast({ title: "Ficha gerada", description: "Salva em Documentos → Doc Admissionais." });
      }
    } catch (e: any) {
      toast({ title: "Erro ao gerar PDF", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setGerandoPdf(false);
    }
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
            {/* Foto + Empresa e Obra - sempre no topo */}
            <div className="flex flex-col sm:flex-row items-start gap-4 pb-4 border-b mb-4">
              <div className="flex flex-col items-center gap-2">
                <FuncionarioAvatar
                  nome={form.nome || "?"}
                  foto={form.foto_url || ""}
                  size="lg"
                  editable
                  onPhotoChange={(dataUrl) => setForm(prev => ({ ...prev, foto_url: dataUrl }))}
                />
                <span className="text-xs text-muted-foreground">Clique para alterar foto</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
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

            <div className="mt-4">
              <BonificacoesPadraoEditor
                value={(Array.isArray(form.bonificacoes_padrao) ? form.bonificacoes_padrao : []) as BonificacaoPadrao[]}
                onChange={(next) => setForm(prev => ({ ...prev, bonificacoes_padrao: next }))}
              />
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button variant="secondary" onClick={handleGerarPdf} disabled={gerandoPdf} className="gap-2">
                <FileDown className="h-4 w-4" /> {gerandoPdf ? "Gerando..." : "Gerar Ficha (PDF)"}
              </Button>
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
