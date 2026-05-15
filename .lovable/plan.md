## Objetivo
Garantir que a logo apareça sempre legível, sobre **fundo branco**, em todos os PDFs gerados — com prioridade na Ficha de EPI — e padronizar o cabeçalho/marca d'água em todos os geradores.

## Diagnóstico
Hoje, em `src/lib/pdfBrand.ts` (usado por Ficha EPI, Recibo, Orçamento, PDF Oficial), a logo é desenhada **diretamente sobre a faixa verde** do cabeçalho usando `logo-preto.png`. Resultado: contraste fraco / quase invisível.

Além disso, há geradores que **não usam** o pdfBrand e seguem padrão antigo:
- `src/lib/diarioPdfGenerator.ts`
- `src/lib/gerarPlanilhaMedicaoPdf.ts`
- `src/lib/pdfTemplate.ts` (utilizado por `Ferias`, `Compras`, `EquipamentosProprios`, `FolhaResumoObra`, `ObraDetalhe`)

## Mudanças

### 1. `src/lib/pdfBrand.ts` — Logo em cartão branco no cabeçalho
- Em `drawHeader`, antes de `addImage` da logo, desenhar um **retângulo branco arredondado** (com leve sombra/borda hairline) atrás da logo, tanto na página 1 (tamanho maior) quanto nas páginas internas (compacto).
- Usar `logo-preto.png` por padrão (já é o ativo escuro) sobre o card branco — máximo contraste.
- Marca d'água central permanece com `logo-preto.png` em opacidade ~6%, mas será também envolvida por sutil clareamento (mantém legibilidade do texto).
- Pequeno ajuste de padding interno do card (2 mm) para a logo não encostar nas bordas.

### 2. `src/lib/gerarFichaEPIPdf.ts` — Reforço visual
- Sem mudança de layout além do que vem automaticamente do pdfBrand.
- Validar que o cabeçalho da página 1 fica com selo branco da logo + faixa verde + título "FICHA DE EPI".

### 3. Migrar geradores legados para pdfBrand
Para padronizar **todos** os PDFs com o mesmo cabeçalho/rodapé/marca d'água/logo em fundo branco:
- `src/lib/diarioPdfGenerator.ts` → substituir cabeçalho manual por `initBrandedDoc` + `sectionTitle` + `finalizeBranded`. Preservar conteúdo (atividades, fotos, assinaturas).
- `src/lib/gerarPlanilhaMedicaoPdf.ts` → idem; preservar tabela de medições e totais.
- `src/lib/pdfTemplate.ts` → reescrever a função pública para delegar ao pdfBrand mantendo a mesma assinatura (compatibilidade com Férias, Compras, Equipamentos Próprios, Folha Resumo Obra, Obra Detalhe — sem mexer nesses callers).

### 4. QA visual
Após implementar, gerar um exemplo de cada PDF (Ficha EPI, Recibo, Orçamento, Diário, Medição, Férias) e revisar via screenshot para confirmar logo visível sobre fundo branco e padrão idêntico.

## Detalhes técnicos
```text
Cabeçalho página 1:
┌────────────────────────────────────────────────┐
│ [█ faixa preta 3mm] ← topo                     │
│ ┌──────┐                                       │
│ │ LOGO │  IRMÃOS UBERO ENGENHARIA   FICHA EPI  │ ← faixa verde
│ │(white)│  CNPJ • Endereço • Contato  Emitido… │
│ └──────┘                                       │
│ ────── hairline verde escuro ──────            │
└────────────────────────────────────────────────┘
```
- Card branco: `roundedRect(x, y, w, h, 1.5, 1.5, "F")` com `setFillColor(255,255,255)` antes do `addImage`.
- Borda fina opcional `setDrawColor(BRAND.hairline)` + `setLineWidth(0.2)` + `"S"`.

## Fora de escopo
- Nenhuma alteração de regra de negócio, dados, ou conteúdo dos PDFs.
- Sem mudança em rotas, componentes de UI ou banco.