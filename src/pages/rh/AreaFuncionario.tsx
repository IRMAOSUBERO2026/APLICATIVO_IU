import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgendaCalendario } from "@/components/planner/AgendaCalendario";
import { TarefasBoard } from "@/components/planner/TarefasBoard";
import { AvisosPanel } from "@/components/planner/AvisosPanel";
import { MensagensInternas } from "@/components/planner/MensagensInternas";
import { DashboardFuncionario } from "@/components/planner/DashboardFuncionario";
import { CalendarDays, CheckSquare, Bell, MessageCircle, LayoutDashboard } from "lucide-react";

export default function AreaFuncionario() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Área do Funcionário</h1>
          <p className="text-sm text-muted-foreground">Planner corporativo — agenda, tarefas, avisos e comunicação</p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
              <LayoutDashboard className="h-4 w-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="agenda" className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="tarefas" className="flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4" /> Tarefas
            </TabsTrigger>
            <TabsTrigger value="avisos" className="flex items-center gap-1.5">
              <Bell className="h-4 w-4" /> Avisos
            </TabsTrigger>
            <TabsTrigger value="mensagens" className="flex items-center gap-1.5">
              <MessageCircle className="h-4 w-4" /> Mensagens
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard"><DashboardFuncionario /></TabsContent>
          <TabsContent value="agenda"><AgendaCalendario /></TabsContent>
          <TabsContent value="tarefas"><TarefasBoard /></TabsContent>
          <TabsContent value="avisos"><AvisosPanel /></TabsContent>
          <TabsContent value="mensagens"><MensagensInternas /></TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
