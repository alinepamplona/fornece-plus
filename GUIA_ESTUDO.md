# Guia de estudo — AC 2: Autenticação e notas fiscais

Este é um guia local para estudar e apresentar a AC 2 do Fornece+. A AC 1 já entregou o cadastro de fornecedores; a AC 2 usa esses fornecedores para controlar quem acessa o sistema e para registrar notas fiscais.

## 1. Objetivo da AC 2

A AC 2 permite registrar notas fiscais vinculadas a fornecedores, com controle de acesso.

Cada nota possui:

- fornecedor;
- número da nota;
- valor;
- vencimento;
- status inicial `Pendente`.

Existem dois tipos de usuário:

| Usuário | Login | O que pode fazer |
| --- | --- | --- |
| Administrador | `admin` / `admin` | Cadastrar fornecedores, consultar fornecedores e gerenciar todas as notas. |
| Fornecedor | Código como `10001` / mesma senha `10001` | Consultar e cadastrar apenas as próprias notas. |

> As senhas padrão são apenas para a demonstração acadêmica. Uma troca de senha pode ser criada em uma etapa futura.

## 2. Fluxo completo da aplicação

```text
Pessoa abre o sistema
        ↓
Tela de login
        ↓
Administrador ou fornecedor é identificado
        ↓
Sessão Flask guarda o tipo de usuário
        ↓
Usuário acessa somente as telas e dados permitidos
        ↓
Nota é validada, salva no MySQL e exibida na tabela
```

O administrador entra na área de fornecedores. O fornecedor vai diretamente para a tela de notas fiscais. Esse controle evita que um fornecedor consulte ou cadastre notas para outra empresa.

## 3. Credenciais dos fornecedores

Quando o administrador cadastra um fornecedor, o sistema primeiro salva a empresa no MySQL. O banco gera o `id` automaticamente. Em seguida, o sistema calcula:

```text
código de acesso = id do fornecedor + 10000
```

Exemplos:

| ID do fornecedor | Código e senha padrão |
| --- | --- |
| 1 | `10001` |
| 2 | `10002` |
| 15 | `10015` |

O código aparece na tabela de fornecedores para o administrador. A senha não é salva em texto puro: o Flask cria um hash com `generate_password_hash`. No login, `check_password_hash` compara a senha informada com o hash salvo.

Fornecedores que já existiam antes da autenticação receberam código e hash de senha padrão quando a aplicação foi iniciada após a migração.

## 4. Banco de dados

### Tabela `fornecedores`

Além dos campos da AC 1, ela possui:

| Campo | Uso |
| --- | --- |
| `codigo_acesso` | Login numérico único do fornecedor. |
| `senha_hash` | Hash da senha; a senha original não fica salva. |

### Tabela `notas_fiscais`

| Campo | Uso |
| --- | --- |
| `id` | Identificador automático da nota. |
| `fornecedor_id` | Liga a nota ao fornecedor. |
| `numero` | Número da nota fiscal. |
| `valor` | Valor monetário com duas casas decimais. |
| `vencimento` | Data limite para pagamento. |
| `status` | Começa como `Pendente`. |

Relação entre as tabelas:

```text
fornecedores (1) -------- (muitas) notas_fiscais
```

A chave estrangeira impede notas para fornecedores inexistentes. A combinação de fornecedor e número da nota é única, impedindo duplicidade para a mesma empresa.

## 5. Back-end: Flask

O arquivo `app.py` reúne as rotas e as regras da aplicação.

### Login e sessão

`POST /api/login` recebe login e senha.

- Se receber `admin` / `admin`, cria uma sessão de administrador.
- Se receber um código de fornecedor e a senha correta, cria uma sessão com o `fornecedor_id`.

A sessão permite saber quem está usando o sistema em cada requisição. As funções `login_necessario` e `admin_necessario` protegem as rotas.

`POST /api/logout` apaga a sessão e devolve a pessoa para a tela de login.

### Permissões

