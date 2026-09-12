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
    status ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

