-- ATUALIZAÇÃO DE STATUS DAS OBRAS - IRMÃOS UBERO
-- Status: 'concluida' para Encerrada, 'em_andamento' para Ativa

-- OBRAS ENCERRADAS
UPDATE obras SET status = 'concluida', cidade = 'ITAJAI' WHERE nome ILIKE '%ATMOS SKY%';
UPDATE obras SET status = 'concluida', cidade = 'ITAPEMA' WHERE nome ILIKE '%MAISON LAFAYETTE%';
UPDATE obras SET status = 'concluida', cidade = 'ITAJAI' WHERE nome ILIKE '%JK 399%';
UPDATE obras SET status = 'concluida', cidade = 'ITAJAI' WHERE nome ILIKE '%OCEAN WIND%';
UPDATE obras SET status = 'concluida', cidade = 'ITAPEMA' WHERE nome ILIKE '%JASPE RESIDENCE%';
UPDATE obras SET status = 'concluida', cidade = 'ITAPEMA' WHERE nome ILIKE '%CELESTINA%';
UPDATE obras SET status = 'concluida', cidade = 'ITAPEMA' WHERE nome ILIKE '%CITRINO PALACE%';
UPDATE obras SET status = 'concluida', cidade = NULL WHERE nome ILIKE '%SEM OBRA%';
UPDATE obras SET status = 'concluida', cidade = NULL WHERE nome ILIKE '%COLABORADORES ANTIGOS%';

-- OBRAS ATIVAS
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%CASA ATALAIA 47%';
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%ADM%';
UPDATE obras SET status = 'em_andamento', cidade = 'PORTO BELO' WHERE nome ILIKE '%SAINT LOUIS%';
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%TERRACE 360%';
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%BRAVA OCEAN%';
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%IOS RESIDENCIAL%';
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%SURYA%';
UPDATE obras SET status = 'em_andamento', cidade = 'ITAJAI' WHERE nome ILIKE '%OYSTER%';

-- Log de Verificação
SELECT nome, status, cidade FROM obras ORDER BY status, nome;
