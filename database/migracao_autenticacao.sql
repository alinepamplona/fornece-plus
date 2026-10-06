-- Execute este arquivo uma única vez para adicionar autenticação ao banco já existente.
ALTER TABLE fornecedores ADD COLUMN codigo_acesso INT UNIQUE AFTER telefone;
ALTER TABLE fornecedores ADD COLUMN senha_hash VARCHAR(255) AFTER codigo_acesso;
