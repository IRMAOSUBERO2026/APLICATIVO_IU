import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Raiz
import Index from "./pages/Index";
import Relatorios from "./pages/Relatorios";
import NotFound from "./pages/NotFound";

// 1. Obras
import Obras from "./pages/obras/Obras";
import DiarioObra from "./pages/obras/DiarioObra";
import DiarioObraPainel from "./pages/obras/DiarioObraPainel";
import DiarioObraForm from "./pages/obras/DiarioObraForm";
import DiarioObraMobile from "./pages/obras/DiarioObraMobile";
import Medicoes from "./pages/obras/Medicoes";
import CustosObra from "./pages/obras/CustosObra";
import Orcamento from "./pages/obras/Orcamento";

// 2. Equipamentos
import EquipamentosProprios from "./pages/equipamentos/EquipamentosProprios";
import EquipamentosLocados from "./pages/equipamentos/EquipamentosLocados";
import ContratosLocacao from "./pages/equipamentos/ContratosLocacao";

// 3. Suprimentos
import Estoque from "./pages/suprimentos/Estoque";
import Compras from "./pages/suprimentos/Compras";
import Fornecedores from "./pages/suprimentos/Fornecedores";

// 4. Financeiro
import Financeiro from "./pages/financeiro/Financeiro";
import Clientes from "./pages/financeiro/Clientes";

// 5. RH
import RH from "./pages/rh/RH";
import Folha from "./pages/rh/Folha";
import Ferias from "./pages/rh/Ferias";
import AreaFuncionario from "./pages/rh/AreaFuncionario";
import EntregaEPI from "./pages/rh/EntregaEPI";
import EntregaEPIMobile from "./pages/rh/EntregaEPIMobile";
import SegurancaTrabalho from "./pages/rh/SegurancaTrabalho";
import SegurancaDashboard from "./pages/rh/SegurancaDashboard";
import ImportacaoHistoricoASO from "./pages/rh/ImportacaoHistoricoASO";
import FichaSegurancaFuncionario from "./pages/rh/FichaSegurancaFuncionario";

// 6. Documentos
import DocumentacaoMensal from "./pages/documentos/DocumentacaoMensal";
import ConfigDocumentos from "./pages/documentos/ConfigDocumentos";
import Assinaturas from "./pages/documentos/Assinaturas";
import AssinaturaPublica from "./pages/documentos/AssinaturaPublica";
import AssinaturaEPI from "./pages/documentos/AssinaturaEPI";

// 7. Admin
import Empresas from "./pages/admin/Empresas";
import Acesso from "./pages/admin/Acesso";
import Comunicacoes from "./pages/admin/Comunicacoes";
import Solicitacoes from "./pages/admin/Solicitacoes";

// 8. Ponto
import ImportacaoAFD from "./pages/ponto/ImportacaoAFD";
import PontoConsolidado from "./pages/ponto/PontoConsolidado";
import EquipamentosPonto from "./pages/ponto/EquipamentosPonto";
import ImportacaoAFDNew from "./pages/ponto/ImportacaoAFDNew";
import ImportacaoPontoCSV from "./pages/ponto/ImportacaoPontoCSV";
import InconsistenciasPonto from "./pages/ponto/InconsistenciasPonto";
import ApuracaoPonto from "./pages/ponto/ApuracaoPonto";
import ImportacaoCSVRHiD from "./pages/ponto/ImportacaoCSVRHiD";

// 9. Portal do Colaborador
import LoginPortal from "./pages/portal/LoginPortal";
import PortalColaborador from "./pages/portal/PortalColaborador";
import MeuPonto from "./pages/portal/MeuPonto";
import Justificativas from "./pages/portal/Justificativas";
import Mural from "./pages/portal/Mural";
import AtendimentoRH from "./pages/portal/AtendimentoRH";
import Sugestoes from "./pages/portal/Sugestoes";
import MeusDados from "./pages/portal/MeusDados";
import MeusEPIs from "./pages/portal/MeusEPIs";
import MinhaAssinatura from "./pages/portal/MinhaAssinatura";

