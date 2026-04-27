import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Ao trocar de rota, reseta o scroll vertical para o topo:
 * - do container principal (<main id="app-main">)
 * - e do window como fallback
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const main = document.getElementById("app-main");
    if (main) main.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}
