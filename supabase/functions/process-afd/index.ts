import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AFDBatida {
  nsr: number;
  cpf: string;
  dataHora: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const { obra_id, file_content, filename } = await req.json()

    if (!obra_id || !file_content) {
      throw new Error("obra_id e file_content são obrigatórios")
    }

    const linhas = file_content.split(/\r?\n/).filter((l: string) => l.trim().length > 0)
    
    if (linhas.length === 0) {
      throw new Error("Arquivo vazio")
    }

    const cabecalhoStr = linhas[0]
    let formato = cabecalhoStr.includes("REP_C") || cabecalhoStr.match(/\d{4}-\d{2}-\d{2}T/) ? "REP_C" : "ANTIGO"
    
    let relogioSerial = "DESCONHECIDO"
    let empresa = "NÃO IDENTIFICADA"
    const batidas: AFDBatida[] = []

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i]
      if (linha.length < 10) continue
      
      const nsrStr = linha.substring(0, 9)
      const tipo = linha.substring(9, 10)
      const nsr = parseInt(nsrStr, 10)

      if (tipo === "1") {
        if (formato === "ANTIGO") {
          empresa = linha.substring(46, 196).trim()
        }
      } 
      else if (tipo === "3") {
        if (formato === "ANTIGO") {
          const data = linha.substring(10, 18)
          const hora = linha.substring(18, 22)
          const pis = linha.substring(22, 34)
          
          if (data.length === 8 && hora.length === 4) {
            const isoData = `${data.substring(4,8)}-${data.substring(2,4)}-${data.substring(0,2)}T${hora.substring(0,2)}:${hora.substring(2,4)}:00-03:00`
            const dateObj = new Date(isoData)
            if (!isNaN(dateObj.getTime())) {
              batidas.push({ nsr, cpf: pis.replace(/\D/g, "").replace(/^0/, ""), dataHora: dateObj.toISOString() })
            }
          }
        } else {
          // REP_C
          const dateMatch = linha.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:[+-]\d{2,4})?/)
          if (dateMatch) {
            const dateStr = dateMatch[0]
            const rest = linha.substring(linha.indexOf(dateStr) + dateStr.length)
            const cpfMatch = rest.match(/\d{11,12}/)
            if (cpfMatch) {
              const dateObj = new Date(dateStr)
              if (!isNaN(dateObj.getTime())) {
                batidas.push({ nsr, cpf: cpfMatch[0].replace(/\D/g, "").replace(/^0/, ""), dataHora: dateObj.toISOString() })
              }
            }
          }
        }
      }
    }

    // Insert import record
    const { data: importacao, error: errImp } = await supabaseAdmin
      .from('afd_importacoes')
      .insert({
        nome_arquivo: filename || "upload_automatico.txt",
        obra_id,
        relogio_serial: relogioSerial,
        empresa,
        formato,
        total_registros: batidas.length,
      })
      .select('id')
      .single()

    if (errImp) throw errImp

    const importacaoId = importacao.id

    // Insert batidas in chunks
    const chunkSize = 500
    for (let i = 0; i < batidas.length; i += chunkSize) {
      const chunk = batidas.slice(i, i + chunkSize)
      const { error: errBat } = await supabaseAdmin
        .from('afd_registros_ponto')
        .insert(chunk.map(b => ({
          importacao_id: importacaoId,
          obra_id,
          nsr: b.nsr,
          cpf: b.cpf,
          data_hora: b.dataHora,
        })))
      
      if (errBat) console.error("Erro ao inserir lote de batidas:", errBat)
    }

    return new Response(JSON.stringify({ 
      success: true, 
      importacao_id: importacaoId, 
      total_processado: batidas.length 
    }), {
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
