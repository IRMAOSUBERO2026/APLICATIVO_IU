// src/pages/ponto/PontoConsolidado.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatarCPF, organizarBatidasDiarias, formatTime } from '@/utils/afdParser';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Building2, Clock, Calendar, AlertCircle } from 'lucide-react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface RegistroPonto {
  cpf: string;
  nome_funcionario: string;
  funcionario_id: string | null;
  obra_id: string;
  obra_nome: string;
  data_hora: string;
  data: string;
  hora: string;
  nome_arquivo: string;
}

interface FuncionarioResumo {
  cpf: string;
  nome: string;
  obras: string[];
  totalBatidas: number;
  registros: RegistroPonto[];
}

export default function PontoConsolidado() {
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [busca, setBusca] = useState('');
  const [obraFiltro, setObraFiltro] = useState('todas');
  const [obras, setObras] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      const [{ data: regs }, { data: obrasData }] = await Promise.all([
        supabase
          .from('vw_ponto_consolidado')
          .select('*')
          .order('data_hora', { ascending: false })
          .limit(50000),
        supabase.from('obras').select('id, nome').order('nome'),
      ]);

      setRegistros((regs ?? []) as any);
      setObras(obrasData ?? []);
      setCarregando(false);
    }
    carregarDados();
  }, []);

  const porCPF = new Map<string, FuncionarioResumo>();
  for (const r of registros) {
    if (!porCPF.has(r.cpf)) {
      porCPF.set(r.cpf, {
        cpf: r.cpf,
        nome: r.nome_funcionario,
        obras: [],
        totalBatidas: 0,
        registros: [],
      });
    }
    const f = porCPF.get(r.cpf)!;
    if (!f.obras.includes(r.obra_nome)) f.obras.push(r.obra_nome);
    f.totalBatidas++;
    f.registros.push(r);
  }

  const funcionarios = [...porCPF.values()].filter(f => {
    const matchBusca = busca === '' || f.nome.toLowerCase().includes(busca.toLowerCase()) || f.cpf.includes(busca.replace(/\D/g, ''));
    const matchObra = obraFiltro === 'todas' || f.registros.some(r => r.obra_id === obraFiltro);
    return matchBusca && matchObra;
  });

  // Função auxiliar para renderizar um slot (com lógica de falta)
  const SlotBatida = ({ timeObj, label }: { timeObj: Date | null, label: string }) => {
    if (!timeObj) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex flex-col items-center justify-center p-2 rounded border border-dashed border-destructive/50 bg-destructive/5 text-destructive cursor-help">
              <AlertCircle className="h-4 w-4 mb-1" />
              <span className="text-[10px] font-bold">FALTA</span>
            </div>
          </TooltipTrigger>
          <TooltipContent><p>{label} não registrada no relógio.</p></TooltipContent>
        </Tooltip>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-2 rounded border bg-card shadow-sm text-foreground">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase">{label}</span>
        <span className="text-sm font-mono font-bold mt-0.5">{formatTime(timeObj)}</span>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Espelho de Ponto Consolidado</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão unificada das batidas de todos os relógios organizadas por funcionário, estruturadas no formato de 4 batidas.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF do funcionário..."
              className="pl-9 bg-background"
              value={busca}
              onChange={e => setBusca(e.target.value)}
            />
          </div>
          <Select value={obraFiltro} onValueChange={setObraFiltro}>
            <SelectTrigger className="w-full sm:w-64 bg-background">
              <SelectValue placeholder="Todas as obras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as obras</SelectItem>
              {obras.map(o => (
                <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-primary/10 border-primary/20 border p-4 rounded-xl">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Colaboradores Totais</p>
            <p className="text-3xl font-black text-primary mt-1">{porCPF.size}</p>
          </div>
          <div className="bg-card border p-4 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Batidas Registradas</p>
            <p className="text-3xl font-black text-foreground mt-1">{registros.length.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-card border p-4 rounded-xl shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trabalhando em +1 Obra</p>
            <p className="text-3xl font-black text-foreground mt-1">
              {[...porCPF.values()].filter(f => f.obras.length > 1).length}
            </p>
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {funcionarios.map(f => {
              const isExp = expandido === f.cpf;
              const porData = new Map<string, RegistroPonto[]>();
              for (const r of f.registros) {
                if (!porData.has(r.data)) porData.set(r.data, []);
                porData.get(r.data)!.push(r);
              }

              return (
                <Card key={f.cpf} className={`overflow-hidden transition-all ${isExp ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}>
                  <CardHeader className="py-4 px-5 cursor-pointer select-none" onClick={() => setExpandido(isExp ? null : f.cpf)}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg shrink-0">
                        {f.nome.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-foreground truncate">{f.nome}</p>
                        <p className="text-sm font-medium text-muted-foreground font-mono mt-0.5">{formatarCPF(f.cpf)}</p>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:max-w-[200px] justify-start sm:justify-end">
                        {f.obras.map(o => (
                          <Badge key={o} variant="secondary" className="text-[10px] uppercase font-semibold">
                            <Building2 className="h-3 w-3 mr-1" />
                            {o}
                          </Badge>
                        ))}
                      </div>

                      <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0">
                        <p className="text-sm font-bold text-foreground bg-muted px-3 py-1 rounded-md inline-block">
                          {f.totalBatidas} batidas
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-1">em {porData.size} dias</p>
                      </div>
                    </div>
                  </CardHeader>

                  {isExp && (
                    <CardContent className="pt-0 pb-5 px-5 border-t bg-muted/10">
                      <div className="mt-5 space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {[...porData.entries()]
                          .sort(([a], [b]) => b.localeCompare(a))
                          .map(([data, regs]) => {
                            const dateObjs = regs.map(r => new Date(r.data_hora));
                            const diaPonto = organizarBatidasDiarias(dateObjs);
                            const obrasDia = [...new Set(regs.map(r => r.obra_nome))];
                            
                            // Formata a data (DD/MM/YYYY) para exibir no cabeçalho
                            const [ano, mes, dia] = data.split('-');
                            const dataDisplay = `${dia}/${mes}/${ano}`;

                            return (
                              <div key={data} className={`bg-background rounded-xl border p-4 shadow-sm relative overflow-hidden ${diaPonto.incompleto ? 'border-destructive/30 bg-destructive/5' : ''}`}>
                                {diaPonto.incompleto && (
                                  <div className="absolute top-0 right-0 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                    INCOMPLETO
                                  </div>
                                )}
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-3">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-primary/10 p-2 rounded-lg">
                                      <Calendar className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                      <span className="text-base font-bold text-foreground block">{dataDisplay}</span>
                                      <span className="text-xs font-medium text-muted-foreground">{regs.length} batida(s) detectada(s)</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center flex-wrap gap-2">
                                    {obrasDia.map(o => (
                                      <Badge key={o} variant="outline" className="text-xs font-medium bg-background">
                                        <Building2 className="h-3 w-3 mr-1" /> {o}
                                      </Badge>
                                    ))}
                                    {diaPonto.horasTrabalhadas > 0 && (
                                      <Badge variant="default" className="text-xs font-bold px-3">
                                        <Clock className="h-3 w-3 mr-1" />
                                        {diaPonto.horasTrabalhadas.toFixed(2).replace('.', ',')}h Trabalhadas
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                {/* 4 SLOTS GRID */}
                                <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-2">
                                  <SlotBatida timeObj={diaPonto.ent1} label="Entrada 1" />
                                  <SlotBatida timeObj={diaPonto.sai1} label="Saída 1" />
                                  <SlotBatida timeObj={diaPonto.ent2} label="Entrada 2" />
                                  <SlotBatida timeObj={diaPonto.sai2} label="Saída 2" />
                                </div>

                                {diaPonto.incompleto && (
                                  <p className="text-xs font-medium text-destructive mt-3 text-center">
                                    <AlertCircle className="h-3 w-3 inline mr-1" />
                                    Atenção: Este funcionário esqueceu de registrar o ponto e o espelho precisa de conferência.
                                  </p>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
            
            {funcionarios.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-center border rounded-xl border-dashed">
                 <div className="rounded-full bg-muted p-4 mb-3">
                   <AlertCircle className="h-8 w-8 text-muted-foreground" />
                 </div>
                 <h3 className="text-lg font-semibold text-foreground">Nenhum registro encontrado</h3>
                 <p className="text-sm text-muted-foreground max-w-md mx-auto">
                   Não há batidas de ponto importadas no momento, ou os filtros aplicados não retornaram resultados.
                 </p>
               </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
