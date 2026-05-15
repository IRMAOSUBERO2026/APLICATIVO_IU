import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Obras from "./pages/Obras";
import RH from "./pages/RH";
import ImportacaoAFD from "./pages/ponto/ImportacaoAFD";
import PontoConsolidado from "./pages/ponto/PontoConsolidado";
import Folha from "./pages/Folha";
import Estoque from "./pages/Estoque";
import EquipamentosProprios from "./pages/EquipamentosProprios";
import EquipamentosLocados from "./pages/EquipamentosLocados";
import Financeiro from "./pages/Financeiro";
import Acesso from "./pages/Acesso";
import Empresas from "./pages/Empresas";
import Fornecedores from "./pages/Fornecedores";
import DiarioObra from "./pages/DiarioObra";
import DiarioObraPainel from "./pages/DiarioObraPainel";
import DiarioObraForm from "./pages/DiarioObraForm";
import EntregaEPI from "./pages/EntregaEPI";
import EntregaEPIMobile from "./pages/EntregaEPIMobile";
import Ferias from "./pages/Ferias";
import Orcamento from "./pages/Orcamento";
import Compras from "./pages/Compras";
import DocumentacaoMensal from "./pages/DocumentacaoMensal";
import ContratosLocacao from "./pages/ContratosLocacao";
import DiarioObraMobile from "./pages/DiarioObraMobile";
import Comunicacoes from "./pages/Comunicacoes";
import Relatorios from "./pages/Relatorios";
import Medicoes from "./pages/Medicoes";
import AreaFuncionario from "./pages/AreaFuncionario";
import ConfigDocumentos from "./pages/ConfigDocumentos";
import Assinaturas from "./pages/Assinaturas";
import AssinaturaPublica from "./pages/AssinaturaPublica";
import CustosObra from "./pages/CustosObra";
import Clientes from "./pages/Clientes";
import Solicitacoes from "./pages/Solicitacoes";
import NotFound from "./pages/NotFound";
import LoginPortal from "./pages/LoginPortal";
import PortalColaborador from "./pages/PortalColaborador";
import MeuPonto from "./pages/portal/MeuPonto";
import Justificativas from "./pages/portal/Justificativas";
import Mural from "./pages/portal/Mural";
import AtendimentoRH from "./pages/portal/AtendimentoRH";
import Sugestoes from "./pages/portal/Sugestoes";
import MeusDados from "./pages/portal/MeusDados";
import { EmpresaObraProvider } from "./contexts/EmpresaObraContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PortalLayout } from "./components/layout/PortalLayout";
import { ScrollToTop } from "./components/layout/ScrollToTop";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <EmpresaObraProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/obras" element={<Obras />} />
              <Route path="/rh" element={<RH />} />
              <Route path="/rh/ponto/importar" element={<ImportacaoAFD />} />
              <Route path="/rh/ponto/consolidado" element={<PontoConsolidado />} />
              <Route path="/folha" element={<Folha />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/equipamentos-proprios" element={<EquipamentosProprios />} />
              <Route path="/equipamentos-locados" element={<EquipamentosLocados />} />
              <Route path="/financeiro" element={<Financeiro />} />
              <Route path="/acesso" element={<Acesso />} />
              <Route path="/empresas" element={<Empresas />} />
              <Route path="/fornecedores" element={<Fornecedores />} />
              <Route path="/diario-obra" element={<DiarioObra />} />
              <Route path="/diario-obra/:obraId" element={<DiarioObraPainel />} />
              <Route path="/diario-obra/:obraId/novo" element={<DiarioObraForm />} />
              <Route path="/entrega-epi" element={<EntregaEPI />} />
              <Route path="/entrega-epi-mobile" element={<EntregaEPIMobile />} />
              <Route path="/ferias" element={<Ferias />} />
              <Route path="/orcamento" element={<Orcamento />} />
              <Route path="/compras" element={<Compras />} />
              <Route path="/documentacao-mensal" element={<DocumentacaoMensal />} />
              <Route path="/contratos-locacao" element={<ContratosLocacao />} />
              <Route path="/diario-obra-mobile" element={<DiarioObraMobile />} />
              <Route path="/comunicacoes" element={<Comunicacoes />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/medicoes" element={<Medicoes />} />
              <Route path="/area-funcionario" element={<AreaFuncionario />} />
              <Route path="/config-documentos" element={<ConfigDocumentos />} />
              <Route path="/assinaturas" element={<Assinaturas />} />
              <Route path="/assinar" element={<AssinaturaPublica />} />
              <Route path="/custos-obra" element={<CustosObra />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/solicitacoes" element={<Solicitacoes />} />
              
              {/* Rotas do Portal do Colaborador */}
              <Route path="/login-portal" element={<LoginPortal />} />
              <Route element={<ProtectedRoute allowedRoles={["colaborador", "rh", "admin"]} />}>
                <Route element={<PortalLayout />}>
                  <Route path="/portal" element={<PortalColaborador />} />
                  <Route path="/portal/ponto" element={<MeuPonto />} />
                  <Route path="/portal/justificativas" element={<Justificativas />} />
                  <Route path="/portal/recados" element={<Mural />} />
                  <Route path="/portal/atendimento" element={<AtendimentoRH />} />
                  <Route path="/portal/sugestoes" element={<Sugestoes />} />
                  <Route path="/portal/dados" element={<MeusDados />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </EmpresaObraProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
