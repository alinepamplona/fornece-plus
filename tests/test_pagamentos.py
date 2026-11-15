import unittest
from datetime import date, timedelta
from unittest.mock import MagicMock, patch

from app import app, status_da_nota, validar_pagamento


class PagamentosTest(unittest.TestCase):
    def setUp(self):
        self.cliente = app.test_client()

    def test_status_automatico_e_manual(self):
        hoje = date.today()
        for dias, esperado in [(-1, 'Vencida'), (0, 'Pendente'), (1, 'Pendente')]:
            self.assertEqual(status_da_nota('Automatico', hoje + timedelta(days=dias), hoje), esperado)
        for modo in ['Pendente', 'Vencida', 'Paga']:
            self.assertEqual(status_da_nota(modo, hoje - timedelta(days=1), hoje), modo)

    def test_validacao_data_pagamento(self):
        for data in ['', '2026-02-30', (date.today() + timedelta(days=1)).isoformat()]:
            self.assertIsNotNone(validar_pagamento({'modo_status': 'Paga', 'data_pagamento': data})[1])
        self.assertIsNone(validar_pagamento({'modo_status': 'Paga', 'data_pagamento': date.today().isoformat()})[1])
        self.assertIsNotNone(validar_pagamento({'modo_status': 'invalido'})[1])

    def test_permissoes(self):
        url = '/api/notas-fiscais/1/pagamento'
        self.assertEqual(self.cliente.patch(url, json={}).status_code, 401)
        with self.cliente.session_transaction() as sessao:
            sessao['tipo_usuario'] = 'fornecedor'
        self.assertEqual(self.cliente.patch(url, json={}).status_code, 403)

    @patch('app.mysql.connector.connect')
    def test_gravacao_confirmacao_e_erro(self, conectar):
        with self.cliente.session_transaction() as sessao:
            sessao['tipo_usuario'] = 'admin'
        conexao = conectar.return_value
        cursor = conexao.cursor.return_value
        cursor.fetchone.return_value = {'modo_status': 'Paga'}
        url = '/api/notas-fiscais/1/pagamento'
        self.assertEqual(self.cliente.patch(url, json={'modo_status': 'Automatico'}).status_code, 409)
        conexao.commit.assert_not_called()
        resposta = self.cliente.patch(url, json={'modo_status': 'Automatico', 'confirmar_remocao': True})
        self.assertEqual(resposta.status_code, 200)
        cursor.execute.assert_called_with('UPDATE notas_fiscais SET modo_status = %s, data_pagamento = %s WHERE id = %s', ('Automatico', None, 1))
        cursor.fetchone.return_value = None
        self.assertEqual(self.cliente.patch(url, json={'modo_status': 'Pendente'}).status_code, 404)


if __name__ == '__main__':
    unittest.main()
