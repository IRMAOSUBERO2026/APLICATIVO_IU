import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  HardHat,
  Warehouse,
  Package,
  Truck,
  CreditCard,
  Shield,
  Wrench,
  ShoppingCart,
  X,
  ClipboardList,
  HardDrive,
  Palmtree,
  Calculator,
  Building2,
  Handshake,
  FileText,
  Home,
  MessageCircle,
  FileSpreadsheet,
  Ruler,
  CalendarDays,
  PenLine,
  BarChart3,
  UserCheck,
  Bell,
  Upload,
  ShieldAlert,
} from "lucide-react";
import { verificarAlertas } from "@/utils/seguranca";
import logoMark from "@/assets/logo-iu-mark.svg";

const menuSections = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: CalendarDays, label: "Portal Colaborador", path: "/portal" },
    ],
  },
  {
    label: "Obras",
    items: [
      { icon: HardHat, label: "Obras", path: "/obras" },
      { icon: ClipboardList, label: "Diário de Obra", path: "/diario-obra" },
      { icon: HardDrive, label: "Entrega de EPI", path: "/entrega-epi" },
      { icon: Calculator, label: "Orçamentos", path: "/orcamento" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { icon: Ruler, label: "Medições", path: "/medicoes" },
      { icon: CreditCard, label: "Folha Salarial", path: "/folha" },
      { icon: Warehouse, label: "Financeiro", path: "/financeiro" },
    ],
  },
  {
    label: "RH & Pessoal",
    items: [
      { icon: Users, label: "RH / DP", path: "/rh" },
      { icon: Shield, label: "Segurança e NRs", path: "/rh/seguranca/painel" },
      { icon: Calculator, label: "Equipamentos de Ponto", path: "/ponto/equipamentos" },
      { icon: Upload, label: "Importar AFD", path: "/ponto/importar" },
      { icon: Upload, label: "Importar CSV (RHiD)", path: "/ponto/importar-csv" },
      { icon: Bell, label: "Inconsistências", path: "/ponto/inconsistencias" },
      { icon: BarChart3, label: "Apuração Mensal", path: "/ponto/apuracao" },
      { icon: Palmtree, label: "Férias", path: "/ferias" },
      { icon: FileText, label: "Doc. Mensal", path: "/documentacao-mensal" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { icon: ShoppingCart, label: "Compras", path: "/compras" },
      { icon: Package, label: "Estoque", path: "/estoque" },
      { icon: Wrench, label: "Equip. Próprios", path: "/equipamentos-proprios" },
      { icon: Truck, label: "Equip. Locados", path: "/equipamentos-locados" },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { icon: Building2, label: "Empresas", path: "/empresas" },
      { icon: UserCheck, label: "Clientes", path: "/clientes" },
      { icon: Handshake, label: "Fornecedores", path: "/fornecedores" },
      { icon: Home, label: "Contratos Locação", path: "/contratos-locacao" },
      { icon: Bell, label: "Solicitações", path: "/solicitacoes" },
      { icon: ShieldAlert, label: "Segurança do Trabalho", path: "/seguranca-trabalho" },
      { icon: MessageCircle, label: "Comunicações", path: "/comunicacoes" },
      { icon: FileSpreadsheet, label: "Relatórios", path: "/relatorios" },
      { icon: PenLine, label: "Assinaturas Digitais", path: "/assinaturas" },
      { icon: Shield, label: "Controle de Acesso", path: "/acesso" },
      { icon: FileText, label: "Config. Documentos", path: "/config-documentos" },
    ],
  },
];

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const location = useLocation();
  const [alertasSeguranca, setAlertasSeguranca] = useState(0);

  useEffect(() => {
    // Carrega o badge de alertas de segurança
    verificarAlertas().then(res => {
      setAlertasSeguranca(res.vencidos + res.a_vencer_7);
    });
  }, [location.pathname]);

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-saas bg-[#0D0D0D] w-[240px]">
      <div className="flex h-20 items-center justify-between px-6 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-black p-1.5 shadow-md">
            <img src={logoMark} alt="Irmãos Ubero Engenharia" className="h-9 w-auto" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-[11px] font-black text-white tracking-[0.08em] leading-tight uppercase">IRMÃOS UBERO</h1>
            <p className="text-[9px] text-[#C9A84C] font-bold leading-none uppercase tracking-[0.12em]">Engenharia</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-white/40 hover:text-white lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-0 py-6 space-y-6">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-6 text-[10px] font-medium uppercase tracking-[0.15em] text-[#888888]">
              {section.label}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-6 py-2.5 text-[13px] transition-all relative ${
                        isActive
                          ? "bg-[#2F4A2A] text-white font-medium border-l-[3px] border-[#C9A84C]"
                          : "text-white hover:bg-[#1A2E18] font-normal"
                      }`}
                    >
                      <item.icon
                        className="h-4 w-4 flex-shrink-0 text-[#C9A84C]"
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.label === "Segurança e NRs" && alertasSeguranca > 0 && (
                        <span className="flex h-5 items-center justify-center rounded-full bg-destructive px-2 text-[10px] font-bold text-destructive-foreground">
                          {alertasSeguranca}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mx-6 mt-4 border-b-[0.5px] border-[#2A2A2A]" />
          </div>
        ))}
      </nav>

      <div className="border-t border-[#2A2A2A] p-6 bg-[#090909]">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3A5C35] text-xs font-bold text-white shadow-lg shadow-black/20">
            AD
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">Administrador</p>
            <p className="truncate text-[11px] text-[#888888]">admin@iuengenharia.com.br</p>
          </div>
        </div>
      </div>
    </div>
  );
}
