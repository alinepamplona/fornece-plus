const formulario = document.querySelector("#form-fornecedor");
const campoCnpj = document.querySelector("#cnpj");
const campoTelefone = document.querySelector("#telefone");
const mensagem = document.querySelector("#mensagem");
const listaFornecedores = document.querySelector("#lista-fornecedores");
function mostrarMensagem(texto, tipo) { mensagem.textContent = texto; mensagem.className = `mensagem ${tipo}`; }
function formatarCnpj(valor) { const n = valor.replace(/\D/g, "").slice(0, 14); return n.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2"); }
function formatarTelefone(valor) { const n = valor.replace(/\D/g, "").slice(0, 10); return n.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2"); }
function criarCelula(texto) { const celula = document.createElement("td"); celula.textContent = texto || "—"; return celula; }
campoCnpj.addEventListener("input", () => { campoCnpj.value = formatarCnpj(campoCnpj.value); });
campoTelefone.addEventListener("input", () => { campoTelefone.value = formatarTelefone(campoTelefone.value); });
async function carregarFornecedores() {
    try {
        const resposta = await fetch("/api/fornecedores"); const fornecedores = await resposta.json(); if (!resposta.ok) throw new Error(fornecedores.erro);
        listaFornecedores.innerHTML = "";
        if (!fornecedores.length) { listaFornecedores.innerHTML = '<tr><td colspan="6">Nenhum fornecedor cadastrado.</td></tr>'; return; }
        fornecedores.forEach((fornecedor) => { const linha = document.createElement("tr"); [fornecedor.nome, fornecedor.cnpj, fornecedor.email, fornecedor.telefone, fornecedor.codigo_acesso, fornecedor.status].forEach((valor) => linha.appendChild(criarCelula(valor))); listaFornecedores.appendChild(linha); });
    } catch (erro) { listaFornecedores.innerHTML = `<tr><td colspan="6">${erro.message || "Erro ao carregar fornecedores."}</td></tr>`; }
}
formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault(); const dados = Object.fromEntries(new FormData(formulario));
    if (!dados.nome.trim() || !dados.cnpj.trim()) return mostrarMensagem("Preencha o nome da empresa e o CNPJ.", "erro");
    if (dados.cnpj.replace(/\D/g, "").length !== 14) return mostrarMensagem("O CNPJ deve ter 14 números.", "erro");
    if (dados.telefone && dados.telefone.replace(/\D/g, "").length !== 10) return mostrarMensagem("Informe o telefone no formato (XX) XXXX-XXXX.", "erro");
    if (dados.email && !document.querySelector("#email").checkValidity()) return mostrarMensagem("Informe um e-mail válido.", "erro");
    try { const resposta = await fetch("/api/fornecedores", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) }); const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.erro); formulario.reset(); mostrarMensagem(`${resultado.mensagem} Login e senha padrão: ${resultado.credenciais.login}.`, "sucesso"); carregarFornecedores(); } catch (erro) { mostrarMensagem(erro.message || "Não foi possível cadastrar o fornecedor.", "erro"); }
});
document.querySelectorAll("[data-logout]").forEach((botao) => botao.addEventListener("click", async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }));
carregarFornecedores();