| Rota | Administrador | Fornecedor |
| --- | --- | --- |
| `/` | Pode acessar. | É redirecionado. |
| `/notas-fiscais` | Vê todas as notas e seleciona fornecedor. | Vê somente as próprias notas. |
| `/api/fornecedores` | Pode consultar e cadastrar. | Recebe erro `403`. |
| `/api/notas-fiscais` | Consulta e cadastra para qualquer fornecedor. | Consulta e cadastra apenas para si. |

Mesmo que um fornecedor tente alterar dados pelo navegador, o Flask substitui o `fornecedor_id` enviado pelo ID salvo na sessão. Essa validação no back-end é a parte mais importante da proteção.

### Validação de nota fiscal

A função `validar_nota_fiscal()` verifica:

1. fornecedor válido;
2. número da nota preenchido, com no máximo 50 caracteres;
3. valor numérico e maior que zero;
4. data de vencimento válida.

O valor é convertido para `Decimal`, adequado para valores financeiros. As inserções usam consultas parametrizadas, o que ajuda a evitar SQL Injection.

## 6. Front-end

O projeto possui três telas HTML:

| Tela | Finalidade |
| --- | --- |
| `login.html` | Recebe login e senha. |
| `index.html` | Área do administrador para fornecedores. |
| `notas_fiscais.html` | Cadastro e consulta de notas. |

Os scripts também foram separados:

- `login.js`: envia o login e redireciona conforme o tipo de usuário.
- `script.js`: cuida do cadastro de fornecedores na área administrativa.
- `notas.js`: cadastra e lista notas fiscais.

Na tela de notas, o seletor de fornecedor só aparece para o administrador. O fornecedor não vê esse campo porque a nota já será vinculada automaticamente ao seu próprio cadastro.

## 7. Roteiro para o vídeo da AC 2

1. Execute `python app.py` e abra `http://127.0.0.1:5000`.
2. Entre como administrador com `admin` / `admin`.
3. Cadastre um fornecedor fictício e mostre o login/senha padrão exibidos, por exemplo `10008`.
4. Abra **Notas fiscais**.
5. Selecione o fornecedor, informe `NF-001`, valor `1500.00` e um vencimento futuro.
6. Cadastre a nota e mostre a mensagem de sucesso e a linha com `R$ 1.500,00` e status `Pendente`.
7. Saia do sistema.
8. Entre usando o código do fornecedor como login e senha.
9. Mostre que a tela não permite escolher fornecedor e exibe somente as notas daquela empresa.

## 8. Configuração importante

O arquivo `.env` é local e não vai para o Git. Ele deve conter as credenciais do MySQL e estas configurações de autenticação:

```env
FLASK_SECRET_KEY=uma-chave-local-secreta
ADMIN_LOGIN=admin
ADMIN_PASSWORD=admin
```

Para bancos criados antes da autenticação, o arquivo `database/migracao_autenticacao.sql` adiciona as duas novas colunas. Ele deve ser executado apenas uma vez.

## 9. Próximas etapas

Na AC 3, `modo_status` guarda a escolha Automático, Pendente, Vencida ou Paga. No modo automático, o Flask calcula o status na consulta usando o vencimento. `data_pagamento` registra quando a nota foi paga. Somente o administrador altera esses dados; sair de Paga exige confirmação e limpa a data.

- AC 3 implementada: status manual ou automático e data do pagamento integral.
- AC 4: exibir totais pagos, pendentes e despesas por fornecedor.

## 10. Anexo PDF da nota fiscal

O anexo é opcional e aceita somente PDF de até 5 MB. O arquivo não fica dentro do MySQL: ele é salvo na pasta local `uploads/notas_fiscais`, enquanto a tabela guarda apenas o nome único do arquivo.

Quando uma nota possui anexo, a tabela apresenta três ações: **Ver PDF**, **Substituir** e **Remover**. Substituir grava o novo PDF antes de apagar o antigo. Remover apaga apenas o PDF, mantendo os dados da nota fiscal.

As permissões seguem a sessão: o administrador pode gerenciar qualquer anexo; o fornecedor só pode abrir, substituir ou remover anexos de notas vinculadas a ele.

