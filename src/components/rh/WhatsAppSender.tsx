import { useState } from "react";
import { MessageCircle, Send, Users, User, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Funcionario } from "./types";

interface WhatsAppSenderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  funcionarios: Funcionario[];
}

export function WhatsAppSender({ open, onOpenChange, funcionarios }: WhatsAppSenderProps) {
  const [modo, setModo] = useState<"individual" | "grupo">("individual");
  const [mensagem, setMensagem] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const ativos = funcionarios.filter(f => f.status === "Ativo" && f.telefone);
  const filtrados = ativos.filter(f =>
    f.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.obra.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelecionado = (id: number) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selecionarTodos = () => {
    if (selecionados.length === filtrados.length) {
      setSelecionados([]);
    } else {
      setSelecionados(filtrados.map(f => f.id));
    }
  };

  const formatPhone = (tel: string) => {
    return tel.replace(/\D/g, "");
  };

  const enviarWhatsApp = () => {
    if (!mensagem.trim()) {
      toast({ title: "Erro", description: "Digite uma mensagem.", variant: "destructive" });
      return;
    }
    if (selecionados.length === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um funcionário.", variant: "destructive" });
      return;
    }

    const encodedMsg = encodeURIComponent(mensagem);

    if (modo === "individual") {
      selecionados.forEach((id, index) => {
        const func = funcionarios.find(f => f.id === id);
        if (func) {
          const phone = formatPhone(func.telefone);
          const fullPhone = phone.startsWith("55") ? phone : `55${phone}`;
          setTimeout(() => {
            window.open(`https://wa.me/${fullPhone}?text=${encodedMsg}`, "_blank");
          }, index * 500);
        }
      });
      toast({ title: "WhatsApp", description: `Abrindo ${selecionados.length} conversa(s) no WhatsApp.` });
    } else {
      const nomes = selecionados.map(id => funcionarios.find(f => f.id === id)?.nome).filter(Boolean).join(", ");
      const groupMsg = encodeURIComponent(`${mensagem}\n\nDestinatários: ${nomes}`);
      window.open(`https://wa.me/?text=${groupMsg}`, "_blank");
      toast({ title: "WhatsApp", description: "Mensagem preparada para compartilhamento em grupo." });
    }

    setMensagem("");
    setSelecionados([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-success" />
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            onClick={() => setModo("individual")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              modo === "individual" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            Individual
          </button>
          <button
            onClick={() => setModo("grupo")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              modo === "grupo" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Grupo
          </button>
        </div>

        {/* Seleção de destinatários */}
        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar funcionário..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 rounded-lg border bg-card py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={selecionarTodos}
              className="rounded-lg border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors whitespace-nowrap"
            >
              {selecionados.length === filtrados.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>

          {selecionados.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {selecionados.map(id => {
                const f = funcionarios.find(x => x.id === id);
                return f ? (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {f.nome.split(" ")[0]}
                    <button onClick={() => toggleSelecionado(id)}><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })}
            </div>
          )}

          <div className="overflow-y-auto flex-1 space-y-1 max-h-40 rounded-lg border p-2">
            {filtrados.map(f => (
              <label
                key={f.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                  selecionados.includes(f.id) ? "bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selecionados.includes(f.id)}
                  onChange={() => toggleSelecionado(f.id)}
                  className="rounded border-primary text-primary focus:ring-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{f.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{f.cargo} · {f.obra} · {f.telefone}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Mensagem</label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={4}
              placeholder="Digite sua mensagem..."
              className="w-full rounded-lg border bg-card p-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <button
            onClick={enviarWhatsApp}
            disabled={selecionados.length === 0 || !mensagem.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-success px-4 py-3 text-sm font-medium text-success-foreground shadow-sm hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            Enviar para {selecionados.length} funcionário(s)
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
