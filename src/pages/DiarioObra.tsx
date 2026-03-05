import { AppLayout } from "@/components/layout/AppLayout";
import { Plus, Camera, Users, Package, AlertCircle, Calendar, MessageSquare, Send } from "lucide-react";
import { useState } from "react";

const diarioEntries = [
  {
    id: 1, data: "2026-03-05", obra: "Ed. Aurora", autor: "Pedro Lima",
    clima: "Ensolarado", equipePrevista: 18, equipePresente: 16,
    atividades: "Concretagem do 8º pavimento - laje e vigas. Desforma do 7º pavimento.",
    materiais: "15m³ concreto fck30, 2.5t aço CA50, formas metálicas",
    ocorrencias: "2 faltas justificadas por atestado.",
    fotos: 4,
    solicitacoes: [
      { tipo: "EPI", item: "20 pares de luvas de raspa", urgencia: "Normal" },
    ]
  },
  {
    id: 2, data: "2026-03-04", obra: "Galpão Alfa", autor: "Fernando Dias",
    clima: "Nublado", equipePrevista: 12, equipePresente: 12,
    atividades: "Montagem de armação dos pilares P12 a P18. Preparação de formas.",
    materiais: "3.2t aço CA50, 800kg arame recozido",
    ocorrencias: "Nenhuma",
    fotos: 2,
    solicitacoes: []
  },
  {
    id: 3, data: "2026-03-04", obra: "Ponte BR-101", autor: "Fernando Dias",
    clima: "Chuvoso", equipePrevista: 22, equipePresente: 15,
    atividades: "Trabalho parcial devido à chuva. Protensão dos cabos do trecho 3.",
    materiais: "Cabos de protensão CP190",
    ocorrencias: "Chuva forte a partir das 14h, trabalho interrompido.",
    fotos: 1,
    solicitacoes: [
      { tipo: "Material", item: "5 lonas plásticas 4x6m", urgencia: "Urgente" },
      { tipo: "Equipamento", item: "Bomba submersível", urgencia: "Urgente" },
    ]
  },
];

const muralAvisos = [
  { id: 1, tipo: "Solicitação", obra: "Ponte BR-101", mensagem: "URGENTE: Solicita 5 lonas plásticas e 1 bomba submersível", data: "04/03/2026" },
  { id: 2, tipo: "Solicitação", obra: "Ed. Aurora", mensagem: "Solicita 20 pares de luvas de raspa", data: "05/03/2026" },
  { id: 3, tipo: "Aviso", obra: "Geral", mensagem: "Entrega de holerites do mês disponível no escritório", data: "03/03/2026" },
];

export default function DiarioObra() {
  const [selectedObra, setSelectedObra] = useState("Todas");
  const obras = ["Todas", ...new Set(diarioEntries.map(d => d.obra))];

  const filtered = selectedObra === "Todas"
    ? diarioEntries
    : diarioEntries.filter(d => d.obra === selectedObra);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Diário de Obra</h1>
            <p className="text-sm text-muted-foreground">Registro diário de atividades, equipe e materiais</p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" />
            Novo Registro
          </button>
        </div>

        {/* Mural de Avisos */}
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold">Mural de Avisos e Solicitações</h3>
          </div>
          <div className="space-y-2">
            {muralAvisos.map(aviso => (
              <div key={aviso.id} className="flex items-start gap-3 rounded-lg bg-card p-3 border">
                <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  aviso.tipo === "Solicitação" ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                }`}>{aviso.tipo}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{aviso.mensagem}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{aviso.obra} • {aviso.data}</p>
                </div>
                <button className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors" title="Enviar WhatsApp">
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Filtro por obra */}
        <div className="flex gap-2 flex-wrap">
          {obras.map(obra => (
            <button
              key={obra}
              onClick={() => setSelectedObra(obra)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                selectedObra === obra ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >{obra}</button>
          ))}
        </div>

        {/* Entries */}
        <div className="space-y-4">
          {filtered.map(entry => (
            <div key={entry.id} className="rounded-xl border bg-card p-5 shadow-sm animate-fade-in">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">{new Date(entry.data).toLocaleDateString("pt-BR", { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.obra} • Registrado por {entry.autor}</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium">{entry.clima}</span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Users className="h-3 w-3" /> Equipe
                  </div>
                  <p className="text-sm font-semibold">{entry.equipePresente}/{entry.equipePrevista}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Camera className="h-3 w-3" /> Fotos
                  </div>
                  <p className="text-sm font-semibold">{entry.fotos} registros</p>
                </div>
                <div className="col-span-2 rounded-lg bg-muted/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                    <Package className="h-3 w-3" /> Materiais Consumidos
                  </div>
                  <p className="text-xs">{entry.materiais}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Atividades Realizadas</p>
                  <p className="text-sm">{entry.atividades}</p>
                </div>
                {entry.ocorrencias !== "Nenhuma" && (
                  <div>
                    <p className="text-xs font-semibold text-warning mb-1">Ocorrências</p>
                    <p className="text-sm">{entry.ocorrencias}</p>
                  </div>
                )}
              </div>

              {entry.solicitacoes.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-semibold text-destructive mb-2">Solicitações</p>
                  <div className="flex flex-wrap gap-2">
                    {entry.solicitacoes.map((s, i) => (
                      <div key={i} className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                          s.urgencia === "Urgente" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        }`}>{s.tipo}</span>
                        {s.item}
                        <button className="ml-1 text-primary hover:text-primary/80" title="Enviar via WhatsApp">
                          <Send className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
