import { useEffect, useState } from "react";

export type PortalPerfil = "admin" | "diario" | "colaborador";

export interface PortalUser {
  id: string;
  nome: string;
  perfil: PortalPerfil;
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
  return { id, nome, perfil };
}

export function portalLogout() {
  localStorage.removeItem("portal_user_id");
  localStorage.removeItem("portal_user_nome");
  localStorage.removeItem("portal_perfil_acesso");
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
