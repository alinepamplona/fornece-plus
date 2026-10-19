const formulario = document.querySelector("#form-fornecedor");
const campoCnpj = document.querySelector("#cnpj");
const campoTelefone = document.querySelector("#telefone");
const mensagem = document.querySelector("#mensagem");
const blocoCredenciais = document.querySelector("#credenciais");
const codigoAcesso = document.querySelector("#codigo-acesso");

function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = `mensagem ${tipo}`;
}

function formatarCnpj(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 14);
    return numeros.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2}\.\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}

function formatarTelefone(valor) {
    const numeros = valor.replace(/\D/g, "").slice(0, 10);
    return numeros.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
}

campoCnpj.addEventListener("input", () => { campoCnpj.value = formatarCnpj(campoCnpj.value); });
campoTelefone.addEventListener("input", () => { campoTelefone.value = formatarTelefone(campoTelefone.value); });

formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const dados = Object.fromEntries(new FormData(formulario));
    blocoCredenciais.hidden = true;
    if (!dados.nome.trim() || !dados.cnpj.trim()) return mostrarMensagem("Preencha o nome da empresa e o CNPJ.", "erro");
    if (dados.cnpj.replace(/\D/g, "").length !== 14) return mostrarMensagem("O CNPJ deve ter 14 números.", "erro");
    if (dados.telefone && dados.telefone.replace(/\D/g, "").length !== 10) return mostrarMensagem("Informe o telefone no formato (XX) XXXX-XXXX.", "erro");
    if (dados.email && !document.querySelector("#email").checkValidity()) return mostrarMensagem("Informe um e-mail válido.", "erro");
    try {
        const resposta = await fetch("/api/cadastro-fornecedor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro);
        formulario.reset();
        mostrarMensagem(resultado.mensagem, "sucesso");
        codigoAcesso.textContent = `Login: ${resultado.credenciais.login} | Senha: ${resultado.credenciais.senha}`;
        blocoCredenciais.hidden = false;
    } catch (erro) {
        mostrarMensagem(erro.message || "Não foi possível cadastrar o fornecedor.", "erro");
    }
});
