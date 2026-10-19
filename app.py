import hmac
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from functools import wraps

import mysql.connector
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from mysql.connector import Error, errorcode
from werkzeug.security import check_password_hash, generate_password_hash

from config import obter_configuracao_autenticacao, obter_configuracao_mysql


app = Flask(__name__)
configuracao_autenticacao = obter_configuracao_autenticacao()
app.config["SECRET_KEY"] = configuracao_autenticacao["secret_key"]


def login_necessario(funcao):
    @wraps(funcao)
    def rota_protegida(*args, **kwargs):
        if "tipo_usuario" not in session:
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Faça login para acessar esta funcionalidade."}), 401
            return redirect(url_for("login"))
        return funcao(*args, **kwargs)

    return rota_protegida


def admin_necessario(funcao):
    @wraps(funcao)
    def rota_protegida(*args, **kwargs):
        if session.get("tipo_usuario") != "admin":
            if request.path.startswith("/api/"):
                return jsonify({"erro": "Acesso permitido somente ao administrador."}), 403
            return redirect(url_for("notas_fiscais"))
        return funcao(*args, **kwargs)

    return rota_protegida


def formatar_cnpj(cnpj):
    numeros = re.sub(r"\D", "", cnpj or "")
    if len(numeros) != 14:
        return None
    return f"{numeros[:2]}.{numeros[2:5]}.{numeros[5:8]}/{numeros[8:12]}-{numeros[12:]}"


