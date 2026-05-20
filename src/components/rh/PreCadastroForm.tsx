import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Camera, Save, UserPlus, Plus, Trash2 } from "lucide-react";
import { useEmpresasObras } from "@/hooks/useEmpresasObras";
import { EmpresaSelect, ObraSelect } from "@/components/shared/EmpresaObraSelects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BonificacoesPadraoEditor, type BonificacaoPadrao } from "@/components/rh/BonificacoesPadraoEditor";
import { inserirFuncionarioComBonificacoes } from "@/lib/bonificacoesPadrao";

interface PreCadastroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (func: any) => void;
  nextId: number;
}

interface Dependente {
  nome: string;
  cpf: string;
  dataNascimento: string;
}

const emptyForm = {
  nome: "", foto: "", empresa_id: "", obra_id: "",
  admissao: "", cargo: "", nascimento: "", telefone: "", rg: "", cpf: "", pis: "",
  codigoPix: "", salarioBase: 0, salarioCombinado: 0, clinica: "", aso: "", nr6: "",
  nr12: "", nr18: "", nr35: "", dataRescisao: "", status: "ativo", abandono: "", atestado: "",
  estadoCivil: "", nacionalidade: "Brasileiro(a)", endereco: "", bairro: "", cidade: "", uf: "",
  cep: "", ctps: "", serieCtps: "", tituloEleitor: "", zonaEleitoral: "", secaoEleitoral: "",
  cnh: "", categoriaCnh: "", validadeCnh: "", nomeMae: "", nomePai: "", escolaridade: "",
  banco: "", agencia: "", conta: "", tipoConta: "", dependentes: 0,
  rne: "", dataEntradaPais: "", tipo_remuneracao: "mensal", escala: "5x2",
};

type FormStep = "pessoal" | "documentos" | "endereco" | "trabalho" | "bancario" | "dependentes";

const steps: { key: FormStep; label: string }[] = [
  { key: "pessoal", label: "Dados Pessoais" },
  { key: "documentos", label: "Documentos" },
  { key: "endereco", label: "Endereço" },
  { key: "trabalho", label: "Trabalho" },
  { key: "bancario", label: "Bancário" },
  { key: "dependentes", label: "Dependentes" },
];

