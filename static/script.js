const listaFornecedores = document.querySelector("#lista-fornecedores");

function criarCelula(texto) {
    const celula = document.createElement("td");
    celula.textContent = texto || "—";
    return celula;
}

async function carregarFornecedores() {
    try {
        const resposta = await fetch("/api/fornecedores");
        const fornecedores = await resposta.json();
        if (!resposta.ok) throw new Error(fornecedores.erro);
        listaFornecedores.innerHTML = "";
        if (!fornecedores.length) {
            listaFornecedores.innerHTML = '<tr><td colspan="6">Nenhum fornecedor cadastrado.</td></tr>';
            return;
        }
        fornecedores.forEach((fornecedor) => {
            const linha = document.createElement("tr");
            [fornecedor.nome, fornecedor.cnpj, fornecedor.email, fornecedor.telefone, fornecedor.codigo_acesso, fornecedor.status]
                .forEach((valor) => linha.appendChild(criarCelula(valor)));
            listaFornecedores.appendChild(linha);
        });
    } catch (erro) {
        listaFornecedores.innerHTML = `<tr><td colspan="6">${erro.message || "Erro ao carregar fornecedores."}</td></tr>`;
    }
}

document.querySelectorAll("[data-logout]").forEach((botao) => botao.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
}));

carregarFornecedores();
