import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { EmpresaOption, ObraOption } from "@/hooks/useEmpresasObras";

interface EmpresaSelectProps {
  value: string;
  onChange: (v: string) => void;
  empresas: EmpresaOption[];
  required?: boolean;
  label?: string;
  disabled?: boolean;
}

export function EmpresaSelect({ value, onChange, empresas, required, label = "Empresa (CNPJ)", disabled }: EmpresaSelectProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a empresa" />
        </SelectTrigger>
        <SelectContent>
          {empresas.map(e => (
            <SelectItem key={e.id} value={e.id}>
              {e.nome_fantasia || e.razao_social} — {e.cnpj}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

interface ObraSelectProps {
  value: string;
  onChange: (v: string) => void;
  obras: ObraOption[];
  required?: boolean;
  label?: string;
  disabled?: boolean;
  allowEmpty?: boolean;
}

export function ObraSelect({ value, onChange, obras, required, label = "Obra", disabled, allowEmpty = true }: ObraSelectProps) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione a obra" />
        </SelectTrigger>
        <SelectContent>
          {allowEmpty && <SelectItem value="__none__">Sem obra vinculada</SelectItem>}
          {obras.map(o => (
            <SelectItem key={o.id} value={o.id}>
              {o.codigo} — {o.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
