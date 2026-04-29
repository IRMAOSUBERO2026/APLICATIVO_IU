import { ReactNode, useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { Menu } from "lucide-react";
import logoBranco from "@/assets/logo-branco.png";
import { ContextoSelector } from "./ContextoSelector";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Header desktop + mobile com seletor de contexto */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 backdrop-blur px-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <img src={logoBranco} alt="Irmãos Ubero" className="h-8 w-auto lg:hidden" />
          <ContextoSelector />
        </header>

        <main
          id="app-main"
          className="flex-1 overflow-auto p-4 lg:p-6"
        >
          <div className="min-w-0 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
