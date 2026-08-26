import { useEffect, useState } from "react";
import { parsePermissoes, type ModuloKey } from "./permissoes";

export type PortalPerfil = "admin" | "diario" | "colaborador";

export interface PortalUser {
  id: string;
  nome: string;
  perfil: PortalPerfil;
  /** Módulos do ERP liberados para este colaborador (ignorado quando perfil = admin). */
  permissoes: ModuloKey[];
}

/**
 * Lê o usuário logado no portal a partir do localStorage.
 * O login é feito por CPF + PIN (ver LoginPortal.tsx) e não usa o Supabase Auth.
 */
export function getPortalUser(): PortalUser | null {
  if (typeof window === "undefined") return null;
  const id = localStorage.getItem("portal_user_id");
  const nome = localStorage.getItem("portal_user_nome") || "";
  const perfil = (localStorage.getItem("portal_perfil_acesso") || "colaborador") as PortalPerfil;
  if (!id) return null;
  const permissoes = parsePermissoes(localStorage.getItem("portal_permissoes"));
  // Compatibilidade com sessões antigas (perfil "diario" sem lista de permissões)
  if (perfil === "diario" && permissoes.length === 0) permissoes.push("diario_obra");
  return { id, nome, perfil, permissoes };
}

export function portalLogout() {
  localStorage.removeItem("portal_user_id");
  localStorage.removeItem("portal_user_nome");
  localStorage.removeItem("portal_perfil_acesso");
  localStorage.removeItem("portal_permissoes");
}

/** Hook reativo (atualiza quando o storage muda em outra aba). */
export function usePortalUser(): PortalUser | null {
  const [user, setUser] = useState<PortalUser | null>(() => getPortalUser());

  useEffect(() => {
    const handler = () => setUser(getPortalUser());
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return user;
}