import { EmpresaObraProvider } from "./contexts/EmpresaObraContext";
import { AuthProvider } from "./contexts/AuthContext";
import { RequirePortal, RequireAdmin, RequireDiario } from "./components/PortalGuard";
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
          {/* ===== Rotas públicas (sem login) ===== */}
          <Route path="/login-portal" element={<LoginPortal />} />
          <Route path="/assinar" element={<AssinaturaPublica />} />
          {/* Portal público de assinatura digital de EPI */}
          <Route path="/portal/epi/assinar/:token" element={<AssinaturaEPI />} />

          {/* ===== Portal do Colaborador (qualquer perfil logado) ===== */}
          <Route element={<RequirePortal />}>
            <Route element={<PortalLayout />}>
              <Route path="/portal" element={<PortalColaborador />} />
              <Route path="/portal/ponto" element={<MeuPonto />} />
              <Route path="/portal/justificativas" element={<Justificativas />} />
              <Route path="/portal/recados" element={<Mural />} />
              <Route path="/portal/atendimento" element={<AtendimentoRH />} />
              <Route path="/portal/sugestoes" element={<Sugestoes />} />
              <Route path="/portal/dados" element={<MeusDados />} />
              <Route path="/portal/epis" element={<MeusEPIs />} />
              <Route path="/portal/assinatura" element={<MinhaAssinatura />} />
            </Route>
          </Route>

          {/* ===== Módulo de campo: Diário de Obra (Admin ou liberação específica) ===== */}
          <Route element={<RequireDiario />}>
            <Route path="/diario-obra-mobile" element={<DiarioObraMobile />} />
          </Route>

          {/* ===== ERP completo (somente Admin/Diretoria) ===== */}
          <Route element={<RequireAdmin />}>
            <Route path="/" element={<Index />} />
            <Route path="/obras" element={<Obras />} />
            <Route path="/rh" element={<RH />} />
            <Route path="/rh/seguranca/painel" element={<SegurancaDashboard />} />
            <Route path="/rh/seguranca/importar" element={<ImportacaoHistoricoASO />} />
            <Route path="/rh/seguranca/funcionario/:funcionarioId" element={<FichaSegurancaFuncionario />} />
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
            <Route path="/diario-obra/:obraId/:diarioId/editar" element={<DiarioObraForm />} />
            <Route path="/entrega-epi" element={<EntregaEPI />} />
            <Route path="/entrega-epi-mobile" element={<EntregaEPIMobile />} />
            <Route path="/ferias" element={<Ferias />} />
            <Route path="/orcamento" element={<Orcamento />} />
            <Route path="/compras" element={<Compras />} />
            <Route path="/documentacao-mensal" element={<DocumentacaoMensal />} />
            <Route path="/contratos-locacao" element={<ContratosLocacao />} />
            <Route path="/comunicacoes" element={<Comunicacoes />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/medicoes" element={<Medicoes />} />
            <Route path="/area-funcionario" element={<AreaFuncionario />} />
            <Route path="/config-documentos" element={<ConfigDocumentos />} />
            <Route path="/assinaturas" element={<Assinaturas />} />
            <Route path="/custos-obra" element={<CustosObra />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route path="/seguranca-trabalho" element={<SegurancaTrabalho />} />
            <Route path="/ponto-afd" element={<ImportacaoAFD />} />
            <Route path="/ponto-consolidado" element={<PontoConsolidado />} />
            <Route path="/ponto/equipamentos" element={<EquipamentosPonto />} />
            <Route path="/ponto/importar" element={<ImportacaoAFDNew />} />
            <Route path="/ponto/importar-csv" element={<ImportacaoPontoCSV />} />
            <Route path="/ponto/importar-rhid" element={<ImportacaoCSVRHiD />} />
            <Route path="/ponto/inconsistencias" element={<InconsistenciasPonto />} />
            <Route path="/ponto/apuracao" element={<ApuracaoPonto />} />
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
