# Fornece+

Projeto acadêmico para controle de fornecedores e notas fiscais.

## Tecnologias

- Python 3 e Flask
- MySQL com `mysql-connector-python`
- HTML, CSS e JavaScript puro
- `python-dotenv`

## AC 1 — Cadastro e consulta de fornecedores

### Objetivo

Permitir o cadastro e a consulta de fornecedores pela empresa administradora.

### Funcionalidades entregues

- Cadastro com nome da empresa, CNPJ, e-mail e telefone.
- Nome e CNPJ obrigatórios.
- Validação de CNPJ no navegador e no Flask.
- CNPJ único no MySQL, impedindo fornecedores duplicados.
- Mensagens claras de sucesso e erro.
- Consulta dos fornecedores em tabela.
- Persistência no MySQL.

### Teste da AC 1

1. Acesse a tela pública de cadastro de fornecedor.
2. Informe uma empresa fictícia e um CNPJ válido, como `11.222.333/0001-81`.
3. Confirme a mensagem de sucesso.
4. Tente usar o mesmo CNPJ novamente e confirme a mensagem de duplicidade.
5. Entre como administrador para consultar o fornecedor na tabela.

## AC 2 — Autenticação e notas fiscais

### Objetivo

Permitir o registro de notas fiscais vinculadas a fornecedores, com acesso separado para administrador e fornecedor.

### Cadastro público de fornecedor

O fornecedor realiza o próprio cadastro antes de acessar o sistema. Após salvar, a página mostra:

```text
Fornecedor cadastrado com sucesso.
Login: 10001 | Senha: 10001
```

O código é calculado a partir do ID do fornecedor (`id + 10000`) e a senha padrão é igual ao código. A senha é armazenada como hash no banco de dados.

### Tipos de acesso

| Usuário | Login | Senha | Permissões |
| --- | --- | --- | --- |
| Administrador | `admin` | `admin` | Consulta fornecedores e gerencia todas as notas fiscais. |
| Fornecedor | Código exibido no cadastro | Mesmo código | Cadastra e consulta somente as próprias notas. |

### Notas fiscais

Cada nota possui fornecedor, número, valor, vencimento e status inicial `Pendente`.

- O administrador escolhe o fornecedor ao cadastrar uma nota.
- O fornecedor não vê essa seleção: a aplicação vincula a nota automaticamente à conta dele.
- A tabela é atualizada após o cadastro.
- Uma nota não pode repetir o mesmo número para o mesmo fornecedor.

### Teste da AC 2

1. Cadastre um fornecedor pela página pública e anote o login/senha exibidos.
2. Entre como administrador usando `admin` / `admin`.
3. Abra **Notas fiscais** e cadastre uma nota de `R$ 1.500,00` para o fornecedor criado.
4. Confira a mensagem de sucesso e a nota na tabela com status `Pendente`.
5. Saia do sistema e entre como fornecedor com o código exibido.
6. Confirme que ele vê apenas as próprias notas e não acessa a área administrativa.

## Instalação e configuração

1. Crie e ative o ambiente virtual:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

2. Instale as dependências:

   ```powershell
   pip install -r requirements.txt
   ```

3. Copie `.env.example` para `.env` e informe as credenciais reais do MySQL. Para a demonstração, mantenha:

   ```env
   FLASK_SECRET_KEY=uma-chave-local-secreta
   ADMIN_LOGIN=admin
   ADMIN_PASSWORD=admin
   ```

4. Em uma instalação nova, execute `database/schema.sql` no MySQL.

5. Para um banco criado antes da autenticação, execute apenas uma vez:

   ```powershell
   mysql -u SEU_USUARIO -p < database/migracao_autenticacao.sql
   ```

## Executar

```powershell
python app.py
```

Abra `http://127.0.0.1:5000`. A aplicação redireciona para a tela de login; o cadastro público está disponível em `/cadastro-fornecedor`.

## Próximas etapas

- AC 3: registrar pagamentos e atualizar o status das notas.
- AC 4: dashboard financeiro com totais e despesas por fornecedor.

