## Problema
Ao salvar o Pré-Cadastro, o PostgREST do Supabase externo (`wtrefsziscauokudnxgz`) responde:

> Could not find the 'carteira_reservista' column of 'funcionarios' in the schema cache

O código em `src/components/rh/PreCadastroForm.tsx` envia `carteira_reservista: form.reservista`, mas essa coluna não existe na tabela `funcionarios` do projeto externo (ou não foi exposta ao PostgREST). Como o app aponta para um Supabase externo, não posso migrar o schema via Lovable Cloud a partir daqui.

## Correção (somente frontend)
Aplicar o mesmo padrão de fallback já usado para `bonificacoes_padrao` em `src/lib/bonificacoesPadrao.ts`, agora também para `carteira_reservista`:

1. Em `inserirFuncionarioComBonificacoes` (e `salvarFuncionarioComBonificacoes`):
   - Detectar erros PostgREST `PGRST204` / `42703` cuja mensagem cite `carteira_reservista` ou `schema cache`.
   - Se ocorrer, remover `carteira_reservista` do payload e reenviar. Se `reservista` tiver valor, anexá-lo em `observacoes` como um bloco marcador (`[[RESERVISTA]]...[[/RESERVISTA]]`) para não perder o dado, seguindo o padrão já existente para bonificações.
   - Combinar com o fallback de `bonificacoes_padrao` já implementado (dois passos de retry, um por coluna).

2. Extrair um helper genérico `retryWithoutMissingColumn(payload, error)` para evitar duplicação; ele:
   - Lê o nome da coluna faltante da mensagem do PostgREST.
   - Remove-a do payload.
   - Reenvia a requisição.

3. Em `PreCadastroForm.tsx`, quando ocorrer erro, exibir mensagem mais útil no toast se o retry final ainda falhar (mostrar a coluna que faltou).

## Passo opcional (recomendado, feito manualmente pelo usuário)
Adicionar a coluna no banco externo para que o campo passe a persistir de verdade:

```sql
ALTER TABLE public.funcionarios ADD COLUMN IF NOT EXISTS carteira_reservista text;
NOTIFY pgrst, 'reload schema';
```

Como o Lovable Cloud não gerencia o projeto externo, isso precisa ser executado no SQL Editor do próprio projeto `wtrefsziscauokudnxgz`. O fallback do frontend garante que o pré-cadastro funcione mesmo antes disso.

## Arquivos alterados
- `src/lib/bonificacoesPadrao.ts` — generalizar detecção/retry de coluna ausente (`carteira_reservista` + `bonificacoes_padrao`).
- `src/components/rh/PreCadastroForm.tsx` — mensagem de erro mais clara no toast final.
