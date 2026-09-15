# Recibos de pagamento por obra

## Resultado
- Manter **Recibo de Pagamento** visível no Gerador Oficial, com dois modos: individual e por obra.
- No modo por obra, permitir escolher a obra e listar somente os funcionários ativos vinculados a ela.
- Permitir marcar os envolvidos e informar um valor diferente para cada pessoa.
- Usar uma referência comum do pagamento, com possibilidade de ajuste antes da geração.
- Gerar uma prévia individual para cada funcionário, sempre mostrando o valor em reais e por extenso.

## Inteligência artificial
- Oferecer a opção **Revisar texto completo com IA**.
- Enviar à IA os dados de cada recibo separadamente, mantendo nome, empresa, obra e valor como dados obrigatórios.
- Validar o texto retornado para impedir valores ausentes ou diferentes dos informados.
- Se a IA estiver indisponível, gerar automaticamente o modelo padronizado sem bloquear o lote.

## PDFs e arquivamento
- Permitir baixar, imprimir, enviar e arquivar um recibo individual.
- Permitir gerar um único PDF com todos os recibos selecionados, um por página.
- Manter cada recibo arquivado também no prontuário do respectivo funcionário.

## Interface
- Reorganizar os campos quando **Recibo de Pagamento** for selecionado: modo, obra, envolvidos, valores e referência.
- Mostrar busca, seleção de todos, total de pessoas e soma dos valores do lote.
- Exibir o andamento e os erros por funcionário sem perder os demais recibos já gerados.

## Detalhes técnicos
- Reaproveitar as funções puras de leitura monetária, valor por extenso e modelo padronizado existentes.
- Ampliar a geração de PDF para compor o arquivo consolidado sem alterar o modelo visual atual.
- Adaptar a função de documentos por IA para o recibo revisado e testar uma chamada real.
- Adicionar testes para seleção do lote, valores individualizados, validação do texto da IA e PDF consolidado.
