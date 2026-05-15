import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 mb-4 mx-4">
      <p className="text-[10px] font-bold text-primary uppercase mb-2">App Disponível</p>
      <p className="text-xs text-gray-700 mb-3">Instale o portal na sua tela inicial para acesso rápido.</p>
      <Button onClick={handleInstall} className="w-full gap-2 text-xs h-8">
        <Download className="h-3 w-3" /> Instalar Aplicativo
      </Button>
    </div>
  );
}
