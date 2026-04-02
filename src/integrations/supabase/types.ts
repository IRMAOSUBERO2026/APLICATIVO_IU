export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      avisos: {
        Row: {
          categoria: string
          created_at: string
          data_expiracao: string | null
          empresa_id: string | null
          funcionario_id: string | null
          id: string
          lido: boolean
          mensagem: string
          obra_id: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          data_expiracao?: string | null
          empresa_id?: string | null
          funcionario_id?: string | null
          id?: string
          lido?: boolean
          mensagem: string
          obra_id?: string | null
          tipo?: string
          titulo: string
        }
        Update: {
          categoria?: string
          created_at?: string
          data_expiracao?: string | null
          empresa_id?: string | null
          funcionario_id?: string | null
          id?: string
          lido?: boolean
          mensagem?: string
          obra_id?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avisos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      compras: {
        Row: {
          created_at: string
          data_emissao: string
          data_entrega: string | null
          data_recebimento: string | null
          empresa_id: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          nfe_chave: string | null
          nfe_numero: string | null
          numero: string
          obra_id: string | null
          observacoes: string | null
          origem: string
          parcelas: number | null
          status: string
          total: number
          updated_at: string
          xml_original: string | null
        }
        Insert: {
          created_at?: string
          data_emissao: string
          data_entrega?: string | null
          data_recebimento?: string | null
          empresa_id: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          nfe_chave?: string | null
          nfe_numero?: string | null
          numero: string
          obra_id?: string | null
          observacoes?: string | null
          origem?: string
          parcelas?: number | null
          status?: string
          total?: number
          updated_at?: string
          xml_original?: string | null
        }
        Update: {
          created_at?: string
          data_emissao?: string
          data_entrega?: string | null
          data_recebimento?: string | null
          empresa_id?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          nfe_chave?: string | null
          nfe_numero?: string | null
          numero?: string
          obra_id?: string | null
          observacoes?: string | null
          origem?: string
          parcelas?: number | null
          status?: string
          total?: number
          updated_at?: string
          xml_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_pagar: {
        Row: {
          categoria: string | null
          compra_id: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string
          descricao: string
          documento: string | null
          empresa_id: string
          forma_pagamento: string | null
          fornecedor_id: string | null
          id: string
          obra_id: string | null
          observacoes: string | null
          parcela: number | null
          status: string
          total_parcelas: number | null
          updated_at: string
          valor: number
          valor_pago: number | null
        }
        Insert: {
          categoria?: string | null
          compra_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento: string
          descricao: string
          documento?: string | null
          empresa_id: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          parcela?: number | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string
          valor: number
          valor_pago?: number | null
        }
        Update: {
          categoria?: string | null
          compra_id?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string
          descricao?: string
          documento?: string | null
          empresa_id?: string
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          parcela?: number | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string
          valor?: number
          valor_pago?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_pagar_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_pagar_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contas_receber: {
        Row: {
          categoria: string | null
          cliente: string | null
          created_at: string
          data_recebimento: string | null
          data_vencimento: string
          descricao: string
          documento: string | null
          empresa_id: string
          forma_recebimento: string | null
          id: string
          obra_id: string | null
          observacoes: string | null
          parcela: number | null
          status: string
          total_parcelas: number | null
          updated_at: string
          valor: number
          valor_recebido: number | null
        }
        Insert: {
          categoria?: string | null
          cliente?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento: string
          descricao: string
          documento?: string | null
          empresa_id: string
          forma_recebimento?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          parcela?: number | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string
          valor: number
          valor_recebido?: number | null
        }
        Update: {
          categoria?: string | null
          cliente?: string | null
          created_at?: string
          data_recebimento?: string | null
          data_vencimento?: string
          descricao?: string
          documento?: string | null
          empresa_id?: string
          forma_recebimento?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          parcela?: number | null
          status?: string
          total_parcelas?: number | null
          updated_at?: string
          valor?: number
          valor_recebido?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contas_receber_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contas_receber_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      contratos_locacao: {
        Row: {
          cidade: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          dia_vencimento: number
          empresa_id: string
          endereco: string | null
          id: string
          locador: string
          locador_cpf_cnpj: string | null
          obra_id: string | null
          observacoes: string | null
          status: string
          tipo: string
          uf: string | null
          updated_at: string
          valor_mensal: number
        }
        Insert: {
          cidade?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao: string
          dia_vencimento?: number
          empresa_id: string
          endereco?: string | null
          id?: string
          locador: string
          locador_cpf_cnpj?: string | null
          obra_id?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Update: {
          cidade?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          dia_vencimento?: number
          empresa_id?: string
          endereco?: string | null
          id?: string
          locador?: string
          locador_cpf_cnpj?: string | null
          obra_id?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          uf?: string | null
          updated_at?: string
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "contratos_locacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratos_locacao_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      diarios_obra: {
        Row: {
          atividades_executadas: string | null
          clima: string | null
          condicoes_trabalho: string | null
          created_at: string
          data: string
          fotos: string[] | null
          id: string
          mao_de_obra_presente: number | null
          obra_id: string
          observacoes: string | null
          ocorrencias: string | null
          responsavel: string | null
          temperatura_max: number | null
          temperatura_min: number | null
          updated_at: string
        }
        Insert: {
          atividades_executadas?: string | null
          clima?: string | null
          condicoes_trabalho?: string | null
          created_at?: string
          data: string
          fotos?: string[] | null
          id?: string
          mao_de_obra_presente?: number | null
          obra_id: string
          observacoes?: string | null
          ocorrencias?: string | null
          responsavel?: string | null
          temperatura_max?: number | null
          temperatura_min?: number | null
          updated_at?: string
        }
        Update: {
          atividades_executadas?: string | null
          clima?: string | null
          condicoes_trabalho?: string | null
          created_at?: string
          data?: string
          fotos?: string[] | null
          id?: string
          mao_de_obra_presente?: number | null
          obra_id?: string
          observacoes?: string | null
          ocorrencias?: string | null
          responsavel?: string | null
          temperatura_max?: number | null
          temperatura_min?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diarios_obra_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_funcionario: {
        Row: {
          data_upload: string
          funcionario_id: string
          id: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Insert: {
          data_upload?: string
          funcionario_id: string
          id?: string
          nome_arquivo: string
          tipo: string
          url: string
        }
        Update: {
          data_upload?: string
          funcionario_id?: string
          id?: string
          nome_arquivo?: string
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_funcionario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      entregas_epi: {
        Row: {
          ca_numero: string | null
          created_at: string
          data_entrega: string
          empresa_id: string
          funcionario_id: string
          id: string
          obra_id: string | null
          observacoes: string | null
          produto_id: string
          quantidade: number
        }
        Insert: {
          ca_numero?: string | null
          created_at?: string
          data_entrega?: string
          empresa_id: string
          funcionario_id: string
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade?: number
        }
        Update: {
          ca_numero?: string | null
          created_at?: string
          data_entrega?: string
          empresa_id?: string
          funcionario_id?: string
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "entregas_epi_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epi_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epi_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_epi_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos_locados: {
        Row: {
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string
          empresa_id: string
          fornecedor_id: string | null
          id: string
          numero_oc: string | null
          obra_id: string | null
          observacoes: string | null
          quantidade: number
          status: string
          tipo: string
          tipo_contrato: string
          updated_at: string
          valor_diario: number | null
          valor_mensal: number | null
        }
        Insert: {
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao: string
          empresa_id: string
          fornecedor_id?: string | null
          id?: string
          numero_oc?: string | null
          obra_id?: string | null
          observacoes?: string | null
          quantidade?: number
          status?: string
          tipo?: string
          tipo_contrato?: string
          updated_at?: string
          valor_diario?: number | null
          valor_mensal?: number | null
        }
        Update: {
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string
          empresa_id?: string
          fornecedor_id?: string | null
          id?: string
          numero_oc?: string | null
          obra_id?: string | null
          observacoes?: string | null
          quantidade?: number
          status?: string
          tipo?: string
          tipo_contrato?: string
          updated_at?: string
          valor_diario?: number | null
          valor_mensal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_locados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_locados_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_locados_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos_proprios: {
        Row: {
          codigo: string
          created_at: string
          data_aquisicao: string | null
          descricao: string
          empresa_id: string
          id: string
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          obra_id: string | null
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          valor_aquisicao: number | null
        }
        Insert: {
          codigo: string
          created_at?: string
          data_aquisicao?: string | null
          descricao: string
          empresa_id: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          obra_id?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_aquisicao?: number | null
        }
        Update: {
          codigo?: string
          created_at?: string
          data_aquisicao?: string | null
          descricao?: string
          empresa_id?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          obra_id?: string | null
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_aquisicao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_proprios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamentos_proprios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos_agenda: {
        Row: {
          cor: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          empresa_id: string | null
          id: string
          local: string | null
          obra_id: string | null
          recorrencia_tipo: string | null
          recorrente: boolean
          responsaveis: string[] | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          local?: string | null
          obra_id?: string | null
          recorrencia_tipo?: string | null
          recorrente?: boolean
          responsaveis?: string[] | null
          tipo?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          cor?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          local?: string | null
          obra_id?: string | null
          recorrencia_tipo?: string | null
          recorrente?: boolean
          responsaveis?: string[] | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_agenda_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "eventos_agenda_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      folhas_pagamento: {
        Row: {
          ano: number
          atestados: number
          base_dia: number
          base_hora: number
          bonificacao_assiduidade: number
          bonificacao_meta: number
          created_at: string
          desconto_emprestimo: number
          desconto_faltas: number
          desconto_horas_negativas: number
          desconto_marmita: number
          desconto_vale: number
          dias_do_mes: number
          domingos_feriados_no_mes: number
          dsr_he: number
          dsr_perdido: number
          empresa_id: string
          faltas: number
          funcionario_id: string
          he_100: number
          he_sabado: number
          he_semanal: number
          horas_extras_100: number
          horas_extras_sabado: number
          horas_extras_semanais: number
          horas_negativas: number
          id: string
          mes: number
          obra_id: string
          outros_descontos: number
          salario_combinado: number
          salario_final: number
          salario_registro: number
          semanas_com_falta: number
          total_bonificacoes: number
          total_descontos: number
          total_he: number
          updated_at: string
          usar_salario_sindicato_para_he: boolean
          valor_atestados: number
        }
        Insert: {
          ano: number
          atestados?: number
          base_dia?: number
          base_hora?: number
          bonificacao_assiduidade?: number
          bonificacao_meta?: number
          created_at?: string
          desconto_emprestimo?: number
          desconto_faltas?: number
          desconto_horas_negativas?: number
          desconto_marmita?: number
          desconto_vale?: number
          dias_do_mes?: number
          domingos_feriados_no_mes?: number
          dsr_he?: number
          dsr_perdido?: number
          empresa_id: string
          faltas?: number
          funcionario_id: string
          he_100?: number
          he_sabado?: number
          he_semanal?: number
          horas_extras_100?: number
          horas_extras_sabado?: number
          horas_extras_semanais?: number
          horas_negativas?: number
          id?: string
          mes: number
          obra_id: string
          outros_descontos?: number
          salario_combinado?: number
          salario_final?: number
          salario_registro?: number
          semanas_com_falta?: number
          total_bonificacoes?: number
          total_descontos?: number
          total_he?: number
          updated_at?: string
          usar_salario_sindicato_para_he?: boolean
          valor_atestados?: number
        }
        Update: {
          ano?: number
          atestados?: number
          base_dia?: number
          base_hora?: number
          bonificacao_assiduidade?: number
          bonificacao_meta?: number
          created_at?: string
          desconto_emprestimo?: number
          desconto_faltas?: number
          desconto_horas_negativas?: number
          desconto_marmita?: number
          desconto_vale?: number
          dias_do_mes?: number
          domingos_feriados_no_mes?: number
          dsr_he?: number
          dsr_perdido?: number
          empresa_id?: string
          faltas?: number
          funcionario_id?: string
          he_100?: number
          he_sabado?: number
          he_semanal?: number
          horas_extras_100?: number
          horas_extras_sabado?: number
          horas_extras_semanais?: number
          horas_negativas?: number
          id?: string
          mes?: number
          obra_id?: string
          outros_descontos?: number
          salario_combinado?: number
          salario_final?: number
          salario_registro?: number
          semanas_com_falta?: number
          total_bonificacoes?: number
          total_descontos?: number
          total_he?: number
          updated_at?: string
          usar_salario_sindicato_para_he?: boolean
          valor_atestados?: number
        }
        Relationships: [
          {
            foreignKeyName: "folhas_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_pagamento_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folhas_pagamento_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          ativo: boolean
          cep: string | null
          cidade: string | null
          cnpj: string | null
          contato: string | null
          cpf: string | null
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          inscricao_estadual: string | null
          nome_fantasia: string | null
          observacoes: string | null
          razao_social: string
          telefone: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_fantasia?: string | null
          observacoes?: string | null
          razao_social?: string
          telefone?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          cargo: string
          categoria_cnh: string | null
          cep: string | null
          cidade: string | null
          clinica_aso: string | null
          cnh: string | null
          codigo_pix: string | null
          conta: string | null
          cpf: string
          created_at: string
          ctps: string | null
          data_admissao: string
          data_aso: string | null
          data_entrada_pais: string | null
          data_nascimento: string | null
          data_nr12: string | null
          data_nr18: string | null
          data_nr35: string | null
          data_nr6: string | null
          data_rescisao: string | null
          dependentes: number | null
          dependentes_json: Json | null
          email: string | null
          empresa_id: string
          endereco: string | null
          escolaridade: string | null
          estado_civil: string | null
          foto_url: string | null
          id: string
          motivo_rescisao: string | null
          nacionalidade: string | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          numero_registro: string | null
          obra_id: string | null
          pis: string | null
          rg: string | null
          rne: string | null
          salario_base: number
          salario_combinado: number | null
          secao_eleitoral: string | null
          serie_ctps: string | null
          status: string
          telefone: string | null
          tipo_conta: string | null
          titulo_eleitor: string | null
          uf: string | null
          updated_at: string
          validade_cnh: string | null
          zona_eleitoral: string | null
        }
        Insert: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cargo: string
          categoria_cnh?: string | null
          cep?: string | null
          cidade?: string | null
          clinica_aso?: string | null
          cnh?: string | null
          codigo_pix?: string | null
          conta?: string | null
          cpf: string
          created_at?: string
          ctps?: string | null
          data_admissao: string
          data_aso?: string | null
          data_entrada_pais?: string | null
          data_nascimento?: string | null
          data_nr12?: string | null
          data_nr18?: string | null
          data_nr35?: string | null
          data_nr6?: string | null
          data_rescisao?: string | null
          dependentes?: number | null
          dependentes_json?: Json | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          id?: string
          motivo_rescisao?: string | null
          nacionalidade?: string | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero_registro?: string | null
          obra_id?: string | null
          pis?: string | null
          rg?: string | null
          rne?: string | null
          salario_base?: number
          salario_combinado?: number | null
          secao_eleitoral?: string | null
          serie_ctps?: string | null
          status?: string
          telefone?: string | null
          tipo_conta?: string | null
          titulo_eleitor?: string | null
          uf?: string | null
          updated_at?: string
          validade_cnh?: string | null
          zona_eleitoral?: string | null
        }
        Update: {
          agencia?: string | null
          bairro?: string | null
          banco?: string | null
          cargo?: string
          categoria_cnh?: string | null
          cep?: string | null
          cidade?: string | null
          clinica_aso?: string | null
          cnh?: string | null
          codigo_pix?: string | null
          conta?: string | null
          cpf?: string
          created_at?: string
          ctps?: string | null
          data_admissao?: string
          data_aso?: string | null
          data_entrada_pais?: string | null
          data_nascimento?: string | null
          data_nr12?: string | null
          data_nr18?: string | null
          data_nr35?: string | null
          data_nr6?: string | null
          data_rescisao?: string | null
          dependentes?: number | null
          dependentes_json?: Json | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          escolaridade?: string | null
          estado_civil?: string | null
          foto_url?: string | null
          id?: string
          motivo_rescisao?: string | null
          nacionalidade?: string | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          numero_registro?: string | null
          obra_id?: string | null
          pis?: string | null
          rg?: string | null
          rne?: string | null
          salario_base?: number
          salario_combinado?: number | null
          secao_eleitoral?: string | null
          serie_ctps?: string | null
          status?: string
          telefone?: string | null
          tipo_conta?: string | null
          titulo_eleitor?: string | null
          uf?: string | null
          updated_at?: string
          validade_cnh?: string | null
          zona_eleitoral?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "funcionarios_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funcionarios_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_compra: {
        Row: {
          categoria: string | null
          cfop: string | null
          compra_id: string
          descricao: string
          id: string
          ncm: string | null
          quantidade: number
          subtotal: number
          unidade: string
          valor_unitario: number
        }
        Insert: {
          categoria?: string | null
          cfop?: string | null
          compra_id: string
          descricao: string
          id?: string
          ncm?: string | null
          quantidade?: number
          subtotal?: number
          unidade?: string
          valor_unitario?: number
        }
        Update: {
          categoria?: string | null
          cfop?: string | null
          compra_id?: string
          descricao?: string
          id?: string
          ncm?: string | null
          quantidade?: number
          subtotal?: number
          unidade?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_compra_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes_equipamento: {
        Row: {
          created_at: string
          data_realizacao: string | null
          data_solicitacao: string
          descricao: string
          empresa_id: string
          equipamento_id: string
          fornecedor: string | null
          id: string
          observacoes: string | null
          status: string
          tipo: string
          updated_at: string
          valor_aprovado: number | null
          valor_orcamento: number | null
        }
        Insert: {
          created_at?: string
          data_realizacao?: string | null
          data_solicitacao?: string
          descricao: string
          empresa_id: string
          equipamento_id: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_aprovado?: number | null
          valor_orcamento?: number | null
        }
        Update: {
          created_at?: string
          data_realizacao?: string | null
          data_solicitacao?: string
          descricao?: string
          empresa_id?: string
          equipamento_id?: string
          fornecedor?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_aprovado?: number | null
          valor_orcamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_equipamento_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos_proprios"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_boletim_itens: {
        Row: {
          contrato_item_id: string
          id: string
          medicao_id: string
          modo_lancamento: string
          observacoes: string | null
          percentual_medido: number
          quantidade_medida: number
          valor_medido: number
        }
        Insert: {
          contrato_item_id: string
          id?: string
          medicao_id: string
          modo_lancamento?: string
          observacoes?: string | null
          percentual_medido?: number
          quantidade_medida?: number
          valor_medido?: number
        }
        Update: {
          contrato_item_id?: string
          id?: string
          medicao_id?: string
          modo_lancamento?: string
          observacoes?: string | null
          percentual_medido?: number
          quantidade_medida?: number
          valor_medido?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicao_boletim_itens_contrato_item_id_fkey"
            columns: ["contrato_item_id"]
            isOneToOne: false
            referencedRelation: "medicao_contrato_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicao_boletim_itens_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_contrato_itens: {
        Row: {
          aditivo_data: string | null
          aditivo_numero: number | null
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          is_aditivo: boolean
          item_numero: string
          obra_id: string
          observacoes: string | null
          quantidade: number
          unidade: string
          updated_at: string
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          aditivo_data?: string | null
          aditivo_numero?: number | null
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          is_aditivo?: boolean
          item_numero: string
          obra_id: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Update: {
          aditivo_data?: string | null
          aditivo_numero?: number | null
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          is_aditivo?: boolean
          item_numero?: string
          obra_id?: string
          observacoes?: string | null
          quantidade?: number
          unidade?: string
          updated_at?: string
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicao_contrato_itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicao_contrato_itens_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_reajustes: {
        Row: {
          created_at: string
          data_aplicacao: string
          empresa_id: string
          id: string
          motivo: string | null
          obra_id: string
          observacoes: string | null
          percentual: number
          tipo: string
        }
        Insert: {
          created_at?: string
          data_aplicacao: string
          empresa_id: string
          id?: string
          motivo?: string | null
          obra_id: string
          observacoes?: string | null
          percentual?: number
          tipo?: string
        }
        Update: {
          created_at?: string
          data_aplicacao?: string
          empresa_id?: string
          id?: string
          motivo?: string | null
          obra_id?: string
          observacoes?: string | null
          percentual?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicao_reajustes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicao_reajustes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      medicao_retencoes_impostos: {
        Row: {
          aliquota: number
          id: string
          imposto: string
          medicao_id: string
          observacoes: string | null
          valor: number
        }
        Insert: {
          aliquota?: number
          id?: string
          imposto: string
          medicao_id: string
          observacoes?: string | null
          valor?: number
        }
        Update: {
          aliquota?: number
          id?: string
          imposto?: string
          medicao_id?: string
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicao_retencoes_impostos_medicao_id_fkey"
            columns: ["medicao_id"]
            isOneToOne: false
            referencedRelation: "medicoes"
            referencedColumns: ["id"]
          },
        ]
      }
      medicoes: {
        Row: {
          created_at: string
          data_emissao: string
          empresa_id: string
          id: string
          numero: number
          obra_id: string
          observacoes: string | null
          percentual_retencao: number
          periodo_fim: string
          periodo_inicio: string
          status: string
          updated_at: string
          valor_bruto: number
          valor_liquido: number
          valor_retencao: number
        }
        Insert: {
          created_at?: string
          data_emissao?: string
          empresa_id: string
          id?: string
          numero: number
          obra_id: string
          observacoes?: string | null
          percentual_retencao?: number
          periodo_fim: string
          periodo_inicio: string
          status?: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
          valor_retencao?: number
        }
        Update: {
          created_at?: string
          data_emissao?: string
          empresa_id?: string
          id?: string
          numero?: number
          obra_id?: string
          observacoes?: string | null
          percentual_retencao?: number
          periodo_fim?: string
          periodo_inicio?: string
          status?: string
          updated_at?: string
          valor_bruto?: number
          valor_liquido?: number
          valor_retencao?: number
        }
        Relationships: [
          {
            foreignKeyName: "medicoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medicoes_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_internas: {
        Row: {
          anexo_url: string | null
          conteudo: string
          created_at: string
          destinatario_id: string | null
          destinatario_tipo: string
          id: string
          lida: boolean
          obra_id: string | null
          remetente: string
        }
        Insert: {
          anexo_url?: string | null
          conteudo: string
          created_at?: string
          destinatario_id?: string | null
          destinatario_tipo?: string
          id?: string
          lida?: boolean
          obra_id?: string | null
          remetente: string
        }
        Update: {
          anexo_url?: string | null
          conteudo?: string
          created_at?: string
          destinatario_id?: string | null
          destinatario_tipo?: string
          id?: string
          lida?: boolean
          obra_id?: string | null
          remetente?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_internas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes_estoque: {
        Row: {
          compra_id: string | null
          created_at: string
          data_movimentacao: string
          documento: string | null
          id: string
          obra_id: string | null
          observacoes: string | null
          produto_id: string
          quantidade: number
          tipo: string
          valor_unitario: number | null
        }
        Insert: {
          compra_id?: string | null
          created_at?: string
          data_movimentacao?: string
          documento?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          produto_id: string
          quantidade: number
          tipo: string
          valor_unitario?: number | null
        }
        Update: {
          compra_id?: string | null
          created_at?: string
          data_movimentacao?: string
          documento?: string | null
          id?: string
          obra_id?: string | null
          observacoes?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_compra_id_fkey"
            columns: ["compra_id"]
            isOneToOne: false
            referencedRelation: "compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      obras: {
        Row: {
          cidade: string | null
          cliente: string | null
          codigo: string
          construtora: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string | null
          data_previsao_fim: string | null
          empresa_id: string
          endereco: string | null
          engenheiro_responsavel: string | null
          horario_padrao: Json | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          tipo_obra: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          cidade?: string | null
          cliente?: string | null
          codigo: string
          construtora?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          empresa_id: string
          endereco?: string | null
          engenheiro_responsavel?: string | null
          horario_padrao?: Json | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          tipo_obra?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          cidade?: string | null
          cliente?: string | null
          codigo?: string
          construtora?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string | null
          data_previsao_fim?: string | null
          empresa_id?: string
          endereco?: string | null
          engenheiro_responsavel?: string | null
          horario_padrao?: Json | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          tipo_obra?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          atividade: string
          custo_equipamento: number
          custo_mao_obra: number
          custo_material: number
          custo_unitario_total: number
          descricao: string | null
          id: string
          observacoes: string | null
          orcamento_id: string
          quantidade: number
          unidade: string
          valor_total: number
        }
        Insert: {
          atividade: string
          custo_equipamento?: number
          custo_mao_obra?: number
          custo_material?: number
          custo_unitario_total?: number
          descricao?: string | null
          id?: string
          observacoes?: string | null
          orcamento_id: string
          quantidade?: number
          unidade?: string
          valor_total?: number
        }
        Update: {
          atividade?: string
          custo_equipamento?: number
          custo_mao_obra?: number
          custo_material?: number
          custo_unitario_total?: number
          descricao?: string | null
          id?: string
          observacoes?: string | null
          orcamento_id?: string
          quantidade?: number
          unidade?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          created_at: string
          custo_total: number
          empresa_id: string
          id: string
          lucro_previsto: number
          margem_percentual: number
          nome: string
          obra_id: string
          observacoes: string | null
          preco_final: number
          status: string
          updated_at: string
          versao: number
        }
        Insert: {
          created_at?: string
          custo_total?: number
          empresa_id: string
          id?: string
          lucro_previsto?: number
          margem_percentual?: number
          nome?: string
          obra_id: string
          observacoes?: string | null
          preco_final?: number
          status?: string
          updated_at?: string
          versao?: number
        }
        Update: {
          created_at?: string
          custo_total?: number
          empresa_id?: string
          id?: string
          lucro_previsto?: number
          margem_percentual?: number
          nome?: string
          obra_id?: string
          observacoes?: string | null
          preco_final?: number
          status?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orcamentos_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          categoria: string | null
          codigo: string | null
          created_at: string
          descricao: string
          estoque_minimo: number | null
          id: string
          ncm: string | null
          unidade: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao: string
          estoque_minimo?: number | null
          id?: string
          ncm?: string | null
          unidade?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          descricao?: string
          estoque_minimo?: number | null
          id?: string
          ncm?: string | null
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      servicos_extras: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          justificativa: string | null
          obra_id: string
          status: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          justificativa?: string | null
          obra_id: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          justificativa?: string | null
          obra_id?: string
          status?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "servicos_extras_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "servicos_extras_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_compra_equipamento: {
        Row: {
          created_at: string
          descricao: string
          empresa_id: string
          id: string
          marca: string | null
          modelo: string | null
          obra_id: string | null
          observacoes: string | null
          quantidade: number
          solicitante: string | null
          status: string
          tipo: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          empresa_id: string
          id?: string
          marca?: string | null
          modelo?: string | null
          obra_id?: string | null
          observacoes?: string | null
          quantidade?: number
          solicitante?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          empresa_id?: string
          id?: string
          marca?: string | null
          modelo?: string | null
          obra_id?: string | null
          observacoes?: string | null
          quantidade?: number
          solicitante?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_compra_equipamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_compra_equipamento_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes_exame: {
        Row: {
          created_at: string
          data_realizado: string | null
          data_solicitacao: string
          empresa_id: string
          exame_preco_id: string | null
          fornecedor_id: string | null
          funcionario_id: string
          id: string
          observacoes: string | null
          status: string
          tipo_exame: string
          updated_at: string
          valor: number
        }
        Insert: {
          created_at?: string
          data_realizado?: string | null
          data_solicitacao?: string
          empresa_id: string
          exame_preco_id?: string | null
          fornecedor_id?: string | null
          funcionario_id: string
          id?: string
          observacoes?: string | null
          status?: string
          tipo_exame: string
          updated_at?: string
          valor?: number
        }
        Update: {
          created_at?: string
          data_realizado?: string | null
          data_solicitacao?: string
          empresa_id?: string
          exame_preco_id?: string | null
          fornecedor_id?: string | null
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          status?: string
          tipo_exame?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_exame_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_exame_exame_preco_id_fkey"
            columns: ["exame_preco_id"]
            isOneToOne: false
            referencedRelation: "tabela_precos_exames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_exame_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_exame_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_precos_exames: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          fornecedor_id: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          valor: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tabela_precos_exames_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefa_comentarios: {
        Row: {
          autor: string
          conteudo: string
          created_at: string
          id: string
          tarefa_id: string
        }
        Insert: {
          autor: string
          conteudo: string
          created_at?: string
          id?: string
          tarefa_id: string
        }
        Update: {
          autor?: string
          conteudo?: string
          created_at?: string
          id?: string
          tarefa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefa_comentarios_tarefa_id_fkey"
            columns: ["tarefa_id"]
            isOneToOne: false
            referencedRelation: "tarefas"
            referencedColumns: ["id"]
          },
        ]
      }
      tarefas: {
        Row: {
          anexos: string[] | null
          atribuido_para: string | null
          created_at: string
          data_limite: string | null
          descricao: string | null
          empresa_id: string | null
          funcionario_id: string | null
          id: string
          obra_id: string | null
          prioridade: string
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          anexos?: string[] | null
          atribuido_para?: string | null
          created_at?: string
          data_limite?: string | null
          descricao?: string | null
          empresa_id?: string | null
          funcionario_id?: string | null
          id?: string
          obra_id?: string | null
          prioridade?: string
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          anexos?: string[] | null
          atribuido_para?: string | null
          created_at?: string
          data_limite?: string | null
          descricao?: string | null
          empresa_id?: string | null
          funcionario_id?: string | null
          id?: string
          obra_id?: string | null
          prioridade?: string
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_atribuido_para_fkey"
            columns: ["atribuido_para"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tarefas_obra_id_fkey"
            columns: ["obra_id"]
            isOneToOne: false
            referencedRelation: "obras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
