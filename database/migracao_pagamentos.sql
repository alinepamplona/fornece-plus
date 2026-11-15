-- Execute uma única vez no banco existente. Os registros são preservados.
USE fornece_plus;

ALTER TABLE notas_fiscais
    ADD COLUMN modo_status ENUM('Automatico', 'Pendente', 'Vencida', 'Paga') NOT NULL DEFAULT 'Automatico',
    ADD COLUMN data_pagamento DATE NULL;
