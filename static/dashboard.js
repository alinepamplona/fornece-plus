const camposMonetarios = ["total_notas", "pago", "em_aberto", "vencido"];
const formatadorReais = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const mensagemDashboard = document.querySelector("#mensagem-dashboard");
const listaDespesas = document.querySelector("#lista-despesas");
const tabelaDespesas = document.querySelector("#tabela-despesas");
const filtroFornecedor = document.querySelector("#filtro-fornecedor");
let fornecedoresDashboard = [];

function mostrarErroDashboard(mensagem) {
    mensagemDashboard.textContent = mensagem || "Não foi possível carregar o dashboard financeiro.";
    mensagemDashboard.classList.add("erro");
}

function atualizarDashboard() {
    const fornecedorSelecionado = Number(filtroFornecedor.value);
    const fornecedoresVisiveis = fornecedorSelecionado
        ? fornecedoresDashboard.filter((fornecedor) => fornecedor.id === fornecedorSelecionado)
        : fornecedoresDashboard;
    const resumo = camposMonetarios.reduce((totais, campo) => {
        totais[campo] = fornecedoresVisiveis.reduce(
            (total, fornecedor) => total + Number(fornecedor[campo]), 0
        );
        return totais;
    }, {});

    for (const campo of camposMonetarios) {
        document.getElementById(campo).textContent = formatadorReais.format(resumo[campo]);
    }

    listaDespesas.innerHTML = "";
    for (const fornecedor of fornecedoresVisiveis) {
        const linha = document.createElement("tr");
        linha.appendChild(criarCelula(fornecedor.nome));
        for (const campo of camposMonetarios) {
            linha.appendChild(criarCelula(formatadorReais.format(fornecedor[campo])));
        }
        listaDespesas.appendChild(linha);
    }

    const possuiDespesas = fornecedoresVisiveis.length > 0;
    tabelaDespesas.hidden = !possuiDespesas;
    mensagemDashboard.textContent = possuiDespesas ? "" : "Nenhuma nota fiscal cadastrada.";
    mensagemDashboard.hidden = possuiDespesas;
}

async function carregarDashboard() {
    try {
        const resposta = await fetch("/api/dashboard-financeiro", { cache: "no-store" });
        const dados = await resposta.json();
        if (!resposta.ok) {
            mostrarErroDashboard(dados.erro);
            return;
        }

        fornecedoresDashboard = dados.fornecedores;
        for (const fornecedor of fornecedoresDashboard) {
            const opcao = document.createElement("option");
            opcao.value = fornecedor.id;
            opcao.textContent = `${fornecedor.nome} — ${fornecedor.cnpj}`;
            filtroFornecedor.appendChild(opcao);
        }
        filtroFornecedor.disabled = false;
        atualizarDashboard();
    } catch {
        mostrarErroDashboard();
    }
}

filtroFornecedor.addEventListener("change", atualizarDashboard);
carregarDashboard();
