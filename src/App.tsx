import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Obras from "./pages/Obras";
import RH from "./pages/RH";
import Folha from "./pages/Folha";
import Estoque from "./pages/Estoque";
import EquipamentosProprios from "./pages/EquipamentosProprios";
import EquipamentosLocados from "./pages/EquipamentosLocados";
import Financeiro from "./pages/Financeiro";
import Acesso from "./pages/Acesso";
import Empresas from "./pages/Empresas";
import DiarioObra from "./pages/DiarioObra";
import EntregaEPI from "./pages/EntregaEPI";
import Ferias from "./pages/Ferias";
import Orcamento from "./pages/Orcamento";
import Compras from "./pages/Compras";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/obras" element={<Obras />} />
          <Route path="/rh" element={<RH />} />
          <Route path="/folha" element={<Folha />} />
          <Route path="/estoque" element={<Estoque />} />
          <Route path="/equipamentos-proprios" element={<EquipamentosProprios />} />
          <Route path="/equipamentos-locados" element={<EquipamentosLocados />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/acesso" element={<Acesso />} />
          <Route path="/diario-obra" element={<DiarioObra />} />
          <Route path="/entrega-epi" element={<EntregaEPI />} />
          <Route path="/ferias" element={<Ferias />} />
          <Route path="/orcamento" element={<Orcamento />} />
          <Route path="/compras" element={<Compras />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
