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
    <div className="flex h-screen min-w-0 overflow-hidden bg-background">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 transform bg-sidebar transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card px-4">
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
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6"
        >
          <div className="app-page">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
