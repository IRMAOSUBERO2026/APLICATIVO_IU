import ExcelJS from "exceljs";
import { supabase } from "@/integrations/supabase/client";

interface Func {
  nome: string;
  cpf: string | null;
  cargo: string | null;
  numero_registro?: string | null;
  salario_base: number | null;
  salario_combinado: number | null;
  data_admissao: string | null;
  telefone: string | null;
  status: string | null;
  obra_id: string | null;
  empresa_id: string | null;
}

const VERDE = "FF4B5320"; // verde militar
const VERDE_CLARO = "FFEDF0E3";

function fmtData(d: string | null) {
  if (!d) return "—";
  const [y, m, dia] = d.split("T")[0].split("-");
  return `${dia}/${m}/${y}`;
}

function fmtCpf(c: string | null) {
  if (!c) return "—";
  const n = c.replace(/\D/g, "").padStart(11, "0");
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}`;
}

export async function gerarRelatorioFuncionariosObra(opts?: {
  empresaId?: string;
  obraId?: string;
}) {
  // Buscar dados
  let q = supabase
    .from("funcionarios")
    .select(
      "nome, cpf, cargo, numero_registro, salario_base, salario_combinado, data_admissao, telefone, status, obra_id, empresa_id"
    )
    .eq("status", "ativo")
    .order("nome");
  if (opts?.empresaId) q = q.eq("empresa_id", opts.empresaId);
  if (opts?.obraId) q = q.eq("obra_id", opts.obraId);

  const [{ data: funcs }, { data: obras }, { data: empresas }] = await Promise.all([
    q,
    supabase.from("obras").select("id, nome, codigo, empresa_id"),
    supabase.from("empresas").select("id, razao_social, nome_fantasia"),
  ]);

  const funcionarios = (funcs || []) as Func[];
  const obraMap = new Map(
    (obras || []).map((o: any) => [o.id, `${o.codigo} — ${o.nome}`])
  );
  const obraEmpMap = new Map((obras || []).map((o: any) => [o.id, o.empresa_id]));
  const empMap = new Map(
    (empresas || []).map((e: any) => [e.id, e.nome_fantasia || e.razao_social])
  );

  // Agrupar por obra
  const grupos = new Map<string, Func[]>();
  for (const f of funcionarios) {
    const key = f.obra_id || "sem_obra";
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key)!.push(f);
  }

  const ordenadas = [...grupos.keys()].sort((a, b) => {
    const la = a === "sem_obra" ? "zzz" : obraMap.get(a) || "zzz";
    const lb = b === "sem_obra" ? "zzz" : obraMap.get(b) || "zzz";
    return la.localeCompare(lb);
  });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Irmãos Ubero Engenharia";
  const ws = wb.addWorksheet("Funcionários Ativos", {
    views: [{ state: "frozen", ySplit: 0 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  const cols = [
    { header: "#", width: 5 },
    { header: "Registro", width: 12 },
    { header: "Nome", width: 38 },
    { header: "CPF", width: 17 },
    { header: "Cargo", width: 24 },
    { header: "Admissão", width: 13 },
    { header: "Telefone", width: 16 },
    { header: "Salário Base", width: 15 },
    { header: "Salário Combinado", width: 18 },
  ];
  ws.columns = cols.map((c) => ({ width: c.width }));
  const NCOL = cols.length;

  // Título
  const tituloRow = ws.addRow(["RELATÓRIO DE FUNCIONÁRIOS ATIVOS POR OBRA"]);
  ws.mergeCells(tituloRow.number, 1, tituloRow.number, NCOL);
  tituloRow.height = 26;
  const tc = tituloRow.getCell(1);
  tc.font = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  tc.alignment = { vertical: "middle", horizontal: "center" };
  tc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };

  const subRow = ws.addRow([
    `Gerado em ${new Date().toLocaleDateString("pt-BR")} — Total de ativos: ${funcionarios.length}`,
  ]);
  ws.mergeCells(subRow.number, 1, subRow.number, NCOL);
  subRow.getCell(1).font = { italic: true, size: 10, color: { argb: "FF555555" } };
  subRow.getCell(1).alignment = { horizontal: "center" };
  ws.addRow([]);

  for (const obraKey of ordenadas) {
    const lista = grupos.get(obraKey)!.sort((a, b) => a.nome.localeCompare(b.nome));
    const obraLabel = obraKey === "sem_obra" ? "SEM OBRA DEFINIDA" : obraMap.get(obraKey) || "Obra desconhecida";
    const empId = obraEmpMap.get(obraKey) || lista[0]?.empresa_id;
    const empNome = empId ? empMap.get(empId) || "" : "";

    // Cabeçalho da obra
    const obraRow = ws.addRow([`${obraLabel}${empNome ? `  •  ${empNome}` : ""}  (${lista.length})`]);
    ws.mergeCells(obraRow.number, 1, obraRow.number, NCOL);
    obraRow.height = 20;
    const oc = obraRow.getCell(1);
    oc.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    oc.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
    oc.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B7340" } };

    // Cabeçalho de colunas
    const headerRow = ws.addRow(cols.map((c) => c.header));
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE } };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = {
        top: { style: "thin", color: { argb: "FFCCCCCC" } },
        bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
        left: { style: "thin", color: { argb: "FFCCCCCC" } },
        right: { style: "thin", color: { argb: "FFCCCCCC" } },
      };
    });

    lista.forEach((f, i) => {
      const row = ws.addRow([
        i + 1,
        f.numero_registro || "—",
        f.nome,
        fmtCpf(f.cpf),
        f.cargo || "—",
        fmtData(f.data_admissao),
        f.telefone || "—",
        f.salario_base ?? 0,
        f.salario_combinado ?? 0,
      ]);
      const zebra = i % 2 === 1;
      row.eachCell((cell, col) => {
        cell.font = { size: 10 };
        if (zebra)
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VERDE_CLARO } };
        cell.border = {
          bottom: { style: "hair", color: { argb: "FFDDDDDD" } },
        };
        if (col === 1 || col === 2 || col === 4 || col === 6) cell.alignment = { horizontal: "center" };
        if (col === 8 || col === 9) {
          cell.numFmt = 'R$ #,##0.00';
          cell.alignment = { horizontal: "right" };
        }
      });
    });

    ws.addRow([]);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `funcionarios_ativos_por_obra_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);

  return funcionarios.length;
}
