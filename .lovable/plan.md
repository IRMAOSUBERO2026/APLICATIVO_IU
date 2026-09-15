# Recibo de pagamento sem IA

## Alterações
- Ao escolher **Recibo de Pagamento**, desativar e ocultar os controles de IA.
- Exigir um valor válido e gerar o texto imediatamente por regra fixa.
- Exibir o valor em formato brasileiro (`R$ 1.234,56`) e também por extenso.
- Usar os dados do funcionário e da empresa já selecionados, além da referência informada.
- Manter impressão, PDF, WhatsApp, e-mail e arquivamento usando o mesmo conteúdo padronizado.

## Detalhes técnicos
- Centralizar a leitura do valor brasileiro e a montagem do recibo em funções puras.
- Corrigir a conversão de centavos em limites de arredondamento.
- Impedir que o recibo faça chamadas ao gerador por IA.
- Validar com testes da conversão monetária e da saída do recibo.
