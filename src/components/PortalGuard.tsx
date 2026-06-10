import { Navigate, Outlet } from "react-router-dom";
import { getPortalUser } from "@/lib/portalAuth";

/**
 * Exige que o usuário esteja logado no portal (qualquer perfil).
 */
export function RequirePortal() {
  const user = getPortalUser();
  if (!user) return <Navigate to="/login-portal" replace />;
  return <Outlet />;
}

/**
 * Exige perfil Admin/Diretoria para acessar os módulos completos do ERP.
 * Colaboradores são redirecionados ao portal; o perfil "diário" vai direto ao lançamento de campo.
 */
export function RequireAdmin() {
  const user = getPortalUser();
  if (!user) return <Navigate to="/login-portal" replace />;
  if (user.perfil === "admin") return <Outlet />;
  if (user.perfil === "diario") return <Navigate to="/diario-obra-mobile" replace />;
  return <Navigate to="/portal" replace />;
}

/**
 * Exige perfil Admin ou liberação de "Diário de Obra".
 */
export function RequireDiario() {
  const user = getPortalUser();
  if (!user) return <Navigate to="/login-portal" replace />;
  if (user.perfil === "admin" || user.perfil === "diario") return <Outlet />;
  return <Navigate to="/portal" replace />;
}
