const formularioNota = document.querySelector("#form-nota-fiscal");
const seletorFornecedor = document.querySelector("#fornecedor_id");
const mensagemNota = document.querySelector("#mensagem-nota");
const listaNotas = document.querySelector("#lista-notas-fiscais");

function criarCelula(texto) {
    const celula = document.createElement("td");
    celula.textContent = texto || "—";
    return celula;
}

function mostrarMensagemNota(texto, tipo) {
    mensagemNota.textContent = texto;
    mensagemNota.className = `mensagem ${tipo}`;
}

function formatarValor(valor) {
    return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function carregarFornecedores() {
    if (!seletorFornecedor) return;
    const resposta = await fetch("/api/fornecedores");
    const fornecedores = await resposta.json();
    if (!resposta.ok) throw new Error(fornecedores.erro);
    seletorFornecedor.innerHTML = '<option value="">Selecione um fornecedor</option>';
    fornecedores.forEach((fornecedor) => {
        const opcao = document.createElement("option");
        opcao.value = fornecedor.id;
        opcao.textContent = fornecedor.nome;
        seletorFornecedor.appendChild(opcao);
    });
}

async function enviarAnexo(notaId, arquivo) {
    const dados = new FormData();
    dados.append("arquivo_pdf", arquivo);
    const resposta = await fetch(`/api/notas-fiscais/${notaId}/arquivo`, { method: "POST", body: dados });
    const resultado = await resposta.json();
    if (!resposta.ok) throw new Error(resultado.erro);
    mostrarMensagemNota(resultado.mensagem, "sucesso");
    carregarNotas();
}

async function removerAnexo(notaId) {
    if (!window.confirm("Deseja remover o anexo desta nota fiscal?")) return;
    try {
        const resposta = await fetch(`/api/notas-fiscais/${notaId}/arquivo`, { method: "DELETE" });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro);
        mostrarMensagemNota(resultado.mensagem, "sucesso");
        carregarNotas();
    } catch (erro) {
        mostrarMensagemNota(erro.message || "Não foi possível remover o anexo.", "erro");
    }
}

function criarAcoesAnexo(nota) {
    const celula = document.createElement("td");
    if (!nota.tem_anexo) {
        celula.textContent = "Sem anexo";
        return celula;
    }

    const link = document.createElement("a");
    link.href = `/api/notas-fiscais/${nota.id}/arquivo`;
    link.target = "_blank";
    link.textContent = "Ver PDF";

    const campoArquivo = document.createElement("input");
    campoArquivo.type = "file";
    campoArquivo.accept = "application/pdf,.pdf";
    campoArquivo.hidden = true;
    campoArquivo.addEventListener("change", async () => {
        if (!campoArquivo.files[0]) return;
        try {
            await enviarAnexo(nota.id, campoArquivo.files[0]);
        } catch (erro) {
            mostrarMensagemNota(erro.message || "Não foi possível substituir o anexo.", "erro");
        }
    });

    const botaoSubstituir = document.createElement("button");
    botaoSubstituir.type = "button";
    botaoSubstituir.className = "botao-link";
    botaoSubstituir.textContent = "Substituir";
    botaoSubstituir.addEventListener("click", () => campoArquivo.click());

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "botao-link perigo";
    botaoRemover.textContent = "Remover";
    botaoRemover.addEventListener("click", () => removerAnexo(nota.id));

    celula.append(link, document.createTextNode(" | "), botaoSubstituir, campoArquivo, document.createTextNode(" | "), botaoRemover);
    return celula;
}

async function carregarNotas() {
    try {
        const resposta = await fetch("/api/notas-fiscais");
        const notas = await resposta.json();
        if (!resposta.ok) throw new Error(notas.erro);
        listaNotas.innerHTML = "";
        if (!notas.length) {
            listaNotas.innerHTML = '<tr><td colspan="6">Nenhuma nota fiscal cadastrada.</td></tr>';
            return;
        }
        notas.forEach((nota) => {
            const linha = document.createElement("tr");
            [nota.fornecedor_nome, nota.numero, formatarValor(nota.valor), nota.vencimento, nota.status]
                .forEach((valor) => linha.appendChild(criarCelula(valor)));
            linha.appendChild(criarAcoesAnexo(nota));
            listaNotas.appendChild(linha);
        });
    } catch (erro) {
        listaNotas.innerHTML = `<tr><td colspan="6">${erro.message || "Erro ao carregar notas fiscais."}</td></tr>`;
    }
}

formularioNota.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = new FormData(formularioNota);
    if ((seletorFornecedor && !dados.get("fornecedor_id")) || !dados.get("numero").trim() || !dados.get("valor") || !dados.get("vencimento")) {
        return mostrarMensagemNota("Preencha todos os campos da nota fiscal.", "erro");
    }
    if (Number(dados.get("valor")) <= 0) return mostrarMensagemNota("O valor da nota fiscal deve ser maior que zero.", "erro");
    try {
        const resposta = await fetch("/api/notas-fiscais", { method: "POST", body: dados });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro);
        formularioNota.reset();
        mostrarMensagemNota(resultado.mensagem, "sucesso");
        carregarNotas();
    } catch (erro) {
        mostrarMensagemNota(erro.message || "Não foi possível cadastrar a nota fiscal.", "erro");
    }
});

document.querySelectorAll("[data-logout]").forEach((botao) => botao.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
}));

carregarFornecedores().catch((erro) => mostrarMensagemNota(erro.message || "Erro ao carregar fornecedores.", "erro"));
carregarNotas();