def cnpj_eh_valido(cnpj):
    numeros = re.sub(r"\D", "", cnpj or "")
    if len(numeros) != 14 or numeros == numeros[0] * 14:
        return False

    def calcular_digito(base, pesos):
        soma = sum(int(numero) * peso for numero, peso in zip(base, pesos))
        resto = soma % 11
        return "0" if resto < 2 else str(11 - resto)

    primeiro = calcular_digito(numeros[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    segundo = calcular_digito(numeros[:12] + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return numeros[-2:] == primeiro + segundo


def formatar_telefone(telefone):
    numeros = re.sub(r"\D", "", telefone or "")
    if len(numeros) != 10:
        return None
    return f"({numeros[:2]}) {numeros[2:6]}-{numeros[6:]}"


def validar_fornecedor(dados):
    nome = str(dados.get("nome", "")).strip()
    cnpj = str(dados.get("cnpj", "")).strip()
    email = str(dados.get("email", "")).strip()
    telefone = str(dados.get("telefone", "")).strip()

    if not nome:
        return None, "O nome da empresa é obrigatório."
    if len(nome) > 150:
        return None, "O nome da empresa deve ter no máximo 150 caracteres."
    if not cnpj:
        return None, "O CNPJ é obrigatório."
    if not cnpj_eh_valido(cnpj):
        return None, "Informe um CNPJ válido."
    if email and (len(email) > 150 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email)):
        return None, "Informe um e-mail válido."

    telefone_formatado = None
    if telefone:
        telefone_formatado = formatar_telefone(telefone)
        if not telefone_formatado:
            return None, "Informe o telefone no formato (XX) XXXX-XXXX."

    return {
        "nome": nome,
        "cnpj": formatar_cnpj(cnpj),
        "email": email or None,
        "telefone": telefone_formatado,
    }, None


def validar_nota_fiscal(dados):
    try:
        fornecedor_id = int(dados.get("fornecedor_id"))
    except (TypeError, ValueError):
        return None, "Selecione um fornecedor válido."

    numero = str(dados.get("numero", "")).strip()
    valor_recebido = str(dados.get("valor", "")).strip().replace(",", ".")
    vencimento = str(dados.get("vencimento", "")).strip()

    if fornecedor_id <= 0:
        return None, "Selecione um fornecedor válido."
    if not numero:
        return None, "O número da nota fiscal é obrigatório."
    if len(numero) > 50:
        return None, "O número da nota fiscal deve ter no máximo 50 caracteres."

    try:
        valor = Decimal(valor_recebido)
    except InvalidOperation:
        return None, "Informe um valor válido para a nota fiscal."

    if not valor.is_finite() or valor <= 0 or valor > Decimal("9999999999.99"):
        return None, "O valor da nota fiscal deve ser maior que zero."

    try:
        datetime.strptime(vencimento, "%Y-%m-%d")
    except ValueError:
        return None, "Informe uma data de vencimento válida."

    return {"fornecedor_id": fornecedor_id, "numero": numero, "valor": valor, "vencimento": vencimento}, None


def preparar_credenciais_existentes():
    """Cria login e senha padrão para fornecedores cadastrados antes da autenticação."""
    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor(dictionary=True)
        cursor.execute("SELECT id, codigo_acesso, senha_hash FROM fornecedores")
        for fornecedor in cursor.fetchall():
            codigo = fornecedor["codigo_acesso"] or fornecedor["id"] + 10000
            senha_hash = fornecedor["senha_hash"] or generate_password_hash(str(codigo))
            cursor.execute(
                "UPDATE fornecedores SET codigo_acesso = %s, senha_hash = %s WHERE id = %s",
                (codigo, senha_hash, fornecedor["id"]),
            )
        conexao.commit()
    except Error as erro:
        print(f"Não foi possível preparar os acessos existentes: {erro}")
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/login")
def login():
    if session.get("tipo_usuario") == "admin":
        return redirect(url_for("index"))
    if session.get("tipo_usuario") == "fornecedor":
        return redirect(url_for("notas_fiscais"))
    return render_template("login.html")


@app.route("/cadastro-fornecedor")
def cadastro_fornecedor():
    if session.get("tipo_usuario") == "admin":
        return redirect(url_for("index"))
    if session.get("tipo_usuario") == "fornecedor":
        return redirect(url_for("notas_fiscais"))
    return render_template("cadastro_fornecedor.html")


@app.route("/api/login", methods=["POST"])
def realizar_login():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie login e senha em formato JSON."}), 400

    login_informado = str(dados.get("login", "")).strip()
    senha = str(dados.get("senha", ""))
    if not login_informado or not senha:
        return jsonify({"erro": "Informe login e senha."}), 400

    if hmac.compare_digest(login_informado, configuracao_autenticacao["admin_login"]) and hmac.compare_digest(
        senha, configuracao_autenticacao["admin_password"]
    ):
        session.clear()
        session["tipo_usuario"] = "admin"
        return jsonify({"mensagem": "Login de administrador realizado.", "destino": url_for("index")})

    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nome, senha_hash FROM fornecedores WHERE codigo_acesso = %s AND status = 'Ativo'",
            (login_informado,),
        )
        fornecedor = cursor.fetchone()
        if not fornecedor or not fornecedor["senha_hash"] or not check_password_hash(fornecedor["senha_hash"], senha):
            return jsonify({"erro": "Login ou senha inválidos."}), 401

        session.clear()
        session["tipo_usuario"] = "fornecedor"
        session["fornecedor_id"] = fornecedor["id"]
        session["fornecedor_nome"] = fornecedor["nome"]
        return jsonify({"mensagem": "Login realizado.", "destino": url_for("notas_fiscais")})
    except Error:
        return jsonify({"erro": "Não foi possível realizar o login. Verifique a conexão com o banco."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/logout", methods=["POST"])
@login_necessario
def realizar_logout():
    session.clear()
    return jsonify({"mensagem": "Sessão encerrada.", "destino": url_for("login")})


@app.route("/")
@login_necessario
@admin_necessario
def index():
    return render_template("index.html")


@app.route("/notas-fiscais")
@login_necessario
def notas_fiscais():
    return render_template(
        "notas_fiscais.html",
        eh_admin=session.get("tipo_usuario") == "admin",
        fornecedor_nome=session.get("fornecedor_nome"),
    )


@app.route("/api/fornecedores", methods=["GET"])
@login_necessario
@admin_necessario
def listar_fornecedores():
    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nome, cnpj, email, telefone, codigo_acesso, status, criado_em "
            "FROM fornecedores ORDER BY nome"
        )
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify({"erro": "Não foi possível consultar o banco de dados."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


def salvar_fornecedor(fornecedor):
    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor()
        cursor.execute(
            "INSERT INTO fornecedores (nome, cnpj, email, telefone) VALUES (%s, %s, %s, %s)",
            (fornecedor["nome"], fornecedor["cnpj"], fornecedor["email"], fornecedor["telefone"]),
        )
        fornecedor_id = cursor.lastrowid
        codigo = fornecedor_id + 10000
        cursor.execute(
            "UPDATE fornecedores SET codigo_acesso = %s, senha_hash = %s WHERE id = %s",
            (codigo, generate_password_hash(str(codigo)), fornecedor_id),
        )
        conexao.commit()
        return {"mensagem": "Fornecedor cadastrado com sucesso.", "id": fornecedor_id, "credenciais": {"login": str(codigo), "senha": str(codigo)}}, 201
    except Error as erro_mysql:
        if conexao:
            conexao.rollback()
        if erro_mysql.errno == errorcode.ER_DUP_ENTRY:
            return {"erro": "Este CNPJ já está cadastrado."}, 409
        return {"erro": "Não foi possível salvar o fornecedor no banco de dados."}, 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/cadastro-fornecedor", methods=["POST"])
def cadastrar_fornecedor_publico():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados do fornecedor em formato JSON."}), 400
    fornecedor, erro = validar_fornecedor(dados)
    if erro:
        return jsonify({"erro": erro}), 400
    resposta, status = salvar_fornecedor(fornecedor)
    return jsonify(resposta), status


@app.route("/api/fornecedores", methods=["POST"])
@login_necessario
@admin_necessario
def cadastrar_fornecedor():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados do fornecedor em formato JSON."}), 400
    fornecedor, erro = validar_fornecedor(dados)
    if erro:
        return jsonify({"erro": erro}), 400
    resposta, status = salvar_fornecedor(fornecedor)
    return jsonify(resposta), status


@app.route("/api/notas-fiscais", methods=["GET"])
@login_necessario
def listar_notas_fiscais():
    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor(dictionary=True)
        consulta = (
            "SELECT n.id, n.fornecedor_id, f.nome AS fornecedor_nome, n.numero, n.valor, "
            "DATE_FORMAT(n.vencimento, '%Y-%m-%d') AS vencimento, n.status "
            "FROM notas_fiscais n INNER JOIN fornecedores f ON f.id = n.fornecedor_id"
        )
        parametros = ()
        if session.get("tipo_usuario") == "fornecedor":
            consulta += " WHERE n.fornecedor_id = %s"
            parametros = (session["fornecedor_id"],)
        consulta += " ORDER BY n.vencimento, n.id DESC"
        cursor.execute(consulta, parametros)
        notas = cursor.fetchall()
        for nota in notas:
            nota["valor"] = float(nota["valor"])
        return jsonify(notas)
    except Error:
        return jsonify({"erro": "Não foi possível consultar as notas fiscais."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/notas-fiscais", methods=["POST"])
@login_necessario
def cadastrar_nota_fiscal():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados da nota fiscal em formato JSON."}), 400

    dados_nota = dict(dados)
    if session.get("tipo_usuario") == "fornecedor":
        dados_nota["fornecedor_id"] = session["fornecedor_id"]

    nota, erro = validar_nota_fiscal(dados_nota)
    if erro:
        return jsonify({"erro": erro}), 400

    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor()
        cursor.execute("SELECT id FROM fornecedores WHERE id = %s", (nota["fornecedor_id"],))
        if not cursor.fetchone():
            return jsonify({"erro": "O fornecedor selecionado não foi encontrado."}), 404
        cursor.execute(
            "INSERT INTO notas_fiscais (fornecedor_id, numero, valor, vencimento) VALUES (%s, %s, %s, %s)",
            (nota["fornecedor_id"], nota["numero"], nota["valor"], nota["vencimento"]),
        )
        conexao.commit()
        return jsonify({"mensagem": "Nota fiscal cadastrada com sucesso.", "id": cursor.lastrowid}), 201
    except Error as erro_mysql:
        if conexao:
            conexao.rollback()
        if erro_mysql.errno == errorcode.ER_DUP_ENTRY:
            return jsonify({"erro": "Já existe uma nota com esse número para este fornecedor."}), 409
        return jsonify({"erro": "Não foi possível salvar a nota fiscal no banco de dados."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


if __name__ == "__main__":
    preparar_credenciais_existentes()
    app.run(debug=True)
