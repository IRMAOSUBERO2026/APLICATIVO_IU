# Central de Blindagem e Alertas Ativos

## Objetivo
Dar destaque, no topo da tela inicial, aos riscos trabalhistas e contratuais que exigem ação.

## Entregas
- Criar um motor único de alertas para ASO, NR-6, NR-12, NR-18 e NR-35, respeitando as validades já definidas.
- Classificar documentos vencidos e os que vencem em até 7, 15 ou 30 dias.
- Alertar sobre o fim dos períodos de experiência de 30 e 90 dias.
- Alertar sobre contratos de locação ativos próximos do término.
- Exibir um painel destacado na primeira área da tela inicial, com totais por categoria e lista priorizada que leva ao módulo correto.
- Adicionar no RH o filtro “Em experiência (30/60d)” com a fase e a contagem de dias de cada funcionário.

## Regras de visualização
- Respeitar o CNPJ e a obra selecionados no sistema.
- Priorizar vencidos, depois vencimentos em 7, 15 e 30 dias.
- Não criar registros duplicados no banco; os alertas serão calculados com os dados atuais.
- Manter os módulos e alertas existentes sem removê-los.

## Detalhes técnicos
- Centralizar os cálculos em uma função pura e testável.
- Reutilizar as datas dos funcionários e dos contratos existentes.
- Implementar estados de carregamento e ausência de pendências.
- Validar os cálculos automatizados e o fluxo completo na tela inicial e no RH.
