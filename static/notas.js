const formularioNota = document.querySelector("#form-nota-fiscal");
const seletorFornecedor = document.querySelector("#fornecedor_id");
const mensagemNota = document.querySelector("#mensagem-nota");
const listaNotas = document.querySelector("#lista-notas-fiscais");
const ehAdmin = document.body.dataset.admin === "true";
const totalColunas = ehAdmin ? 8 : 7;

function formatarData(data) {
    return data ? data.split("-").reverse().join("/") : "—";
}

function criarControlePagamento(nota) {
    const celula = document.createElement("td");
    const formulario = document.createElement("form");
    formulario.className = "controle-pagamento";
    const seletor = document.createElement("select");
    seletor.setAttribute("aria-label", `Status da nota ${nota.numero}`);
    ["Automatico", "Pendente", "Vencida", "Paga"].forEach((modo) => {
        const opcao = document.createElement("option");
        opcao.value = modo;
        opcao.textContent = modo === "Automatico" ? "Automático" : modo;
        opcao.selected = modo === nota.modo_status;
        seletor.appendChild(opcao);
    });
    const rotulo = document.createElement("label");
    rotulo.textContent = "Data do pagamento";
    const data = document.createElement("input");
    data.type = "date";
    data.max = document.body.dataset.hoje;
    data.value = nota.data_pagamento || "";
    rotulo.appendChild(data);
    function atualizarCampo() {
        rotulo.hidden = seletor.value !== "Paga";
        data.disabled = seletor.value !== "Paga";
        data.required = seletor.value === "Paga";
    }
    seletor.addEventListener("change", atualizarCampo);
    atualizarCampo();
    const botao = document.createElement("button");
    botao.type = "submit";
    botao.textContent = "Salvar";
    formulario.addEventListener("submit", async (evento) => {
        evento.preventDefault();
        const removerPagamento = nota.modo_status === "Paga" && seletor.value !== "Paga";
        if (removerPagamento && !window.confirm("Esta alteração removerá a data do pagamento. Deseja continuar?")) return;
        if (seletor.value === "Paga" && (!data.value || data.value > data.max)) {
            return mostrarMensagemNota("Informe a data do pagamento, sem usar uma data futura.", "erro");
        }
        botao.disabled = true;
        try {
            const resposta = await fetch(`/api/notas-fiscais/${nota.id}/pagamento`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ modo_status: seletor.value, data_pagamento: data.value, confirmar_remocao: removerPagamento })
            });
            const resultado = await resposta.json();
            if (!resposta.ok) throw new Error(resultado.erro);
            mostrarMensagemNota(resultado.mensagem, "sucesso");
            await carregarNotas();
        } catch (erro) {
            mostrarMensagemNota(erro.message || "Não foi possível atualizar o pagamento.", "erro");
        } finally {
            botao.disabled = false;
        }
    });
    formulario.append(seletor, rotulo, botao);
    celula.appendChild(formulario);
    return celula;
}

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
            listaNotas.innerHTML = `<tr><td colspan="${totalColunas}">Nenhuma nota fiscal cadastrada.</td></tr>`;
            return;
        }
        notas.forEach((nota) => {
            const linha = document.createElement("tr");
            [nota.fornecedor_nome, nota.numero, formatarValor(nota.valor), formatarData(nota.vencimento)]
                .forEach((valor) => linha.appendChild(criarCelula(valor)));
            const status = criarCelula(nota.status);
            status.className = `status-${nota.status.toLowerCase()}`;
            if (nota.modo_status === "Automatico") status.appendChild(document.createTextNode(" (automático)"));
            linha.append(status, criarCelula(formatarData(nota.data_pagamento)));
            linha.appendChild(criarAcoesAnexo(nota));
            if (ehAdmin) linha.appendChild(criarControlePagamento(nota));
            listaNotas.appendChild(linha);
        });
    } catch (erro) {
        listaNotas.replaceChildren();
        const linha = document.createElement("tr");
        const celula = criarCelula(erro.message || "Erro ao carregar notas fiscais.");
        celula.colSpan = totalColunas;
        linha.appendChild(celula);
        listaNotas.appendChild(linha);
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
document.querySelector("#atualizar-notas").addEventListener("click", carregarNotas);
carregarNotas();
