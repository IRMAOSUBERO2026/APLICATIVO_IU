import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getPortalUser } from "@/lib/portalAuth";
import { podeAcessarRota, rotaInicial } from "@/lib/permissoes";

/**
 * Exige que o usuário esteja logado no portal (qualquer perfil).
 */
export function RequirePortal() {
  const user = getPortalUser();
  if (!user) return <Navigate to="/login-portal" replace />;
  return <Outlet />;
}

/**
 * Guarda dos módulos do ERP: admin acessa tudo; os demais somente os módulos
 * liberados no painel "Controle de Acesso".
 */
export function RequireAdmin() {
  const user = getPortalUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login-portal" replace />;
  if (podeAcessarRota(location.pathname, user.perfil, user.permissoes)) return <Outlet />;
  const destino = rotaInicial(user.perfil, user.permissoes);
  return <Navigate to={destino === location.pathname ? "/portal" : destino} replace />;
}

/**
 * Exige permissão para o módulo de Diário de Obra (campo).
 */
export function RequireDiario() {
  const user = getPortalUser();
  const location = useLocation();
  if (!user) return <Navigate to="/login-portal" replace />;
  if (podeAcessarRota(location.pathname, user.perfil, user.permissoes)) return <Outlet />;
  return <Navigate to="/portal" replace />;
}
