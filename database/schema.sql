CREATE DATABASE IF NOT EXISTS fornece_plus
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE fornece_plus;

CREATE TABLE IF NOT EXISTS fornecedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    cnpj VARCHAR(18) NOT NULL UNIQUE,
    email VARCHAR(150),
    telefone VARCHAR(20),
    codigo_acesso INT UNIQUE,
    senha_hash VARCHAR(255),
    status ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notas_fiscais (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fornecedor_id INT NOT NULL,
    numero VARCHAR(50) NOT NULL,
    valor DECIMAL(12, 2) NOT NULL,
    vencimento DATE NOT NULL,
    arquivo_pdf VARCHAR(255),
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notas_fiscais_fornecedor
        FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id),
    CONSTRAINT uq_nota_fornecedor_numero UNIQUE (fornecedor_id, numero)
);

