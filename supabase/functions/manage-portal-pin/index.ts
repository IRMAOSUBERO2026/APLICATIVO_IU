import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Create a Supabase client with the service_role key to bypass RLS and access admin APIs
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get the request data
    const { action, cpf, pin, funcionarioId } = await req.json()
    
    // Verify user authorization (only allow admins/rh to call this if we wanted, but we trust the caller has auth token)
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    // Check role from profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'admin' && profile.role !== 'rh')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403,
      })
    }

    if (!cpf || !pin || !funcionarioId) {
       return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const email = `${cpf}@irmaosubero.com`

    // Check if the auth user already exists by trying to create them
    let targetUserId = null

    // Find if user already has portal_credentials or profile mapped
    const { data: existingCreds } = await supabaseAdmin
      .from('portal_credentials')
      .select('pin_configurado')
      .eq('funcionario_id', funcionarioId)
      .single()

    // 1. Criar ou atualizar usuário no auth.users
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
    const foundUser = existingUser?.users.find(u => u.email === email)

    if (foundUser) {
      targetUserId = foundUser.id
      // Update password (PIN)
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: pin,
        email_confirm: true // Force confirmation just in case
      })
      if (updateError) throw updateError
    } else {
      // Create user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: pin,
        email_confirm: true,
      })
      if (createError) throw createError
      targetUserId = newUser.user.id
    }

    // 2. Insert or update Profile
    await supabaseAdmin.from('profiles').upsert({
      id: targetUserId,
      funcionario_id: funcionarioId,
      role: 'colaborador'
    }, { onConflict: 'id' })

    // 3. Insert or update portal_credentials
    await supabaseAdmin.from('portal_credentials').upsert({
      funcionario_id: funcionarioId,
      pin_configurado: true,
      updated_at: new Date().toISOString()
    }, { onConflict: 'funcionario_id' })

    return new Response(JSON.stringify({ success: true, message: 'PIN configurado com sucesso' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
