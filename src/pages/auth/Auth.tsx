import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck } from "lucide-react";

/**
 * Acesso administrativo via Supabase Auth (e-mail + senha).
 * O primeiro usuário cadastrado torna-se administrador automaticamente.
 * Demais cadastros ficam sem permissão até que um admin conceda um papel.
 */
export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) redirectByRole();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redirectByRole = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    const list = (roles || []).map((r: any) => r.role);
    const isStaff = list.some((r: string) => ["admin", "gestor", "encarregado"].includes(r));
    if (isStaff) {
      localStorage.setItem("portal_user_id", uid);
      localStorage.setItem("portal_user_nome", sess.session?.user.email || "Administrador");
      localStorage.setItem("portal_perfil_acesso", "admin");
      navigate("/");
    } else {
      navigate("/portal");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      toast({ title: "Login realizado com sucesso!" });
      await redirectByRole();
    } catch (error: any) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      if (error) throw error;
      toast({
        title: "Cadastro realizado!",
        description: "Se a confirmação por e-mail estiver ativa, verifique sua caixa de entrada.",
      });
      // Tenta logar direto (caso confirmação de e-mail esteja desativada)
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (!signInErr) await redirectByRole();
    } catch (error: any) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-primary">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="mx-auto bg-primary/10 p-3 rounded-full w-16 h-16 flex items-center justify-center mb-2">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Acesso Administrativo</CardTitle>
          <CardDescription className="text-gray-500">
            Entre com seu e-mail e senha para acessar o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-su">E-mail</Label>
                  <Input id="email-su" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-su">Senha</Label>
                  <Input id="password-su" type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  O primeiro cadastro do sistema recebe acesso de administrador.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center text-sm text-gray-500">
            <Link to="/login-portal" className="text-primary font-medium hover:underline">
              Sou colaborador (entrar com CPF e PIN)
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
