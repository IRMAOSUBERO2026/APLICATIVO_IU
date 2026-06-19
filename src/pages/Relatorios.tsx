import { AppLayout } from "@/components/layout/AppLayout";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { FileSpreadsheet, FileText, Download, Users, Building2, HardHat, CreditCard, ShoppingCart, Warehouse, Calendar, Filter } from "lucide-react";
import * as XLSX from "xlsx";
import { gerarRelatorioFuncionariosObra } from "@/lib/gerarRelatorioFuncionariosObra";

interface Empresa { id: string; razao_social: string; nome_fantasia: string | null; }
interface Obra { id: string; nome: string; codigo: string; }

const RELATORIOS = [
  { id: "funcionarios_obra", label: "Funcionários Ativos por Obra", icon: HardHat, desc: "Planilha formatada agrupada por obra (somente ativos)" },
  { id: "funcionarios", label: "Lista de Funcionários", icon: Users, desc: "Nome, CPF, cargo, salário, obra, status" },
  { id: "folha", label: "Folha de Pagamento", icon: CreditCard, desc: "Resumo salarial por funcionário e mês" },
  { id: "compras", label: "Relatório de Compras", icon: ShoppingCart, desc: "NF-e, fornecedor, valores, status" },
  { id: "financeiro_pagar", label: "Contas a Pagar", icon: Warehouse, desc: "Vencimentos, valores, status de pagamento" },
  { id: "financeiro_receber", label: "Contas a Receber", icon: Warehouse, desc: "Recebimentos, clientes, status" },
  { id: "estoque", label: "Movimentações de Estoque", icon: FileSpreadsheet, desc: "Entradas, saídas e saldos" },
  { id: "contratos", label: "Contratos de Locação", icon: Building2, desc: "Locador, valor, vigência, status" },
  { id: "diario", label: "Diário de Obra", icon: HardHat, desc: "Registros diários por obra" },
];

