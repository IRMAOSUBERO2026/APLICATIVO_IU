import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: ("admin" | "rh" | "colaborador")[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { session, role, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Carregando...</div>;
  }

  if (!session) {
    return <Navigate to="/login-portal" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Se o usuário logado não tem permissão para a rota
    if (role === "colaborador") {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
