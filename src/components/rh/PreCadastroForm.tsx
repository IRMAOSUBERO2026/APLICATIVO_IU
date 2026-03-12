import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Camera, Save, UserPlus } from "lucide-react";
import { Funcionario } from "./types";

interface PreCadastroFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (func: Funcionario) => void;
  nextId: number;
}

const emptyForm = {
  nome: "", foto: "", cnpj: "", empresa: "", obra: "", construtora: "", cidadeTrabalho: "",
  admissao: "", cargo: "", nascimento: "", telefone: "", rg: "", cpf: "", pis: "",
  codigoPix: "", salarioBase: 0, salarioCombinado: 0, clinica: "", aso: "", nr6: "",
  nr12: "", nr18: "", nr35: "", dataRescisao: "", status: "Pré-Cadastro", abandono: "", atestado: "",
  estadoCivil: "", nacionalidade: "Brasileiro(a)", endereco: "", bairro: "", cidade: "", uf: "",
  cep: "", ctps: "", serieCtps: "", tituloEleitor: "", zonaEleitoral: "", secaoEleitoral: "",
  cnh: "", categoriaCnh: "", validadeCnh: "", nomeMae: "", nomePai: "", escolaridade: "",
  banco: "", agencia: "", conta: "", tipoConta: "", dependentes: 0,
};

type FormStep = "pessoal" | "documentos" | "endereco" | "trabalho" | "bancario";

const steps: { key: FormStep; label: string }[] = [
  { key: "pessoal", label: "Dados Pessoais" },
  { key: "documentos", label: "Documentos" },
  { key: "endereco", label: "Endereço" },
  { key: "trabalho", label: "Dados de Trabalho" },
  { key: "bancario", label: "Dados Bancários" },
];

function FieldInput({ label, value, onChange, type = "text", required = false, placeholder = "" }: {
  label: string; value: string | number; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
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
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border bg-card py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export function PreCadastroForm({ open, onOpenChange, onSave, nextId }: PreCadastroFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [step, setStep] = useState<FormStep>("pessoal");
  const photoRef = useRef<HTMLInputElement>(null);

  const update = (field: string, value: string | number) => setForm(prev => ({ ...prev, [field]: value }));

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => update("foto", ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = () => {
    if (!form.nome || !form.cpf || !form.cargo) {
      toast({ title: "Campos obrigatórios", description: "Nome, CPF e Cargo são obrigatórios.", variant: "destructive" });
      return;
    }
    onSave({ ...form, id: nextId, salarioBase: Number(form.salarioBase), salarioCombinado: Number(form.salarioCombinado), dependentes: Number(form.dependentes) } as Funcionario);
    setForm(emptyForm);
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

        {/* Steps indicator */}
        <div className="flex gap-1 mb-4">
          {steps.map((s, i) => (
            <button
              key={s.key}
              onClick={() => setStep(s.key)}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
                step === s.key ? "bg-primary text-primary-foreground" :
                i < currentIdx ? "bg-success/10 text-success" :
                "bg-muted text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Foto */}
        {step === "pessoal" && (
          <div className="flex items-center gap-4 mb-4">
            <div className="relative group">
              {form.foto ? (
                <img src={form.foto} alt="Foto" className="h-20 w-20 rounded-full object-cover border-2 border-primary/20" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <button
                onClick={() => photoRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              >
                <Camera className="h-5 w-5 text-background" />
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>
            <div>
              <p className="text-sm font-medium">Foto de Identificação</p>
              <p className="text-xs text-muted-foreground">Clique para adicionar a foto do funcionário</p>
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
              <FieldInput label="Nacionalidade" value={form.nacionalidade} onChange={v => update("nacionalidade", v)} />
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
              <FieldInput label="Cargo" value={form.cargo} onChange={v => update("cargo", v)} required />
              <FieldInput label="Data de Admissão" value={form.admissao} onChange={v => update("admissao", v)} type="date" />
              <FieldInput label="CNPJ da Empresa" value={form.cnpj} onChange={v => update("cnpj", v)} placeholder="00.000.000/0000-00" />
              <FieldInput label="Empresa" value={form.empresa} onChange={v => update("empresa", v)} />
              <FieldInput label="Obra" value={form.obra} onChange={v => update("obra", v)} />
              <FieldInput label="Construtora" value={form.construtora} onChange={v => update("construtora", v)} />
              <FieldInput label="Cidade de Trabalho" value={form.cidadeTrabalho} onChange={v => update("cidadeTrabalho", v)} />
              <FieldInput label="Salário Base" value={form.salarioBase} onChange={v => update("salarioBase", v)} type="number" />
              <FieldInput label="Salário Combinado" value={form.salarioCombinado} onChange={v => update("salarioCombinado", v)} type="number" />
              <FieldInput label="Clínica" value={form.clinica} onChange={v => update("clinica", v)} />
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
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => setStep(steps[Math.max(0, currentIdx - 1)].key)}
            disabled={currentIdx === 0}
            className="rounded-lg border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            Anterior
          </button>
          <p className="text-xs text-muted-foreground">Etapa {currentIdx + 1} de {steps.length}</p>
          {currentIdx < steps.length - 1 ? (
            <button
              onClick={() => setStep(steps[currentIdx + 1].key)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-lg bg-success px-4 py-2 text-sm font-medium text-success-foreground hover:bg-success/90 transition-colors"
            >
              <Save className="h-4 w-4" />
              Salvar Cadastro
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
