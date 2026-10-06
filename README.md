# Fornece+

Projeto acadêmico para as ACs 1 e 2: fornecedores e notas fiscais.

## O que está disponível

- Cadastro de empresa, CNPJ, e-mail e telefone.
- Validação no navegador e no Flask.
- Validação dos dígitos do CNPJ e bloqueio de CNPJ duplicado.
- Consulta dos fornecedores em tabela, atualizada após o cadastro.
- Cadastro de notas fiscais vinculadas a fornecedores, com número, valor e vencimento.
- Consulta das notas fiscais em tabela, atualizada após o cadastro.
- Dados armazenados no MySQL.

## Pré-requisitos

- Python 3 instalado.
- MySQL em execução.

## Configuração

1. Abra um terminal na pasta do projeto e crie o ambiente virtual:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Instale as dependências:

   ```powershell
   pip install -r requirements.txt
   ```

3. Crie o arquivo `.env` a partir de `.env.example` e informe as credenciais do seu MySQL. Não envie esse arquivo ao GitHub.

4. Crie o banco e a tabela. No terminal, execute:

   ```powershell
   mysql -u SEU_USUARIO -p < database/schema.sql
   ```

   O script cria somente o banco e a tabela se eles ainda não existirem; ele não apaga dados existentes.

## Executar

Com o ambiente virtual ativado, execute:

```powershell
python app.py
```

Abra `http://127.0.0.1:5000` no navegador.

## Teste manual sugerido

1. Cadastre uma empresa fictícia usando um CNPJ válido, por exemplo `11.222.333/0001-81`.
2. Confirme a mensagem de sucesso e a linha na tabela.
3. Tente cadastrar o mesmo CNPJ novamente: a aplicação deve informar que ele já existe.
4. Teste um CNPJ inválido para conferir a validação.
5. Cadastre uma nota de `R$ 1.500,00` para um fornecedor já existente, preenchendo número e vencimento.
6. Confirme a mensagem de sucesso e a nota na tabela de notas fiscais.

