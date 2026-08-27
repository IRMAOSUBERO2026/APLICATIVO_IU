import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cloudClient } from "@/integrations/supabase/cloudClient";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, KeyRound, Search, Lock, Eye, Save } from "lucide-react";
import {
  MODULOS,
  GRUPOS,
  PRESETS,
  parsePermissoes,
  type ModuloKey,
} from "@/lib/permissoes";
import { getPortalUser } from "@/lib/portalAuth";
import { format } from "date-fns";

type Row = {
  id: string;
  nome: string;
  cpf: string | null;
  cargo: string | null;
  status: string | null;
  perfil_acesso: string;
  pin_configurado: boolean;
  ultimo_acesso: string | null;
  permissoes: ModuloKey[];
};

export default function Acesso() {
  const { toast } = useToast();
  const admin = getPortalUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Row | null>(null);
  const [perfil, setPerfil] = useState("colaborador");
  const [selecao, setSelecao] = useState<ModuloKey[]>([]);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [{ data: funcs, error: e1 }, { data: creds, error: e2 }] = await Promise.all([
        supabase.from("funcionarios").select("id, nome, cpf, cargo, status").order("nome"),
        cloudClient.from("portal_credentials").select("*"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;

      const mapa = new Map<string, any>();
      (creds || []).forEach((c: any) => mapa.set(c.funcionario_id, c));

      const lista: Row[] = (funcs || [])
        .filter((f: any) => (f.status || "ativo").toLowerCase() === "ativo")
        .map((f: any) => {
          const c = mapa.get(f.id);
          return {
            id: f.id,
            nome: f.nome,
            cpf: f.cpf,
            cargo: f.cargo,
            status: f.status,
            perfil_acesso: String(c?.perfil_acesso || "colaborador"),
            pin_configurado: !!c?.pin_configurado,
            ultimo_acesso: c?.ultimo_acesso || null,
            permissoes: parsePermissoes(c?.permissoes),
          };
        });
      setRows(lista);
    } catch (e: any) {
      toast({ title: "Erro ao carregar acessos", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nome.toLowerCase().includes(q) ||
        (r.cargo || "").toLowerCase().includes(q) ||
        (r.cpf || "").includes(q)
    );
  }, [rows, busca]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      admins: rows.filter((r) => r.perfil_acesso === "admin").length,
      comAcesso: rows.filter((r) => r.permissoes.length > 0 || r.perfil_acesso === "admin").length,
      semPin: rows.filter((r) => !r.pin_configurado).length,
    }),
    [rows]
  );

  function abrirEdicao(r: Row) {
    setEditando(r);
    setPerfil(r.perfil_acesso);
    setSelecao(r.permissoes);
  }

  function toggle(key: ModuloKey) {
    setSelecao((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));
  }

  async function salvar() {
    if (!editando) return;
    setSalvando(true);
    try {
      const { data: authData } = await cloudClient.auth.getUser();
      if (!authData.user) {
        throw new Error("Sua sessão administrativa expirou. Entre novamente para salvar os acessos.");
      }

      const { error } = await cloudClient.from("portal_credentials").upsert(
        {
          funcionario_id: editando.id,
          perfil_acesso: perfil,
          permissoes: perfil === "admin" ? MODULOS.map((m) => m.key) : selecao,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "funcionario_id" }
      );
      if (error) throw error;
      toast({
        title: "Acessos atualizados",
        description: `${editando.nome}: ${perfil === "admin" ? "acesso total" : `${selecao.length} módulo(s) liberado(s)`}.`,
      });
      setEditando(null);
      carregar();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  }

  if (admin && admin.perfil !== "admin") {
    return (
      <AppLayout>
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Acesso restrito
            </CardTitle>
            <CardDescription>Somente administradores podem gerenciar acessos.</CardDescription>
          </CardHeader>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" /> Motor de Gerenciamento de Acessos
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina, por colaborador, exatamente quais módulos do sistema ele pode visualizar e utilizar.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Colaboradores ativos", valor: stats.total },
            { label: "Administradores", valor: stats.admins },
            { label: "Com acesso ao ERP", valor: stats.comAcesso },
            { label: "Sem PIN configurado", valor: stats.semPin },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.valor}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="gap-3">
            <CardTitle className="text-base">Painel de acessos</CardTitle>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, cargo ou CPF..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-6 text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <div className="divide-y">
                {filtrados.map((r) => (
                  <div key={r.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {r.cargo || "—"}
                        {r.ultimo_acesso
                          ? ` • último acesso ${format(new Date(r.ultimo_acesso), "dd/MM/yyyy HH:mm")}`
                          : " • nunca acessou"}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {r.perfil_acesso === "admin" ? (
                          <Badge className="bg-primary">Acesso total (Admin)</Badge>
                        ) : r.permissoes.length === 0 ? (
                          <Badge variant="outline">Somente Portal do Colaborador</Badge>
                        ) : (
                          r.permissoes.map((k) => (
                            <Badge key={k} variant="secondary" className="font-normal">
                              {MODULOS.find((m) => m.key === k)?.label || k}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={r.pin_configurado ? "secondary" : "destructive"} className="gap-1">
                        <KeyRound className="h-3 w-3" />
                        {r.pin_configurado ? "PIN ok" : "Sem PIN"}
                      </Badge>
                      <Button size="sm" onClick={() => abrirEdicao(r)}>
                        <Eye className="h-4 w-4 mr-1" /> Gerenciar
                      </Button>
                    </div>
                  </div>
                ))}
                {filtrados.length === 0 && (
                  <p className="p-6 text-sm text-muted-foreground">Nenhum colaborador encontrado.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editando} onOpenChange={(o) => !o && setEditando(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Acessos de {editando?.nome}</DialogTitle>
            <DialogDescription>
              Marque os módulos que este colaborador pode acessar. O que não estiver marcado fica invisível no menu e bloqueado por rota.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-semibold">Administrador (acesso total)</Label>
              <p className="text-xs text-muted-foreground">Libera todos os módulos do ERP.</p>
            </div>
            <Switch
              checked={perfil === "admin"}
              onCheckedChange={(v) => setPerfil(v ? "admin" : "colaborador")}
            />
          </div>

          {perfil !== "admin" && (
            <>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Perfis prontos</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <Button
                      key={p.nome}
                      type="button"
                      variant="outline"
                      size="sm"
                      title={p.descricao}
                      onClick={() => setSelecao(p.permissoes)}
                    >
                      {p.nome}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {GRUPOS.map((grupo) => (
                  <div key={grupo}>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2">{grupo}</p>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {MODULOS.filter((m) => m.grupo === grupo).map((m) => (
                        <label
                          key={m.key}
                          className="flex items-center gap-2 rounded-md border p-2 cursor-pointer hover:bg-muted/50"
                        >
                          <Checkbox checked={selecao.includes(m.key)} onCheckedChange={() => toggle(m.key)} />
                          <span className="text-sm">{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              <Save className="h-4 w-4 mr-1" />
              {salvando ? "Salvando..." : "Salvar acessos"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