function FieldInput({ label, value, onChange, type = "text", required = false, placeholder = "" }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, required = false }: {
  label: string; value: string; onChange: (v: string) => void; options: string[]; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function PreCadastroForm({ open, onOpenChange, onSave, nextId }: PreCadastroFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState<FormStep>("pessoal");
  const [dependentesList, setDependentesList] = useState<Dependente[]>([]);
  const [bonificacoesPadrao, setBonificacoesPadrao] = useState<BonificacaoPadrao[]>([]);
  const photoRef = useRef<HTMLInputElement>(null);
  const { empresas, obras, obrasPorEmpresa } = useEmpresasObras();

  const update = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

  const isEstrangeiro = form.nacionalidade !== "Brasileiro(a)" && form.nacionalidade !== "Brasileiro" && form.nacionalidade !== "" && form.nacionalidade !== "Brasileira";
  const needsDependentes = form.estadoCivil === "Casado(a)" || form.estadoCivil === "União Estável" || Number(form.dependentes) > 0;

  const obrasDisponiveis = obrasPorEmpresa(form.empresa_id);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => update("foto", ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const addDependente = () => setDependentesList(prev => [...prev, { nome: "", cpf: "", dataNascimento: "" }]);
  const removeDependente = (idx: number) => setDependentesList(prev => prev.filter((_, i) => i !== idx));
  const updateDependente = (idx: number, field: keyof Dependente, value: string) => {
    setDependentesList(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    if (!form.nome || !form.cpf || !form.cargo) {
      toast({ title: "Campos obrigatórios", description: "Nome, CPF e Cargo são obrigatórios.", variant: "destructive" });
      return;
    }
    if (form.pis && !/^\d{11}$/.test(form.pis.replace(/\D/g, ""))) {
      toast({ title: "PIS Inválido", description: "O PIS deve conter exatamente 11 dígitos numéricos.", variant: "destructive" });
      return;
    }
    if (!form.empresa_id) {
      toast({ title: "Campos obrigatórios", description: "Selecione a empresa (CNPJ).", variant: "destructive" });
      setStep("trabalho");
      return;
    }
    if (isEstrangeiro && !form.rne) {
      toast({ title: "Campo obrigatório", description: "RNE é obrigatório para estrangeiros.", variant: "destructive" });
      setStep("documentos");
      return;
    }

    const { error } = await inserirFuncionarioComBonificacoes({
      nome: form.nome,
      cpf: form.cpf,
      cargo: form.cargo,
      empresa_id: form.empresa_id,
      obra_id: form.obra_id && form.obra_id !== "__none__" ? form.obra_id : null,
      status: "ativo",
      data_admissao: form.admissao || new Date().toISOString().slice(0, 10),
      salario_base: Number(form.salarioBase) || 0,
      salario_combinado: Number(form.salarioCombinado) || 0,
      tipo_remuneracao: form.tipo_remuneracao,
      escala: form.escala,
      telefone: form.telefone,
      rg: form.rg,
      pis: form.pis,
      codigo_pix: form.codigoPix,
      banco: form.banco,
      agencia: form.agencia,
      conta: form.conta,
      tipo_conta: form.tipoConta,
      estado_civil: form.estadoCivil,
      nacionalidade: form.nacionalidade,
      endereco: form.endereco,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
      cep: form.cep,
      ctps: form.ctps,
      serie_ctps: form.serieCtps,
      titulo_eleitor: form.tituloEleitor,
      zona_eleitoral: form.zonaEleitoral,
      secao_eleitoral: form.secaoEleitoral,
      cnh: form.cnh,
      categoria_cnh: form.categoriaCnh,
      validade_cnh: form.validadeCnh || null,
      nome_mae: form.nomeMae,
      nome_pai: form.nomePai,
      escolaridade: form.escolaridade,
      data_nascimento: form.nascimento || null,
      dependentes: Number(form.dependentes) || 0,
      rne: form.rne || null,
      data_entrada_pais: form.dataEntradaPais || null,
      dependentes_json: dependentesList.length > 0 ? JSON.stringify(dependentesList) : "[]",
      bonificacoes_padrao: bonificacoesPadrao as any,
    });

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }

    onSave({});
    setForm(emptyForm);
    setDependentesList([]);
    setBonificacoesPadrao([]);
    setStep("pessoal");
    onOpenChange(false);
    toast({ title: "Pré-cadastro salvo", description: `${form.nome} foi cadastrado com sucesso.` });
  };

  const currentIdx = steps.findIndex(s => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Pré-Cadastro de Funcionário
          </DialogTitle>
        </DialogHeader>

        {/* Steps */}
        <div className="flex gap-1 mb-4">
          {steps.map((s, i) => (
            <button key={s.key} onClick={() => setStep(s.key)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                step === s.key ? "bg-primary text-primary-foreground" :
                i < currentIdx ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              }`}>{s.label}</button>
          ))}
        </div>

        {/* Photo */}
        {step === "pessoal" && (
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              {form.foto ? (
                <img src={form.foto} alt="Foto" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center"><Camera className="h-8 w-8 text-muted-foreground" /></div>
              )}
              <button onClick={() => photoRef.current?.click()} className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-5 w-5 text-background" />
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>
            <div>
              <p className="text-sm font-medium">Foto de Identificação</p>
              <p className="text-xs text-muted-foreground">Clique para adicionar</p>
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {step === "pessoal" && (
            <>
              <FieldInput label="Nome Completo" value={form.nome} onChange={v => update("nome", v)} required />
              <FieldInput label="Data de Nascimento" value={form.nascimento} onChange={v => update("nascimento", v)} type="date" required />
              <FieldSelect label="Estado Civil" value={form.estadoCivil} onChange={v => update("estadoCivil", v)} options={["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "União Estável"]} />
              <FieldSelect label="Nacionalidade" value={form.nacionalidade} onChange={v => update("nacionalidade", v)} options={["Brasileiro(a)", "Estrangeiro(a)"]} required />
              {isEstrangeiro && (
                <>
                  <FieldInput label="RNE (Registro Nacional de Estrangeiro)" value={form.rne} onChange={v => update("rne", v)} required placeholder="Nº do RNE" />
                  <FieldInput label="Data de Entrada no País" value={form.dataEntradaPais} onChange={v => update("dataEntradaPais", v)} type="date" required />
                </>
              )}
              <FieldInput label="Nome da Mãe" value={form.nomeMae} onChange={v => update("nomeMae", v)} required />
              <FieldInput label="Nome do Pai" value={form.nomePai} onChange={v => update("nomePai", v)} />
              <FieldInput label="Telefone" value={form.telefone} onChange={v => update("telefone", v)} placeholder="(00) 00000-0000" required />
              <FieldSelect label="Escolaridade" value={form.escolaridade} onChange={v => update("escolaridade", v)} options={["Ensino Fundamental Incompleto", "Ensino Fundamental", "Ensino Médio Incompleto", "Ensino Médio", "Ensino Superior Incompleto", "Ensino Superior", "Pós-Graduação"]} />
              <FieldInput label="Dependentes" value={form.dependentes} onChange={v => update("dependentes", v)} type="number" />
            </>
          )}
          {step === "documentos" && (
            <>
              <FieldInput label="CPF" value={form.cpf} onChange={v => update("cpf", v)} placeholder="000.000.000-00" required />
              <FieldInput label="RG" value={form.rg} onChange={v => update("rg", v)} required />
              <FieldInput label="PIS/PASEP" value={form.pis} onChange={v => update("pis", v)} required />
              <FieldInput label="CTPS" value={form.ctps} onChange={v => update("ctps", v)} required />
              <FieldInput label="Série CTPS" value={form.serieCtps} onChange={v => update("serieCtps", v)} />
              <FieldInput label="Título de Eleitor" value={form.tituloEleitor} onChange={v => update("tituloEleitor", v)} />
              <FieldInput label="Zona Eleitoral" value={form.zonaEleitoral} onChange={v => update("zonaEleitoral", v)} />
              <FieldInput label="Seção Eleitoral" value={form.secaoEleitoral} onChange={v => update("secaoEleitoral", v)} />
              <FieldInput label="CNH" value={form.cnh} onChange={v => update("cnh", v)} />
              <FieldSelect label="Categoria CNH" value={form.categoriaCnh} onChange={v => update("categoriaCnh", v)} options={["A", "B", "AB", "C", "D", "E"]} />
              <FieldInput label="Validade CNH" value={form.validadeCnh} onChange={v => update("validadeCnh", v)} type="date" />
              {isEstrangeiro && (
                <>
                  <FieldInput label="RNE" value={form.rne} onChange={v => update("rne", v)} required />
                  <FieldInput label="Data de Entrada no País" value={form.dataEntradaPais} onChange={v => update("dataEntradaPais", v)} type="date" required />
                </>
              )}
            </>
          )}
          {step === "endereco" && (
            <>
              <div className="sm:col-span-2 lg:col-span-3">
                <FieldInput label="Endereço" value={form.endereco} onChange={v => update("endereco", v)} placeholder="Rua, número, complemento" required />
              </div>
              <FieldInput label="Bairro" value={form.bairro} onChange={v => update("bairro", v)} required />
              <FieldInput label="Cidade" value={form.cidade} onChange={v => update("cidade", v)} required />
              <FieldSelect label="UF" value={form.uf} onChange={v => update("uf", v)} options={["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]} required />
              <FieldInput label="CEP" value={form.cep} onChange={v => update("cep", v)} placeholder="00000-000" required />
            </>
          )}
          {step === "trabalho" && (
            <>
              <EmpresaSelect
                value={form.empresa_id}
                onChange={v => {
                  update("empresa_id", v);
                  update("obra_id", "");
                }}
                empresas={empresas}
                required
              />
              <ObraSelect
                value={form.obra_id}
                onChange={v => update("obra_id", v)}
                obras={obrasDisponiveis}
                label="Obra (vinculada à empresa)"
              />
              <FieldInput label="Cargo" value={form.cargo} onChange={v => update("cargo", v)} required />
              <FieldInput label="Data de Admissão" value={form.admissao} onChange={v => update("admissao", v)} type="date" />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tipo de Remuneração</label>
                <Select value={form.tipo_remuneracao} onValueChange={v => update("tipo_remuneracao", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="producao">Produção</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Escala</label>
                <Select value={form.escala} onValueChange={v => update("escala", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5x2">5x2 (Seg-Sex)</SelectItem>
                    <SelectItem value="6x1">6x1 (Seg-Sáb)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FieldInput label="Salário Base (Registro)" value={form.salarioBase} onChange={v => update("salarioBase", v)} type="number" />
              <FieldInput label="Salário Combinado" value={form.salarioCombinado} onChange={v => update("salarioCombinado", v)} type="number" />
              <FieldInput label="Clínica ASO" value={form.clinica} onChange={v => update("clinica", v)} />
              <div className="sm:col-span-2 lg:col-span-3">
                <BonificacoesPadraoEditor value={bonificacoesPadrao} onChange={setBonificacoesPadrao} />
              </div>
            </>
          )}
          {step === "bancario" && (
            <>
              <FieldInput label="Banco" value={form.banco} onChange={v => update("banco", v)} />
              <FieldInput label="Agência" value={form.agencia} onChange={v => update("agencia", v)} />
              <FieldInput label="Conta" value={form.conta} onChange={v => update("conta", v)} />
              <FieldSelect label="Tipo de Conta" value={form.tipoConta} onChange={v => update("tipoConta", v)} options={["Corrente", "Poupança", "Salário"]} />
              <FieldInput label="Código PIX" value={form.codigoPix} onChange={v => update("codigoPix", v)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </>
          )}
          {step === "dependentes" && (
            <div className="sm:col-span-2 lg:col-span-3 space-y-4">
              {needsDependentes && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs text-warning font-medium">⚠ Estado civil ou dependentes indicados — preencha os dados dos dependentes abaixo.</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Dependentes ({dependentesList.length})</h4>
                <button onClick={addDependente} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  <Plus className="h-3 w-3" /> Adicionar
                </button>
              </div>
              {dependentesList.map((dep, idx) => (
                <div key={idx} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Dependente {idx + 1}</span>
                    <button onClick={() => removeDependente(idx)} className="p-1 text-destructive hover:text-destructive/80"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <FieldInput label="Nome Completo" value={dep.nome} onChange={v => updateDependente(idx, "nome", v)} required />
                    <FieldInput label="CPF" value={dep.cpf} onChange={v => updateDependente(idx, "cpf", v)} placeholder="000.000.000-00" required />
                    <FieldInput label="Data de Nascimento" value={dep.dataNascimento} onChange={v => updateDependente(idx, "dataNascimento", v)} type="date" required />
                  </div>
                </div>
              ))}
              {dependentesList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dependente cadastrado. Clique em "Adicionar" para incluir.</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <button onClick={() => setStep(steps[Math.max(0, currentIdx - 1)].key)} disabled={currentIdx === 0}
            className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">Anterior</button>
          <p className="text-xs text-muted-foreground">Etapa {currentIdx + 1} de {steps.length}</p>
          {currentIdx < steps.length - 1 ? (
            <button onClick={() => setStep(steps[currentIdx + 1].key)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Próximo</button>
          ) : (
            <button onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors">
              <Save className="h-4 w-4" /> Salvar Cadastro
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
