import { useLocation, Link } from "react-router-dom";
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
  HandshakeIcon,
  FileText,
  Home,
  MessageCircle,
  FileSpreadsheet,
  Ruler,
  CalendarDays,
  PenLine,
  UserCheck,
  Bell,
} from "lucide-react";
import logoPreto from "@/assets/logo-preto.png";

const menuSections = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: CalendarDays, label: "Área do Funcionário", path: "/area-funcionario" },
    ],
  },
  {
    label: "Operacional",
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
      { icon: Palmtree, label: "Férias", path: "/ferias" },
      { icon: FileText, label: "Doc. Mensal", path: "/documentacao-mensal" },
    ],
  },
  {
    label: "Suprimentos",
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
      { icon: HandshakeIcon, label: "Fornecedores", path: "/fornecedores" },
      { icon: Home, label: "Contratos Locação", path: "/contratos-locacao" },
      { icon: Bell, label: "Solicitações", path: "/solicitacoes" },
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

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-sidebar bg-sidebar">
      {/* Topo: logo */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src={logoPreto} alt="Irmãos Ubero" className="h-9 w-auto" />
          <div>
            <h1 className="text-[12px] font-bold text-sidebar-foreground tracking-tight leading-tight">IRMÃOS UBERO</h1>
            <p className="text-[9px] text-sidebar-muted leading-none uppercase tracking-wider">Engenharia</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-sidebar-muted hover:text-sidebar-foreground lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-2 py-4">
        {menuSections.map((section, sIdx) => (
          <div
            key={section.label}
            className={sIdx > 0 ? "mt-5 pt-5 border-t border-sidebar-border" : ""}
          >
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-muted">
              {section.label}
            </p>
            <ul className="space-y-px">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path} className="relative">
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-sidebar-active-border" />
                    )}
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`group flex items-center gap-3 rounded-md pl-4 pr-3 py-2 text-[13px] font-normal transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-foreground"
                          : "text-sidebar-foreground/90 hover:bg-sidebar-hover"
                      }`}
                    >
                      <item.icon
                        className={`h-4 w-4 flex-shrink-0 ${
                          isActive ? "text-sidebar-foreground" : "text-sidebar-icon"
                        }`}
                        strokeWidth={1.75}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Rodapé: usuário */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
            AD
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-sidebar-foreground">Administrador</p>
            <p className="truncate text-[11px] text-sidebar-muted">admin@irmaosubero.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
