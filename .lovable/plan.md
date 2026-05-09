
# Migração Segura de Supabase — Backup → Transferência → Validação

## Objetivo
Mover todos os dados do banco atual em uso pelo app (`znfxvpggckayokiphglt`) para o repositor da sua conta (`uvrqntfjknojxkiwsibz`, conta `luis@irmaosubero.com`), **sem perder nenhum dado** e sem que o sistema apresente qualquer alteração de comportamento.

---

## Avaliação de risco do destino `uvrqntfjknojxkiwsibz`

Esse projeto já aparece referenciado no `supabase/config.toml` e nos scripts antigos (`corrigir_bancos.ps1`, `migrar_equipamentos.ps1`) como destino de testes. **Não temos certeza do que existe lá hoje** (pode ter dados parciais antigos, schema desatualizado, ou estar vazio).

Por segurança eu recomendo **criar um projeto novo e limpo** dentro da sua conta `luis@irmaosubero.com` — assim:
- Garantimos que nenhum dado do destino seja sobrescrito por engano.
- Schema é recriado do zero, idêntico ao atual (sem resíduos).
- Em caso de erro, o banco antigo (`znfxvpggckayokiphglt`) continua intacto e ativo — basta reverter o `.env`.

Se mesmo assim você quiser usar o `uvrqntfjknojxkiwsibz`, eu trato a primeira etapa como "destino limpo" (TRUNCATE em tudo antes de importar). Vou pedir confirmação no momento.

---

## Etapas

### Etapa 1 — Backup completo (zero risco, só leitura)
Antes de qualquer mudança, gerar e salvar localmente:

1. **Dump SQL completo** do schema + dados de todas as 30+ tabelas (`empresas`, `obras`, `funcionarios`, `folhas_pagamento`, `medicoes`, `compras`, `entregas_epi`, etc.).
2. **Export CSV por tabela** (redundância, fácil de inspecionar no Excel).
3. **Dump dos arquivos do Storage** (bucket `documentos` — fotos de funcionários, PDFs, fichas EPI, documentação mensal).
4. **Lista de usuários do Auth** (e-mails + metadata; senhas não são exportáveis, usuários precisarão usar "esqueci senha" se trocarmos de Auth).

Tudo salvo em `/mnt/documents/backup_supabase_AAAA-MM-DD/` para você baixar.

### Etapa 2 — Preparar o destino
- Você cria o projeto novo no painel do Supabase (ou confirma usar `uvrqntfjknojxkiwsibz`).
- Você me passa **SERVICE_ROLE_KEY** e **URL** do destino via secret seguro.
- Eu recrio o schema completo (todas as tabelas, RLS, função `tg_solicitacoes_diario_updated`, bucket `documentos`).

### Etapa 3 — Importar dados
- Importar tabelas em ordem de dependência (empresas → obras → funcionários → resto).
- IDs originais preservados (sem remapeamento) para não quebrar referências.
- Reupload dos arquivos do Storage mantendo a mesma estrutura de pastas.
- Validação por contagem: cada tabela deve ter o mesmo número de linhas no destino.

### Etapa 4 — Trocar o app para o novo banco
- Atualizar `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
- Atualizar `supabase/config.toml` (`project_id`).
- Regenerar `src/integrations/supabase/types.ts` para o novo projeto.
- **Banco antigo permanece intacto** como fallback por pelo menos 30 dias.

### Etapa 5 — Validação no sistema
Checklist navegando o app pós-migração:
- Login + lista de empresas/obras carrega.
- Folha de pagamento de um mês conhecido bate o valor antigo.
- Diário de obra: fotos abrem corretamente.
- Documentação mensal: PDFs antigos baixam.
- Entrega de EPI, Compras, Medições: dados visíveis.
- Edge function `resumo-diario` responde.

Só depois dessa validação consideramos a migração concluída.

---

## Plano de rollback
Se qualquer coisa falhar em qualquer etapa:
1. Reverter `.env` e `config.toml` para `znfxvpggckayokiphglt` (1 commit).
2. App volta a operar com o banco original — nenhum dado perdido, pois o original nunca foi tocado.

---

## O que preciso de você antes de começar

1. **Decisão**: criar projeto Supabase novo (recomendado) **ou** usar o `uvrqntfjknojxkiwsibz` existente?
2. Após criar/confirmar o projeto destino, fornecer via secret seguro:
   - `DEST_SUPABASE_URL`
   - `DEST_SUPABASE_SERVICE_ROLE_KEY` (encontrada em Settings → API → service_role)
   - `DEST_SUPABASE_ANON_KEY`
3. Confirmar se quer migrar também usuários do **Auth** (se houver login configurado).

Assim que aprovar este plano, começo pela **Etapa 1 (backup)** que é totalmente segura e não toca em nada.
