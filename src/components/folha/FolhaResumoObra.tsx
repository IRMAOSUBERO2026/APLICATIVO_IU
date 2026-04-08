import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { FolhaOutput } from "@/lib/motorFolha";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FuncResumo {
  nome: string;
  cargo: string;
  result: FolhaOutput;
}

interface Props {
  funcionarios: FuncResumo[];
  obra: string;
  mes: string;
  ano: number;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FolhaResumoObra({ funcionarios, obra, mes, ano }: Props) {
  const totalGeral = funcionarios.reduce((s, f) => s + f.result.salario_final, 0);
  const totalCusto = funcionarios.reduce((s, f) => s + f.result.custo_total_empresa, 0);

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text(`Folha Salarial — ${obra}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Referência: ${mes}/${ano}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [[
        "Funcionário", "Cargo", "Sal. Combinado", "Total HE",
        "Bonificações", "Descontos", "Salário Final", "FGTS", "Custo Emp.",
      ]],
      body: funcionarios.map((f) => [
        f.nome,
        f.cargo,
        fmt(f.result.salario_final - f.result.total_HE - f.result.valor_atestados - f.result.total_bonificacoes + f.result.total_descontos),
        fmt(f.result.total_HE),
        fmt(f.result.total_bonificacoes),
        fmt(f.result.total_descontos),
        fmt(f.result.salario_final),
        fmt(f.result.fgts),
        fmt(f.result.custo_total_empresa),
      ]),
      foot: [["", "", "", "", "", "", "TOTAL", fmt(totalGeral), "", fmt(totalCusto)]],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 50, 65] },
      footStyles: { fillColor: [41, 50, 65], textColor: 255, fontStyle: "bold" },
    });

    doc.save(`folha-${obra.replace(/\s/g, "-")}-${mes}-${ano}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">📊 Resumo — {obra}</CardTitle>
          <p className="text-xs text-muted-foreground">{mes}/{ano} • {funcionarios.length} funcionários</p>
        </div>
        <Button size="sm" variant="outline" onClick={exportPDF} className="gap-2">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-right">Total HE</TableHead>
                <TableHead className="text-right">Bonificações</TableHead>
                <TableHead className="text-right">Descontos</TableHead>
                <TableHead className="text-right font-bold">Líquido</TableHead>
                <TableHead className="text-right">FGTS</TableHead>
                <TableHead className="text-right font-bold">Custo Emp.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((f, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{f.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{f.cargo}</TableCell>
                  <TableCell className="text-right">{fmt(f.result.total_HE)}</TableCell>
                  <TableCell className="text-right">{fmt(f.result.total_bonificacoes)}</TableCell>
                  <TableCell className="text-right text-destructive">{fmt(f.result.total_descontos)}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(f.result.salario_final)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmt(f.result.fgts)}</TableCell>
                  <TableCell className="text-right font-bold">{fmt(f.result.custo_total_empresa)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end mt-4 pt-3 border-t">
          <p className="text-lg font-bold">Total Geral: {fmt(totalGeral)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
