import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { organizarBatidasDiarias, formatTime } from '@/utils/afdParser';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { format, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistroPonto {
  cpf: string;
  data_hora: string;
  data: string;
  hora: string;
  obra_nome: string;
}

export default function MeuPonto() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const cpf = user?.email?.split('@')[0] || '';

  useEffect(() => {
    async function loadPonto() {
      if (!cpf) return;
      setLoading(true);
      
      const start = startOfMonth(currentMonth).toISOString();
      const end = endOfMonth(currentMonth).toISOString();

      const { data, error } = await supabase
        .from('vw_ponto_consolidado')
        .select('*')
        .eq('cpf', cpf)
        .gte('data_hora', start)
        .lte('data_hora', end)
        .order('data_hora', { ascending: true });

      if (!error && data) {
        setRegistros(data as any);
      }
      setLoading(false);
    }
    loadPonto();
  }, [cpf, currentMonth]);

  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  
  function addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  // Organizar batidas por dia
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  const pontoPorDia = daysInMonth.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd');
    const dayRegs = registros.filter(r => r.data === dayStr);
    const dateObjs = dayRegs.map(r => new Date(r.data_hora));
    const infoPonto = organizarBatidasDiarias(dateObjs);
    const obras = [...new Set(dayRegs.map(r => r.obra_nome))];

    return {
      date: day,
      info: infoPonto,
      obras,
      hasRegs: dayRegs.length > 0
    };
  }).reverse();

  const SlotBatida = ({ timeObj, label }: { timeObj: Date | null, label: string }) => {
    if (!timeObj) {
      return (
        <div className="flex flex-col items-center justify-center p-2 rounded border border-dashed border-gray-200 bg-gray-50/50">
          <span className="text-[9px] text-gray-400 font-semibold uppercase">{label}</span>
          <span className="text-xs text-gray-300 font-mono mt-1">--:--</span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center p-2 rounded border border-primary/20 bg-primary/5 text-primary">
        <span className="text-[9px] font-semibold uppercase opacity-70">{label}</span>
        <span className="text-sm font-mono font-bold mt-0.5">{formatTime(timeObj)}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Meu Cartão Ponto</h2>
          <p className="text-muted-foreground text-sm">Acompanhe suas batidas e horas trabalhadas.</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="text-sm font-bold px-2 capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid gap-4">
          {pontoPorDia.map((item, idx) => {
            const isWeekend = item.date.getDay() === 0 || item.date.getDay() === 6;
            if (!item.hasRegs && isWeekend) return null; // Esconde fins de semana sem batida

            return (
              <Card key={idx} className={`${item.info.incompleto && item.hasRegs ? 'border-destructive/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex flex-col items-center justify-center text-white ${isWeekend ? 'bg-gray-400' : 'bg-primary'}`}>
                        <span className="text-[10px] font-bold leading-none">{format(item.date, 'EEE', { locale: ptBR }).toUpperCase()}</span>
                        <span className="text-sm font-bold leading-none mt-0.5">{format(item.date, 'dd')}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{format(item.date, "dd 'de' MMMM", { locale: ptBR })}</span>
                          {item.info.incompleto && item.hasRegs && (
                            <Badge variant="destructive" className="text-[10px] h-5">PONTO INCOMPLETO</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {item.obras.map(o => (
                            <span key={o} className="text-[10px] flex items-center gap-1 text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              <Building2 className="h-3 w-3" /> {o}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 flex-1 max-w-sm md:mx-4">
                      <SlotBatida timeObj={item.info.ent1} label="Ent 1" />
                      <SlotBatida timeObj={item.info.sai1} label="Sai 1" />
                      <SlotBatida timeObj={item.info.ent2} label="Ent 2" />
                      <SlotBatida timeObj={item.info.sai2} label="Sai 2" />
                    </div>

                    <div className="flex items-center justify-between md:justify-end md:w-32 gap-3">
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase">Total</p>
                        <p className="text-sm font-bold text-primary">
                          {item.info.horasTrabalhadas > 0 ? `${item.info.horasTrabalhadas.toFixed(2).replace('.', ',')}h` : '--:--'}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs"
                        onClick={() => navigate(`/portal/justificativas?date=${format(item.date, 'yyyy-MM-dd')}`)}
                      >
                        Justificar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && registros.length === 0 && (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed">
          <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-muted-foreground font-medium">Nenhum registro encontrado para este mês.</p>
        </div>
      )}
    </div>
  );
}
