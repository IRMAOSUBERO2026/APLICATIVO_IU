import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { 
  LogOut, 
  Menu, 
  Home, 
  Clock, 
  FileText, 
  MessageSquare, 
  User as UserIcon,
  X
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { InstallPWA } from "../portal/InstallPWA";

export function PortalLayout() {
  const { session, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/login-portal");
  };

  const navItems = [
    { name: "Início", path: "/portal", icon: Home },
    { name: "Meu Ponto", path: "/portal/ponto", icon: Clock },
    { name: "Holerites", path: "/portal/holerites", icon: FileText },
    { name: "Recados", path: "/portal/recados", icon: MessageSquare },
    { name: "Meus Dados", path: "/portal/dados", icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          fixed md:sticky top-0 left-0 z-50 h-screen w-64 bg-primary text-white 
          transition-transform duration-300 ease-in-out flex flex-col
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          <h2 className="font-bold text-xl truncate">Portal do Colaborador</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 border-b border-white/10">
          <p className="text-sm text-gray-300 truncate">{session?.user?.email}</p>
          <p className="text-xs text-gray-400 capitalize mt-1">Perfil: {role}</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-left"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <InstallPWA />

        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10 transition-colors text-red-300 hover:text-red-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm border-b p-4 flex items-center gap-4 md:hidden">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg truncate">Portal do Colaborador</h1>
        </header>

        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