export default function Relatorios() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [obras, setObras] = useState<Obra[]>([]);
  const [selectedRelatorio, setSelectedRelatorio] = useState("");
  const [filterEmpresa, setFilterEmpresa] = useState("");
  const [filterObra, setFilterObra] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("empresas").select("id, razao_social, nome_fantasia").eq("ativo", true),
      supabase.from("obras").select("id, nome, codigo"),
    ]).then(([eRes, oRes]) => {
      if (eRes.data) setEmpresas(eRes.data);
      if (oRes.data) setObras(oRes.data);
    });
  }, []);

  const downloadExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const gerarRelatorio = async (formato: "excel" | "csv") => {
    if (!selectedRelatorio) { toast({ title: "Selecione um relatório", variant: "destructive" }); return; }
    setLoading(true);

    try {
      let data: any[] = [];
      let filename = selectedRelatorio;

      switch (selectedRelatorio) {
        case "funcionarios": {
          let q = supabase.from("funcionarios").select("nome, cpf, cargo, salario_base, salario_combinado, status, data_admissao, telefone, email, empresa_id, obra_id");
          if (filterEmpresa) q = q.eq("empresa_id", filterEmpresa);
          if (filterObra) q = q.eq("obra_id", filterObra);
          const { data: d } = await q;
          data = (d || []).map(f => ({
            Nome: f.nome, CPF: f.cpf, Cargo: f.cargo,
            "Salário Base": f.salario_base, "Salário Combinado": f.salario_combinado,
            Status: f.status, Admissão: f.data_admissao, Telefone: f.telefone, Email: f.email,
          }));
          filename = "funcionarios";
          break;
        }
        case "folha": {
          let q = supabase.from("folhas_pagamento").select("*, funcionarios(nome, cpf, cargo)");
          if (filterEmpresa) q = q.eq("empresa_id", filterEmpresa);
          if (filterObra) q = q.eq("obra_id", filterObra);
          const { data: d } = await q;
          data = (d || []).map((f: any) => ({
            Funcionário: f.funcionarios?.nome, CPF: f.funcionarios?.cpf,
            Mês: f.mes, Ano: f.ano, "Salário Registro": f.salario_registro,
            "Salário Combinado": f.salario_combinado, "Total HE": f.total_he,
            "Total Bonificações": f.total_bonificacoes, "Total Descontos": f.total_descontos,
            "Salário Final": f.salario_final,
          }));
          filename = "folha_pagamento";
          break;
        }
        case "compras": {
          let q = supabase.from("compras").select("*, fornecedores(razao_social)");
          if (filterEmpresa) q = q.eq("empresa_id", filterEmpresa);
          if (filterObra) q = q.eq("obra_id", filterObra);
          if (dataInicio) q = q.gte("data_emissao", dataInicio);
          if (dataFim) q = q.lte("data_emissao", dataFim);
          const { data: d } = await q;
          data = (d || []).map((c: any) => ({
            Número: c.numero, "NF-e": c.nfe_numero, Fornecedor: c.fornecedores?.razao_social,
            "Data Emissão": c.data_emissao, Total: c.total, Status: c.status,
            "Forma Pagamento": c.forma_pagamento,
          }));
          filename = "compras";
          break;
        }
        case "financeiro_pagar": {
          let q = supabase.from("contas_pagar").select("*, fornecedores(razao_social)");
          if (filterEmpresa) q = q.eq("empresa_id", filterEmpresa);
          if (dataInicio) q = q.gte("data_vencimento", dataInicio);
          if (dataFim) q = q.lte("data_vencimento", dataFim);
          const { data: d } = await q;
          data = (d || []).map((c: any) => ({
            Descrição: c.descricao, Fornecedor: c.fornecedores?.razao_social,
            Valor: c.valor, Vencimento: c.data_vencimento, Status: c.status,
            "Valor Pago": c.valor_pago, "Data Pagamento": c.data_pagamento,
            Categoria: c.categoria,
          }));
          filename = "contas_pagar";
          break;
        }
        case "financeiro_receber": {
          let q = supabase.from("contas_receber").select("*");
          if (filterEmpresa) q = q.eq("empresa_id", filterEmpresa);
          if (dataInicio) q = q.gte("data_vencimento", dataInicio);
          if (dataFim) q = q.lte("data_vencimento", dataFim);
          const { data: d } = await q;
          data = (d || []).map((c: any) => ({
            Descrição: c.descricao, Cliente: c.cliente,
            Valor: c.valor, Vencimento: c.data_vencimento, Status: c.status,
            "Valor Recebido": c.valor_recebido, Categoria: c.categoria,
          }));
          filename = "contas_receber";
          break;
        }
        case "estoque": {
          const { data: d } = await supabase.from("movimentacoes_estoque").select("*, produtos(descricao, unidade)");
          data = (d || []).map((m: any) => ({
            Produto: m.produtos?.descricao, Unidade: m.produtos?.unidade,
            Tipo: m.tipo, Quantidade: m.quantidade, "Valor Unit.": m.valor_unitario,
            Data: m.data_movimentacao, Documento: m.documento,
          }));
          filename = "movimentacoes_estoque";
          break;
        }
        case "contratos": {
          let q = supabase.from("contratos_locacao").select("*");
          if (filterEmpresa) q = q.eq("empresa_id", filterEmpresa);
          const { data: d } = await q;
          data = (d || []).map((c: any) => ({
            Descrição: c.descricao, Tipo: c.tipo, Locador: c.locador,
            "Valor Mensal": c.valor_mensal, "Dia Vencimento": c.dia_vencimento,
            Início: c.data_inicio, Fim: c.data_fim, Status: c.status,
            Endereço: c.endereco, Cidade: c.cidade, UF: c.uf,
          }));
          filename = "contratos_locacao";
          break;
        }
        case "diario": {
          let q = supabase.from("diarios_obra").select("*, obras(nome, codigo)");
          if (filterObra) q = q.eq("obra_id", filterObra);
          if (dataInicio) q = q.gte("data", dataInicio);
          if (dataFim) q = q.lte("data", dataFim);
          const { data: d } = await q;
          data = (d || []).map((e: any) => ({
            Obra: e.obras?.nome, Código: e.obras?.codigo,
            Data: e.data, Clima: e.clima, "Equipe Presente": e.mao_de_obra_presente,
            Atividades: e.atividades_executadas, Ocorrências: e.ocorrencias,
            Responsável: e.responsavel,
          }));
          filename = "diario_obra";
          break;
        }
      }

      if (data.length === 0) {
        toast({ title: "Nenhum dado encontrado", description: "Tente ajustar os filtros.", variant: "destructive" });
        setLoading(false);
        return;
      }

      if (formato === "excel") {
        downloadExcel(data, filename);
      } else {
        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `${filename}.csv`; a.click();
        URL.revokeObjectURL(url);
      }

      toast({ title: "Relatório gerado!", description: `${data.length} registros exportados.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground">Gere relatórios e planilhas de qualquer módulo do sistema</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Report selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Tipo de Relatório</h3>
              <div className="space-y-1.5">
                {RELATORIOS.map(r => (
                  <button key={r.id} onClick={() => setSelectedRelatorio(r.id)}
                    className={`w-full flex items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                      selectedRelatorio === r.id ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
                    }`}>
                    <r.icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${selectedRelatorio === r.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Filters + Actions */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border bg-card p-5 space-y-5">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Filter className="h-4 w-4" /> Filtros</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Empresa</label>
                  <select value={filterEmpresa} onChange={e => setFilterEmpresa(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm mt-1">
                    <option value="">Todas</option>
                    {empresas.map(e => <option key={e.id} value={e.id}>{e.nome_fantasia || e.razao_social}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Obra</label>
                  <select value={filterObra} onChange={e => setFilterObra(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm mt-1">
                    <option value="">Todas</option>
                    {obras.map(o => <option key={o.id} value={o.id}>{o.codigo} - {o.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data Início</label>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Data Fim</label>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm mt-1" />
                </div>
              </div>
            </div>

            {/* Preview + Download */}
            <div className="rounded-xl border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Download className="h-4 w-4" /> Exportar</h3>

              {!selectedRelatorio ? (
                <div className="py-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Selecione um tipo de relatório para exportar</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">{RELATORIOS.find(r => r.id === selectedRelatorio)?.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{RELATORIOS.find(r => r.id === selectedRelatorio)?.desc}</p>
                    {filterEmpresa && <p className="text-xs text-primary mt-1">Filtrado por empresa</p>}
                    {filterObra && <p className="text-xs text-primary mt-1">Filtrado por obra</p>}
                    {dataInicio && <p className="text-xs text-primary mt-1">A partir de {dataInicio}</p>}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => gerarRelatorio("excel")} disabled={loading}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-semibold text-success-foreground hover:bg-success/90 transition-colors disabled:opacity-50">
                      <FileSpreadsheet className="h-4 w-4" />
                      {loading ? "Gerando..." : "Baixar Excel (.xlsx)"}
                    </button>
                    <button onClick={() => gerarRelatorio("csv")} disabled={loading}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50">
                      <FileText className="h-4 w-4" />
                      {loading ? "Gerando..." : "Baixar CSV"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
