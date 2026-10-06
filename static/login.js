const formularioLogin = document.querySelector("#form-login");
const mensagemLogin = document.querySelector("#mensagem-login");
formularioLogin.addEventListener("submit", async (evento) => {
    evento.preventDefault(); const dados = Object.fromEntries(new FormData(formularioLogin));
    if (!dados.login.trim() || !dados.senha) { mensagemLogin.textContent = "Informe login e senha."; mensagemLogin.className = "mensagem erro"; return; }
    try { const resposta = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) }); const resultado = await resposta.json(); if (!resposta.ok) throw new Error(resultado.erro); window.location.href = resultado.destino; } catch (erro) { mensagemLogin.textContent = erro.message || "Não foi possível realizar o login."; mensagemLogin.className = "mensagem erro"; }
});
