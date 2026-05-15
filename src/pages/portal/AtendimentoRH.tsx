import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, Send, User, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function AtendimentoRH() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mensagens, setMensagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    async function loadMensagens() {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('mensagens_internas')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMensagens(data);
      }
      setLoading(false);
    }
    loadMensagens();
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from('mensagens_internas')
        .insert({
          remetente: user.id,
          destinatario_tipo: 'rh',
          conteudo: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
      // Real-time update simulation
      const { data } = await supabase
        .from('mensagens_internas')
        .select('*')
        .order('created_at', { ascending: true });
      if (data) setMensagens(data);
      
      toast({ title: "Mensagem enviada", description: "O RH responderá em breve." });
    } catch (error: any) {
      toast({ title: "Erro ao enviar", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Atendimento RH/DP</h2>
          <p className="text-muted-foreground text-sm">Tire suas dúvidas ou envie solicitações diretamente para o RH.</p>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div></div>
          ) : mensagens.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-muted-foreground text-sm">Inicie uma conversa com o RH.</p>
            </div>
          ) : (
            mensagens.map((msg) => {
              const isMe = msg.remetente === user?.id;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? 'bg-primary text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border'}`}>
                    <div className="flex items-center gap-1 mb-1">
                      {isMe ? <User className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3 text-primary" />}
                      <span className="text-[10px] font-bold uppercase opacity-70">{isMe ? "Você" : "RH / DP"}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                    <span className={`text-[9px] block mt-1 opacity-60 text-right`}>
                      {format(parseISO(msg.created_at), "HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
        <div className="p-4 border-t bg-white">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input 
              placeholder="Digite sua mensagem..." 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)}
              className="flex-1"
              disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
