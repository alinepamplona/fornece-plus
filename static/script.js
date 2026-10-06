const formulario = document.querySelector("#form-fornecedor");
const campoCnpj = document.querySelector("#cnpj");
const campoTelefone = document.querySelector("#telefone");
const mensagem = document.querySelector("#mensagem");
const listaFornecedores = document.querySelector("#lista-fornecedores");
const formularioNota = document.querySelector("#form-nota-fiscal");
const seletorFornecedor = document.querySelector("#fornecedor_id");
const botaoNota = document.querySelector("#botao-nota");
const mensagemNota = document.querySelector("#mensagem-nota");
const listaNotasFiscais = document.querySelector("#lista-notas-fiscais");

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
}

function mostrarMensagemNota(texto, tipo) {
    mensagemNota.textContent = texto;
    mensagemNota.className = `mensagem ${tipo}`;
}

function formatarCnpj(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);
    return numeros
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

campoCnpj.addEventListener("input", () => {
    campoCnpj.value = formatarCnpj(campoCnpj.value);
});

function formatarTelefone(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 10);
    return numeros
        .replace(/^(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
}

campoTelefone.addEventListener("input", () => {
    campoTelefone.value = formatarTelefone(campoTelefone.value);
});

function criarCelula(texto) {
    const celula = document.createElement("td");
    celula.textContent = texto || "—";
    return celula;
}

function preencherFornecedoresNoSeletor(fornecedores) {
    seletorFornecedor.innerHTML = '<option value="">Selecione um fornecedor</option>';
    fornecedores.forEach((fornecedor) => {
        const opcao = document.createElement("option");
        opcao.value = fornecedor.id;
        opcao.textContent = fornecedor.nome;
        seletorFornecedor.appendChild(opcao);
    });
    botaoNota.disabled = fornecedores.length === 0;
}

function formatarValor(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
    });
}

async function carregarFornecedores() {
    listaFornecedores.innerHTML = '<tr><td colspan="5">Carregando fornecedores...</td></tr>';
    try {
        const resposta = await fetch("/api/fornecedores");
        const fornecedores = await resposta.json();
        if (!resposta.ok) throw new Error(fornecedores.erro);

        listaFornecedores.innerHTML = "";
        if (fornecedores.length === 0) {
            listaFornecedores.innerHTML = '<tr><td colspan="5">Nenhum fornecedor cadastrado.</td></tr>';
            return;
        }

        fornecedores.forEach((fornecedor) => {
            const linha = document.createElement("tr");
            [fornecedor.nome, fornecedor.cnpj, fornecedor.email, fornecedor.telefone, fornecedor.status]
                .forEach((valor) => linha.appendChild(criarCelula(valor)));
            listaFornecedores.appendChild(linha);
        });
        preencherFornecedoresNoSeletor(fornecedores);
    } catch (erro) {
        listaFornecedores.innerHTML = `<tr><td colspan="5">${erro.message || "Erro ao carregar fornecedores."}</td></tr>`;
        seletorFornecedor.innerHTML = '<option value="">Não foi possível carregar fornecedores</option>';
        botaoNota.disabled = true;
    }
}

async function carregarNotasFiscais() {
    listaNotasFiscais.innerHTML = '<tr><td colspan="5">Carregando notas fiscais...</td></tr>';
    try {
        const resposta = await fetch("/api/notas-fiscais");
        const notas = await resposta.json();
        if (!resposta.ok) throw new Error(notas.erro);

        listaNotasFiscais.innerHTML = "";
        if (notas.length === 0) {
            listaNotasFiscais.innerHTML = '<tr><td colspan="5">Nenhuma nota fiscal cadastrada.</td></tr>';
            return;
        }

        notas.forEach((nota) => {
            const linha = document.createElement("tr");
            [nota.fornecedor_nome, nota.numero, formatarValor(nota.valor), nota.vencimento, nota.status]
                .forEach((valor) => linha.appendChild(criarCelula(valor)));
            listaNotasFiscais.appendChild(linha);
        });
    } catch (erro) {
        listaNotasFiscais.innerHTML = `<tr><td colspan="5">${erro.message || "Erro ao carregar notas fiscais."}</td></tr>`;
    }
}

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(formulario));

    if (!dados.nome.trim() || !dados.cnpj.trim()) {
        mostrarMensagem("Preencha o nome da empresa e o CNPJ.", "erro");
        return;
    }
    if (dados.cnpj.replace(/\D/g, "").length !== 14) {
        mostrarMensagem("O CNPJ deve ter 14 números.", "erro");
        return;
    }
    if (dados.telefone && dados.telefone.replace(/\D/g, "").length !== 10) {
        mostrarMensagem("Informe o telefone no formato (XX) XXXX-XXXX.", "erro");
        return;
    }
    if (dados.email && !document.querySelector("#email").checkValidity()) {
        mostrarMensagem("Informe um e-mail válido.", "erro");
        return;
    }

    try {
        const resposta = await fetch("/api/fornecedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
        });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro);

        formulario.reset();
        mostrarMensagem(resultado.mensagem, "sucesso");
        carregarFornecedores();
    } catch (erro) {
        mostrarMensagem(erro.message || "Não foi possível cadastrar o fornecedor.", "erro");
    }
});

formularioNota.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(formularioNota));

    if (!dados.fornecedor_id || !dados.numero.trim() || !dados.valor || !dados.vencimento) {
        mostrarMensagemNota("Preencha todos os campos da nota fiscal.", "erro");
        return;
    }
    if (Number(dados.valor) <= 0) {
        mostrarMensagemNota("O valor da nota fiscal deve ser maior que zero.", "erro");
        return;
    }

    try {
        const resposta = await fetch("/api/notas-fiscais", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados),
        });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro);

        formularioNota.reset();
        mostrarMensagemNota(resultado.mensagem, "sucesso");
        carregarNotasFiscais();
    } catch (erro) {
        mostrarMensagemNota(erro.message || "Não foi possível cadastrar a nota fiscal.", "erro");
    }
});

carregarFornecedores();
carregarNotasFiscais();
