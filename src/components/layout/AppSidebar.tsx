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
  BarChart3,
  UserCheck,
  Bell,
} from "lucide-react";
import logoBranco from "@/assets/logo-branco.png";

const menuSections = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: CalendarDays, label: "Área do Funcionário", path: "/area-funcionario" },
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
    <div className="flex h-full flex-col overflow-y-auto scrollbar-sidebar bg-sidebar-background border-r border-white/5">
      <div className="flex h-20 items-center justify-between px-6 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-3">
          <img src={logoBranco} alt="Irmãos Ubero" className="h-12 w-auto brightness-110" />
          <div className="hidden sm:block">
            <h1 className="text-[10px] font-black text-white tracking-[0.15em] leading-tight uppercase">IRMÃOS UBERO</h1>
            <p className="text-[8px] text-primary font-bold tracking-widest leading-none uppercase">Engenharia</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-white/40 hover:text-white lg:hidden bg-white/5">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-8">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.2em] text-white/30">
              {section.label}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-primary text-white shadow-[0_0_15px_rgba(45,106,4,0.3)] scale-[1.02]"
                          : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-primary/70"}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold text-sidebar-primary">
            AD
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">Administrador</p>
            <p className="truncate text-xs text-sidebar-muted">admin@irmaos ubero.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
