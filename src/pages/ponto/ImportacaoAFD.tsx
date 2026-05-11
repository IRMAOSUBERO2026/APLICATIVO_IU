// src/pages/ponto/ImportacaoAFD.tsx
import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { parseAFD, formatarCPF, type AFDParseResult } from '@/utils/afdParser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Upload, FileText, CheckCircle2, AlertCircle,
  Users, Clock, Building2, ChevronDown, ChevronUp, X
} from 'lucide-react';

interface Obra {
  id: string;
  nome: string;
}

interface ArquivoProcessado {
  arquivo: File;
  resultado: AFDParseResult;
  obraId: string | null;
  status: 'pendente' | 'importando' | 'concluido' | 'erro';
  erro?: string;
  progresso: number;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function ImportacaoAFD() {
  const { toast } = useToast();
  const [obras, setObras] = useState<Obra[]>([]);
  const [arquivos, setArquivos] = useState<ArquivoProcessado[]>([]);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    supabase
      .from('obras')
      .select('id, nome')
      .order('nome')
      .then(({ data }) => setObras(data ?? []));
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const novos: ArquivoProcessado[] = [];

    for (const file of files) {
      if (!file.name.toUpperCase().includes('AFD') && !file.name.toUpperCase().endsWith('.TXT')) {
        toast({
          title: 'Arquivo ignorado',
          description: `"${file.name}" não parece ser um arquivo texto AFD.`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        const texto = await file.text();
        const resultado = parseAFD(texto);

        novos.push({
          arquivo: file,
          resultado,
          obraId: null,
          status: 'pendente',
          progresso: 0,
        });
      } catch (err) {
        toast({ title: "Falha na leitura", description: `Não foi possível ler ${file.name}` });
      }
    }

    setArquivos(prev => [...prev, ...novos]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/plain': ['.txt'] },
    multiple: true,
  });

  async function importarArquivo(idx: number) {
    const ap = arquivos[idx];
    if (!ap.obraId) {
      toast({ title: 'Selecione a obra antes de importar.', variant: 'destructive' });
      return;
    }

    setArquivos(prev => prev.map((a, i) =>
      i === idx ? { ...a, status: 'importando', progresso: 10 } : a
    ));

    try {
      const { cabecalho, batidas, funcionarios } = ap.resultado;

      // 1. Cria registro de importação
      const { data: importacao, error: errImp } = await supabase
        .from('afd_importacoes')
        .insert({
          nome_arquivo:   ap.arquivo.name,
          obra_id:        ap.obraId,
          relogio_serial: cabecalho.relogioSerial,
          empresa:        cabecalho.empresa,
          formato:        cabecalho.formato,
          data_inicio:    cabecalho.dataInicio || null,
          data_fim:       cabecalho.dataFim    || null,
          total_registros: batidas.length,
        })
        .select('id')
        .single();

      if (errImp || !importacao) throw new Error(errImp?.message ?? 'Erro ao criar importação');

      const importacaoId = importacao.id;

      setArquivos(prev => prev.map((a, i) =>
        i === idx ? { ...a, progresso: 30 } : a
      ));

      // 2. Insere funcionários do relógio (em lotes de 200)
      if (funcionarios.length > 0) {
        const lotesFuncs = chunkArray(funcionarios, 200);
        for (const lote of lotesFuncs) {
          const { error } = await supabase.from('afd_funcionarios_relogio').insert(
            lote.map(f => ({
              importacao_id: importacaoId,
              cpf:           f.cpf,
              nome:          f.nome,
              operacao:      f.operacao,
              data_hora:     f.dataHora.toISOString(),
            }))
          );
          if (error) console.warn('Erro ao inserir funcionários do relógio:', error.message);
        }
      }

      setArquivos(prev => prev.map((a, i) =>
        i === idx ? { ...a, progresso: 60 } : a
      ));

      // 3. Insere batidas em lotes de 500
      if (batidas.length > 0) {
        const lotesBatidas = chunkArray(batidas, 500);
        let loteAtual = 0;

        for (const lote of lotesBatidas) {
          const { error } = await supabase.from('afd_registros_ponto').insert(
            lote.map(b => ({
              importacao_id: importacaoId,
              obra_id:       ap.obraId,
              nsr:           b.nsr,
              cpf:           b.cpf,
              data_hora:     b.dataHora.toISOString(),
            }))
          );
          if (error) throw new Error(`Erro ao inserir batidas: ${error.message}`);

          loteAtual++;
          const progresso = 60 + Math.round((loteAtual / lotesBatidas.length) * 35);
          setArquivos(prev => prev.map((a, i) =>
            i === idx ? { ...a, progresso } : a
          ));
        }
      }

      setArquivos(prev => prev.map((a, i) =>
        i === idx ? { ...a, status: 'concluido', progresso: 100 } : a
      ));

      toast({ title: `✅ ${ap.arquivo.name} importado!`, description: `${batidas.length} batidas registradas.` });

    } catch (err: any) {
      const msg = err.message || 'Erro desconhecido';
      setArquivos(prev => prev.map((a, i) =>
        i === idx ? { ...a, status: 'erro', erro: msg, progresso: 0 } : a
      ));
      toast({ title: 'Erro na importação', description: msg, variant: 'destructive' });
    }
  }

  async function importarTodos() {
    setCarregando(true);
    for (let i = 0; i < arquivos.length; i++) {
      if (arquivos[i].status === 'pendente') {
        await importarArquivo(i);
      }
    }
    setCarregando(false);
  }

  function removerArquivo(idx: number) {
    setArquivos(prev => prev.filter((_, i) => i !== idx));
  }

  const pendentes = arquivos.filter(a => a.status === 'pendente');
  const prontos   = arquivos.every(a => a.obraId !== null);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Importação de Ponto AFD</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importe arquivos .txt baixados do relógio de ponto. O sistema cruzará os CPFs entre múltiplas obras automaticamente.
          </p>
        </div>

        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
            isDragActive ? 'border-primary bg-primary/10' : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className={`mx-auto h-10 w-10 mb-3 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          {isDragActive ? (
            <p className="text-primary font-medium">Solte os arquivos aqui...</p>
          ) : (
            <>
              <p className="font-medium">Arraste os arquivos AFD para cá ou clique para selecionar</p>
              <p className="text-sm text-muted-foreground mt-1">Suporta formato padrão MTE 1510 e REP-C</p>
            </>
          )}
        </div>

        {arquivos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Arquivos Lidos ({arquivos.length})
              </h2>
              {pendentes.length > 0 && (
                <Button onClick={importarTodos} disabled={!prontos || carregando}>
                  {carregando ? 'Importando...' : `Importar Todos Pendentes`}
                </Button>
              )}
            </div>

            {arquivos.map((ap, idx) => (
              <Card key={idx} className={`overflow-hidden transition-all ${ap.status === 'erro' ? 'border-destructive' : ''}`}>
                <CardHeader className="py-3 px-4 flex flex-row items-center gap-4">
                  {ap.status === 'concluido' ? (
                    <CheckCircle2 className="h-6 w-6 text-success shrink-0" />
                  ) : ap.status === 'erro' ? (
                    <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
                  ) : (
                    <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{ap.arquivo.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{ap.resultado.cabecalho.formato}</Badge>
                      <span className="text-xs text-muted-foreground">{ap.resultado.batidas.length} batidas registradas</span>
                      {ap.resultado.cabecalho.relogioSerial && (
                        <span className="text-xs text-muted-foreground hidden sm:inline">Relógio: {ap.resultado.cabecalho.relogioSerial}</span>
                      )}
                    </div>
                  </div>

                  {ap.status !== 'concluido' && (
                    <Select value={ap.obraId ?? ''} onValueChange={val => setArquivos(prev => prev.map((a, i) => i === idx ? { ...a, obraId: val } : a))}>
                      <SelectTrigger className="w-48 h-9 text-sm border-primary/30 focus:ring-primary">
                        <SelectValue placeholder="Vincular à obra..." />
                      </SelectTrigger>
                      <SelectContent>
                        {obras.map(o => (
                          <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex items-center gap-1">
                    {ap.status === 'pendente' && (
                      <Button size="sm" variant="outline" disabled={!ap.obraId} onClick={() => importarArquivo(idx)}>
                        Importar
                      </Button>
                    )}
                    <button onClick={() => setExpandido(expandido === idx ? null : idx)} className="p-2 text-muted-foreground hover:bg-muted rounded">
                      {expandido === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {ap.status !== 'importando' && (
                      <button onClick={() => removerArquivo(idx)} className="p-2 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground rounded transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardHeader>
                
                {ap.status === 'importando' && (
                  <Progress value={ap.progresso} className="h-1 rounded-none" />
                )}

                {ap.status === 'erro' && ap.erro && (
                  <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 font-medium">Erro: {ap.erro}</div>
                )}

                {expandido === idx && (
                  <CardContent className="pt-4 pb-4 px-4 border-t bg-muted/10">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-start gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Colaboradores</p>
                          <p className="font-semibold text-sm">{new Set(ap.resultado.funcionarios.map(f => f.cpf)).size} identificados</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Período Lançado</p>
                          <p className="font-semibold text-sm">{ap.resultado.cabecalho.dataInicio || '—'} a {ap.resultado.cabecalho.dataFim || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Empresa da Máquina</p>
                          <p className="font-semibold text-sm truncate" title={ap.resultado.cabecalho.empresa}>{ap.resultado.cabecalho.empresa || '—'}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
