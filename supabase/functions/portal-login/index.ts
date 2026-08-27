import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const cloudUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const cloudServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const admin = createClient(cloudUrl, cloudServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { cpf, pin } = await req.json();
    const cleanCpf = String(cpf ?? "").replace(/\D/g, "");
    const cleanPin = String(pin ?? "").trim();

    if (cleanCpf.length !== 11) return json({ error: "CPF inválido." }, 400);
    if (cleanPin.length < 4) return json({ error: "PIN inválido." }, 400);

    const maskedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

    // 1. Find employee
    const { data: func } = await admin
      .from("funcionarios")
      .select("id, nome, cargo")
      .or(`cpf.eq.${cleanCpf},cpf.eq.${maskedCpf}`)
      .maybeSingle();

    if (!func) return json({ error: "Funcionário não encontrado com este CPF." }, 404);

    // 2. Validate PIN
    const { data: cred } = await admin
      .from("portal_credentials")
      .select("pin")
      .eq("funcionario_id", func.id)
      .maybeSingle();

    if (!cred || cred.pin !== cleanPin) {
      return json({ error: "PIN incorreto ou não configurado." }, 401);
    }

    // 3. Determine access profile
    const cargo = (func.cargo || "").toLowerCase();
    const isMaster = /(diretor|administrador|admin|master|gestor|s[oó]cio|propriet)/.test(cargo);
    const { data: accessConfig } = await admin
      .from("portal_credentials")
      .select("perfil_acesso, permissoes")
      .eq("funcionario_id", func.id)
      .maybeSingle();
    const perfilSalvo = String(accessConfig?.perfil_acesso || "colaborador").toLowerCase();
    const perfil = isMaster ? "admin" : perfilSalvo === "diario" ? "diario" : "colaborador";

    const email = `${cleanCpf}@irmaosubero.com`;
    // Fresh strong password each login; returned once to the client to sign in.
    const password = `Pw-${crypto.randomUUID()}`;

    // 4. Ensure auth user exists with this password
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    let authUser = list?.users.find((u) => u.email === email);

    if (authUser) {
      await admin.auth.admin.updateUserById(authUser.id, {
        password,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr || !created?.user) {
        return json({ error: "Falha ao provisionar acesso." }, 500);
      }
      authUser = created.user;
    }

    const userId = authUser!.id;
    const roleText = isMaster ? "admin" : "colaborador";

    // 5. Ensure profile mapping
    await admin.from("profiles").upsert(
      { id: userId, funcionario_id: func.id, role: roleText },
      { onConflict: "id" },
    );

    // 6. Authoritatively set the role
    const appRole = isMaster ? "admin" : "colaborador";
    if (isMaster) {
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "admin" },
        { onConflict: "user_id,role" },
      );
    } else {
      // Not a master: never keep an admin/staff role for portal users
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("user_roles").upsert(
        { user_id: userId, role: "colaborador" },
        { onConflict: "user_id,role" },
      );
    }

    return json({
      email,
      password,
      funcionario_id: func.id,
      nome: func.nome,
      perfil,
      permissoes: accessConfig?.permissoes || [],
      role: appRole,
    });
  } catch (e) {
    return json({ error: (e as Error).message || "Erro inesperado." }, 500);
  }
});
