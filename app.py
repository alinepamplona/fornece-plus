import re

import mysql.connector
from flask import Flask, jsonify, render_template, request
from mysql.connector import Error, errorcode

from config import obter_configuracao_mysql


app = Flask(__name__)


def formatar_cnpj(cnpj):
    """Mantém apenas números e devolve o CNPJ no formato de apresentação."""
    numeros = re.sub(r"\D", "", cnpj or "")
    if len(numeros) != 14:
        return None
    return f"{numeros[:2]}.{numeros[2:5]}.{numeros[5:8]}/{numeros[8:12]}-{numeros[12:]}"


def cnpj_eh_valido(cnpj):
    """Confere o tamanho e os dois dígitos verificadores do CNPJ."""
    numeros = re.sub(r"\D", "", cnpj or "")
    if len(numeros) != 14 or numeros == numeros[0] * 14:
        return False

    def calcular_digito(base, pesos):
        soma = sum(int(numero) * peso for numero, peso in zip(base, pesos))
        resto = soma % 11
        return "0" if resto < 2 else str(11 - resto)

    primeiro_digito = calcular_digito(numeros[:12], [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    segundo_digito = calcular_digito(numeros[:12] + primeiro_digito, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return numeros[-2:] == primeiro_digito + segundo_digito


def formatar_telefone(telefone):
    """Formata um telefone fixo brasileiro como (XX) XXXX-XXXX."""
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


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/fornecedores", methods=["GET"])
def listar_fornecedores():
    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, nome, cnpj, email, telefone, status, criado_em "
            "FROM fornecedores ORDER BY nome"
        )
        return jsonify(cursor.fetchall())
    except Error:
        return jsonify({"erro": "Não foi possível consultar o banco de dados. Verifique a conexão com o MySQL."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


@app.route("/api/fornecedores", methods=["POST"])
def cadastrar_fornecedor():
    dados = request.get_json(silent=True)
    if not isinstance(dados, dict):
        return jsonify({"erro": "Envie os dados do fornecedor em formato JSON."}), 400

    fornecedor, erro = validar_fornecedor(dados)
    if erro:
        return jsonify({"erro": erro}), 400

    conexao = None
    cursor = None
    try:
        conexao = mysql.connector.connect(**obter_configuracao_mysql())
        cursor = conexao.cursor()
        cursor.execute(
            "INSERT INTO fornecedores (nome, cnpj, email, telefone) VALUES (%s, %s, %s, %s)",
            (fornecedor["nome"], fornecedor["cnpj"], fornecedor["email"], fornecedor["telefone"]),
        )
        conexao.commit()
        return jsonify({"mensagem": "Fornecedor cadastrado com sucesso.", "id": cursor.lastrowid}), 201
    except Error as erro_mysql:
        if erro_mysql.errno == errorcode.ER_DUP_ENTRY:
            return jsonify({"erro": "Este CNPJ já está cadastrado."}), 409
        return jsonify({"erro": "Não foi possível salvar no banco de dados. Verifique a conexão com o MySQL."}), 500
    finally:
        if cursor:
            cursor.close()
        if conexao and conexao.is_connected():
            conexao.close()


if __name__ == "__main__":
    app.run(debug=True)
