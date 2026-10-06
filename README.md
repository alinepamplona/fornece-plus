# Fornece+

Projeto acadêmico para cadastro de fornecedores e notas fiscais.

## Funcionalidades atuais

- Administrador cadastra e consulta fornecedores.
- Cada fornecedor recebe um código de acesso incremental e senha padrão igual ao código.
- Login único para administrador e fornecedores.
- Administrador gerencia todas as notas fiscais.
- Fornecedor consulta e cadastra somente as próprias notas fiscais.

## Credenciais de demonstração

| Tipo de acesso | Login | Senha |
| --- | --- | --- |
| Administrador | `admin` | `admin` |
| Fornecedor | Código exibido no cadastro, por exemplo `10001` | Mesmo código, por exemplo `10001` |

> As credenciais de administrador e a senha padrão dos fornecedores são temporárias, apenas para a apresentação acadêmica.

## Configuração

1. Crie e ative o ambiente virtual:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Instale as dependências:

   ```powershell
   pip install -r requirements.txt
   ```

3. Copie `.env.example` para `.env` e informe as credenciais reais do MySQL. Mantenha `ADMIN_LOGIN=admin` e `ADMIN_PASSWORD=admin` para a demonstração. Defina também uma `FLASK_SECRET_KEY` local.

4. Para uma instalação nova, execute o `database/schema.sql` no MySQL.

5. Se o banco já foi criado antes da autenticação, execute uma única vez:

   ```powershell
   mysql -u SEU_USUARIO -p < database/migracao_autenticacao.sql
   ```

   Ao iniciar a aplicação, os fornecedores já existentes receberão código e senha padrão automaticamente.

## Executar

```powershell
python app.py
```

Abra `http://127.0.0.1:5000`. A aplicação redireciona para a tela de login.

## Roteiro de teste

1. Entre como administrador com `admin` / `admin`.
2. Cadastre um fornecedor e anote o login/senha padrão exibidos.
3. Acesse **Notas fiscais** e cadastre uma nota de `R$ 1.500,00` para o fornecedor.
4. Saia e entre usando o código do fornecedor como login e senha.
5. Confira que ele vê somente as próprias notas e não acessa a tela de fornecedores.

