import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import logoPreto from "@/assets/logo-preto.png";
import { ContextoSelector } from "./ContextoSelector";
import { UsuarioImpressaoBadge } from "./UsuarioImpressaoBadge";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F4F5F6]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[240px] transform bg-[#0D0D0D] transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Topbar/Header: fundo branco, borda inferior #E5E5E5, altura 56px */}
        <header className="sticky top-0 z-30 flex h-[56px] items-center gap-4 border-b border-[#E5E5E5] bg-white px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src={logoPreto} alt="IU Engenharia" className="h-7 w-auto lg:hidden" />
          <div className="flex-1 lg:flex lg:items-center lg:justify-end gap-3">
            <ContextoSelector />
            <UsuarioImpressaoBadge />
          </div>
        </header>

        <main
          id="app-main"
          className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 scrollbar-saas"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
