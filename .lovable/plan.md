## Objetivo

Permitir cadastrar bonificações padrão por funcionário (descrição, valor, tipo Fixo Mensal ou Condicional) e usá-las para pré-preencher os campos de Meta e Assiduidade ao abrir o cálculo da folha do mês.

## Como vai funcionar (visão de uso)

1. No RH, ao cadastrar (Pré-Cadastro) ou editar um funcionário, surge a seção **"Bonificações Padrão"**:
   - Lista de bonificações com botões "+ Adicionar" e "Remover".
   - Cada linha: Descrição (texto livre, com sugestões: Assiduidade, Sem Falta, Meta, Desempenho), Valor (R$), Tipo (Fixo Mensal | Condicional).
   - Texto de ajuda: "Fixo Mensal = soma sempre. Condicional = vem pré-preenchido, mas você confirma na folha do mês."

2. Na Folha Salarial, ao abrir o cálculo de um funcionário do mês:
   - Se ainda não houver folha salva (mês em aberto), o sistema lê as bonificações padrão do funcionário e pré-preenche:
     - **Bonificação Meta** = soma das bonificações cuja descrição contém "meta" ou "desempenho".
     - **Bonificação Assiduidade** = soma das demais (Assiduidade, Sem Falta, etc.).
   - Os campos continuam editáveis. Um pequeno aviso aparece: "Pré-preenchido a partir das Bonificações Padrão do funcionário."
   - Quando a folha já estiver salva (rascunho ou fechada), mantém os valores salvos e não sobrescreve.

## Implementação técnica

### 1. Banco de dados (migration)
Adicionar coluna `bonificacoes_padrao jsonb default '[]'::jsonb` na tabela `funcionarios`. Estrutura:
```json
[
  { "descricao": "Assiduidade", "valor": 150, "tipo": "fixo" },
  { "descricao": "Meta", "valor": 200, "tipo": "condicional" }
]
```
`tipo` aceita `"fixo"` ou `"condicional"`.

### 2. RH — formulários
- **`src/components/rh/PreCadastroForm.tsx`**: adicionar nova etapa "Bonificações" (ou seção dentro de "Trabalho") com lista editável. Salvar `bonificacoes_padrao` no insert.
- **`src/components/rh/EditFuncionarioForm.tsx`**: adicionar a mesma seção, carregando do registro e salvando no update. Como o formulário atual itera sobre `FIELDS`, renderizar a seção de bonificações fora desse loop, no final do form.

Componente reutilizável: criar `src/components/rh/BonificacoesPadraoEditor.tsx` recebendo `value` (array) e `onChange`, com botão de adicionar/remover linhas.

### 3. Folha Salarial — pré-preenchimento
- **`src/pages/Folha.tsx`**:
  - No `select` de `funcionarios` (linhas 175–177), incluir `bonificacoes_padrao`.
  - Após montar `list`, para cada funcionário sem folha existente (`!existing`), calcular:
    - `meta = soma de bons cujo descricao.toLowerCase() contém "meta" ou "desempenho"`
    - `assiduidade = soma das demais`
  - Aplicar em `input.bonificacao_meta` e `input.bonificacao_assiduidade`.
  - Funcionários com folha já salva permanecem com os valores persistidos.

### 4. Tipos
- Atualizar `src/integrations/supabase/types.ts` é automático após a migration.
- Criar tipo local `BonificacaoPadrao` em `src/components/rh/types.ts` para reuso.

## Observações

- Não altera o motor de cálculo (`motorFolha.ts`) — continua somando `bonificacao_meta + bonificacao_assiduidade` como hoje.
- O usuário sempre pode editar antes de fechar o mês, conforme solicitado.
- Mantém compatibilidade com funcionários existentes (campo default `[]`).
