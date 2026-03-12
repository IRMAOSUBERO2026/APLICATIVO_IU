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
} from "lucide-react";
import logoPreto from "@/assets/logo-preto.png";

const menuSections = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    ],
  },
  {
    label: "Operacional",
    items: [
      { icon: HardHat, label: "Obras", path: "/obras" },
      { icon: ClipboardList, label: "Diário de Obra", path: "/diario-obra" },
      { icon: Users, label: "RH / DP", path: "/rh" },
      { icon: CreditCard, label: "Folha Salarial", path: "/folha" },
      { icon: Palmtree, label: "Férias", path: "/ferias" },
      { icon: FileText, label: "Doc. Mensal", path: "/documentacao-mensal" },
    ],
  },
  {
    label: "Logística",
    items: [
      { icon: ShoppingCart, label: "Compras", path: "/compras" },
      { icon: HandshakeIcon, label: "Fornecedores", path: "/fornecedores" },
      { icon: Package, label: "Estoque", path: "/estoque" },
      { icon: HardDrive, label: "Entrega de EPI", path: "/entrega-epi" },
      { icon: Wrench, label: "Equip. Próprios", path: "/equipamentos-proprios" },
      { icon: Truck, label: "Equip. Locados", path: "/equipamentos-locados" },
    ],
  },
  {
    label: "Administrativo",
    items: [
      { icon: Building2, label: "Empresas", path: "/empresas" },
      { icon: Warehouse, label: "Financeiro", path: "/financeiro" },
      { icon: Home, label: "Contratos Locação", path: "/contratos-locacao" },
      { icon: Calculator, label: "Orçamentos", path: "/orcamento" },
      { icon: Shield, label: "Controle de Acesso", path: "/acesso" },
    ],
  },
];

interface AppSidebarProps {
  onClose: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const location = useLocation();

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <img src={logoPreto} alt="Irmãos Ubero" className="h-10 w-auto" />
          <div>
            <h1 className="text-xs font-bold text-sidebar-accent-foreground tracking-tight leading-tight">IRMÃOS UBERO</h1>
            <p className="text-[9px] text-sidebar-muted leading-none">Engenharia</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-sidebar-muted hover:text-sidebar-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
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
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
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
