import unittest
from datetime import datetime, timedelta
from decimal import Decimal
from unittest.mock import patch

from mysql.connector import Error

from app import app


class DashboardTest(unittest.TestCase):
    pagina = "/dashboard-financeiro"
    api = "/api/dashboard-financeiro"

    def setUp(self):
        self.cliente = app.test_client()

    def entrar(self, tipo_usuario):
        with self.cliente.session_transaction() as sessao:
            sessao["tipo_usuario"] = tipo_usuario

    def test_acesso_e_navegacao(self):
        self.assertTrue(self.cliente.get(self.pagina).location.endswith("/login"))
        self.assertEqual(self.cliente.get(self.api).status_code, 401)
        self.entrar("fornecedor")
        self.assertTrue(self.cliente.get(self.pagina).location.endswith("/notas-fiscais"))
        self.assertEqual(self.cliente.get(self.api).status_code, 403)
        self.assertNotIn(b"/dashboard-financeiro", self.cliente.get("/notas-fiscais").data)
        self.entrar("admin")
        pagina_dashboard = self.cliente.get(self.pagina)
        self.assertEqual(pagina_dashboard.status_code, 200)
        self.assertIn(b'id="filtro-fornecedor"', pagina_dashboard.data)
        for pagina in ("/", "/notas-fiscais"):
            self.assertIn(b"/dashboard-financeiro", self.cliente.get(pagina).data)

    @patch("app.mysql.connector.connect")
    def test_totais_e_atualizacao_apos_pagamento(self, conectar):
        self.entrar("admin")
        cursor = conectar.return_value.cursor.return_value
        hoje = datetime.now().date()
        ontem = hoje - timedelta(days=1)
        # O mesmo nome em dois cadastros deve resultar em duas linhas.
        notas = [
            dict(fornecedor_id=2, nome="Empresa", cnpj="22.222.222/0001-22", valor=Decimal("80.00"), modo_status="Automatico", vencimento=hoje),
            dict(fornecedor_id=1, nome="Empresa", cnpj="11.111.111/0001-11", valor=Decimal("100.00"), modo_status="Paga", vencimento=ontem),
            dict(fornecedor_id=1, nome="Empresa", cnpj="11.111.111/0001-11", valor=Decimal("50.00"), modo_status="Automatico", vencimento=ontem),
        ]
        cursor.__iter__.side_effect = lambda: iter(notas)

        resposta = self.cliente.get(self.api)
        self.assertEqual(resposta.status_code, 200)
        dados = resposta.get_json()
        self.assertEqual(dados["resumo"], dict(total_notas="230.00", pago="100.00", em_aberto="130.00", vencido="50.00"))
        self.assertEqual(dados["fornecedores"], [
            dict(id=1, nome="Empresa", cnpj="11.111.111/0001-11", total_notas="150.00", pago="100.00", em_aberto="50.00", vencido="50.00"),
            dict(id=2, nome="Empresa", cnpj="22.222.222/0001-22", total_notas="80.00", pago="0.00", em_aberto="80.00", vencido="0.00"),
        ])

        notas[2]["modo_status"] = "Paga"
        atualizado = self.cliente.get(self.api).get_json()["resumo"]
        self.assertEqual(atualizado, dict(total_notas="230.00", pago="150.00", em_aberto="80.00", vencido="0.00"))

    @patch("app.mysql.connector.connect")
    def test_banco_vazio_e_erro_de_conexao(self, conectar):
        self.entrar("admin")
        resposta = self.cliente.get(self.api)
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(resposta.get_json(), {
            "resumo": dict(total_notas="0.00", pago="0.00", em_aberto="0.00", vencido="0.00"),
            "fornecedores": [],
        })

        conectar.side_effect = Error("Falha simulada")
        resposta = self.cliente.get(self.api)
        self.assertEqual(resposta.status_code, 500)
        self.assertEqual(resposta.get_json(), {"erro": "Não foi possível consultar o dashboard financeiro."})
