-- Execute este arquivo uma única vez em bancos criados antes do anexo de PDF.
ALTER TABLE notas_fiscais ADD COLUMN arquivo_pdf VARCHAR(255) AFTER vencimento;
