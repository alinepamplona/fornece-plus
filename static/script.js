const formulario = document.querySelector("#form-fornecedor");
const campoCnpj = document.querySelector("#cnpj");
const mensagem = document.querySelector("#mensagem");
const listaFornecedores = document.querySelector("#lista-fornecedores");

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
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

function criarCelula(texto) {
    const celula = document.createElement("td");
    celula.textContent = texto || "—";
    return celula;
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
    } catch (erro) {
        listaFornecedores.innerHTML = `<tr><td colspan="5">${erro.message || "Erro ao carregar fornecedores."}</td></tr>`;
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

carregarFornecedores();

