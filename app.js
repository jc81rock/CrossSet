"use strict";

/*
  Repertório Fácil
  app.js revisado
  Versão corrigida para substituir o app.js atual.
*/

const REPERTORIO_FACIL = {
  urlApp: "https://jc81rock.github.io/RepertorioFacilNovo/",
  supabaseUrl: "https://hfpvbsoaszenrfjzbbjt.supabase.co",
  supabaseKey: "sb_publishable_KUlqpOD-RqTCtt16TvwA8g_jLtYDsU_",
  tabelas: {
    projetos: "projetos",
    integrantes: "integrantes",
    musicas: "musicas",
    repertorios: "repertorios",
    repertorioMusicas: "repertorio_musicas",
    eventos: "eventos"
  }
};

let appState = {
  usuario: null,
  sessao: null,
  telaAtual: "tela-login",
  historico: [],
  projetoAtual: null,
  carregando: false
};

function obterSupabase() {
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    return supabaseClient;
  }

  if (typeof supabase !== "undefined" && supabase.createClient) {
    window.supabaseClient = supabase.createClient(
      REPERTORIO_FACIL.supabaseUrl,
      REPERTORIO_FACIL.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    return window.supabaseClient;
  }

  console.error("Supabase não carregado.");
  return null;
}

function sb() {
  return obterSupabase();
}

function elemento(id) {
  return document.getElementById(id);
}

function selecionar(seletor) {
  return document.querySelector(seletor);
}

function selecionarTodos(seletor) {
  return Array.from(document.querySelectorAll(seletor));
}

function textoSeguro(valor, padrao = "") {
  if (valor === null || valor === undefined) {
    return padrao;
  }

  return String(valor);
}

function limparTexto(valor) {
  return textoSeguro(valor).trim();
}

function escaparHtml(valor) {
  return textoSeguro(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarUF(valor) {
  return limparTexto(valor).toUpperCase().slice(0, 2);
}

function definirCarregando(status) {
  appState.carregando = status;

  selecionarTodos("button").forEach(function(botao) {
    if (botao.dataset.manterAtivo === "true") {
      return;
    }

    botao.disabled = status;
  });
}

function alertaErro(mensagem) {
  alert(mensagem || "Ocorreu um erro.");
}

function mostrarMensagemCadastro(tipo, texto) {
  const mensagem = elemento("mensagem-cadastro");

  if (!mensagem) {
    return;
  }

  mensagem.className = "mensagem-cadastro " + tipo;
  mensagem.textContent = texto;
}

function limparMensagemCadastro() {
  const mensagem = elemento("mensagem-cadastro");

  if (!mensagem) {
    return;
  }

  mensagem.className = "mensagem-cadastro";
  mensagem.textContent = "";
}

function limparCampos(container) {
  if (!container) {
    return;
  }

  container.querySelectorAll("input, select, textarea").forEach(function(campo) {
    campo.value = "";
  });
}

function obterNomeUsuario(usuario) {
  if (!usuario) {
    return "Usuário";
  }

  return (
    usuario.user_metadata?.full_name ||
    usuario.user_metadata?.name ||
    usuario.user_metadata?.nome ||
    usuario.email ||
    "Usuário"
  );
}

function preencherUsuario(usuario) {
  const nomeUsuario = elemento("nome-usuario");

  if (!nomeUsuario || !usuario) {
    return;
  }

  nomeUsuario.textContent = "Olá, " + obterNomeUsuario(usuario);
}

function salvarProjetoAtual(projeto) {
  appState.projetoAtual = projeto || null;

  if (projeto && projeto.id) {
    localStorage.setItem("projeto_atual", projeto.id);
  } else {
    localStorage.removeItem("projeto_atual");
  }
}

function obterProjetoAtualId() {
  if (appState.projetoAtual && appState.projetoAtual.id) {
    return appState.projetoAtual.id;
  }

  return localStorage.getItem("projeto_atual");
}

function telaExiste(idTela) {
  return Boolean(elemento(idTela));
}

function registrarHistorico(idTela) {
  if (!idTela) {
    return;
  }

  if (idTela === appState.telaAtual) {
    return;
  }

  const ultimaTela = appState.historico[appState.historico.length - 1];

  if (ultimaTela !== idTela) {
    appState.historico.push(idTela);
  }

  if (appState.historico.length > 30) {
    appState.historico.shift();
  }
}

function mostrarTela(idTela, opcoes = {}) {
  if (!idTela || !telaExiste(idTela)) {
    console.warn("Tela não encontrada:", idTela);
    return;
  }

  const telaAnterior = appState.telaAtual;

  selecionarTodos(".tela").forEach(function(tela) {
    tela.classList.remove("tela-ativa");
  });

  const telaSelecionada = elemento(idTela);

  if (telaSelecionada) {
    telaSelecionada.classList.add("tela-ativa");
  }

  appState.telaAtual = idTela;

  if (opcoes.registrar !== false && telaAnterior !== idTela) {
    registrarHistorico(telaAnterior);
  }

  if (idTela === "tela-projetos") {
    carregarProjetos();
  }

  if (idTela === "tela-painel-projeto") {
    carregarPainelProjeto();
  }
}

function voltarTela() {
  if (appState.historico.length === 0) {
    if (appState.usuario) {
      mostrarTela("tela-projetos", { registrar: false });
    } else {
      mostrarTela("tela-login", { registrar: false });
    }

    return;
  }

  const telaAnterior = appState.historico.pop();

  if (!telaAnterior || !telaExiste(telaAnterior)) {
    voltarTela();
    return;
  }

  mostrarTela(telaAnterior, { registrar: false });
}

async function verificarSessao() {
  const cliente = sb();

  if (!cliente) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data, error } = await cliente.auth.getSession();

  if (error) {
    console.error(error);
    appState.sessao = null;
    appState.usuario = null;
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  appState.sessao = data.session || null;
  appState.usuario = data.session?.user || null;

  if (appState.usuario) {
    preencherUsuario(appState.usuario);
    mostrarTela("tela-projetos", { registrar: false });
    return;
  }

  mostrarTela("tela-login", { registrar: false });
}

async function entrarComGoogle() {
  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  definirCarregando(true);

  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REPERTORIO_FACIL.urlApp,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  definirCarregando(false);

  if (error) {
    alertaErro("Erro ao entrar com Google: " + error.message);
    return;
  }

  if (data && data.url) {
    window.location.href = data.url;
  }
}

async function entrarComEmail() {
  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  const email = limparTexto(elemento("login-email")?.value);
  const senha = limparTexto(elemento("login-senha")?.value);

  if (!email || !senha) {
    alertaErro("Preencha e-mail e senha.");
    return;
  }

  definirCarregando(true);

  const { data, error } = await cliente.auth.signInWithPassword({
    email: email,
    password: senha
  });

  definirCarregando(false);

  if (error) {
    alertaErro("Erro ao entrar: " + error.message);
    return;
  }

  appState.sessao = data.session || null;
  appState.usuario = data.user || data.session?.user || null;

  if (appState.usuario) {
    preencherUsuario(appState.usuario);
  }

  mostrarTela("tela-projetos");
}

async function validarCadastro() {
  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  const nome = limparTexto(elemento("cadastro-nome")?.value);
  const cidade = limparTexto(elemento("cadastro-cidade")?.value);
  const email = limparTexto(elemento("cadastro-email")?.value);
  const senha = limparTexto(elemento("cadastro-senha")?.value);
  const repetirSenha = limparTexto(elemento("cadastro-repetir-senha")?.value);

  limparMensagemCadastro();

  if (!nome) {
    mostrarMensagemCadastro("erro", "Informe seu nome.");
    return;
  }

  if (!cidade) {
    mostrarMensagemCadastro("erro", "Informe sua cidade.");
    return;
  }

  if (!email) {
    mostrarMensagemCadastro("erro", "Informe seu e-mail.");
    return;
  }

  if (!senha) {
    mostrarMensagemCadastro("erro", "Informe sua senha.");
    return;
  }

  if (senha.length < 6) {
    mostrarMensagemCadastro("erro", "A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (!repetirSenha) {
    mostrarMensagemCadastro("erro", "Repita sua senha.");
    return;
  }

  if (senha !== repetirSenha) {
    mostrarMensagemCadastro("erro", "As senhas não coincidem.");
    return;
  }

  definirCarregando(true);

  const { error } = await cliente.auth.signUp({
    email: email,
    password: senha,
    options: {
      emailRedirectTo: REPERTORIO_FACIL.urlApp,
      data: {
        nome: nome,
        cidade: cidade
      }
    }
  });

  definirCarregando(false);

  if (error) {
    mostrarMensagemCadastro("erro", "Erro ao criar conta: " + error.message);
    return;
  }

  mostrarMensagemCadastro("sucesso", "Conta criada com sucesso. Faça login para continuar.");
}

async function sair() {
  const cliente = sb();

  if (cliente) {
    await cliente.auth.signOut();
  }

  appState.sessao = null;
  appState.usuario = null;
  appState.projetoAtual = null;
  appState.historico = [];

  localStorage.removeItem("projeto_atual");

  mostrarTela("tela-login", { registrar: false });
}/* ============================================================
   PROJETOS
============================================================ */

async function carregarProjetos() {
  const grid = document.querySelector(".grid-projetos");

  if (!grid) {
    return;
  }

  const cliente = sb();

  if (!cliente) {
    return;
  }

  grid.innerHTML = `
    <div class="card-projeto">
      <h3>Carregando...</h3>
      <p>Buscando seus projetos.</p>
    </div>
  `;

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("usuario_id", usuario.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="card-projeto">
        <h3>Erro ao carregar</h3>
        <p>${escaparHtml(error.message)}</p>
      </div>
    `;

    return;
  }

  montarListaProjetos(data || []);
}

function montarListaProjetos(lista) {
  const grid = document.querySelector(".grid-projetos");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  grid.innerHTML += `
    <div class="card-projeto card-criar" id="novoProjetoCard">
      <div class="icone-mais">+</div>
      <h3>Criar novo projeto</h3>
      <p>Cadastre uma nova banda ou projeto musical.</p>
    </div>
  `;

  if (lista.length === 0) {
    grid.innerHTML += `
      <div class="card-projeto">
        <h3>Nenhum projeto cadastrado</h3>
        <p>Clique em Novo Projeto para criar o primeiro.</p>
      </div>
    `;
  }

  lista.forEach(function(projeto) {
    grid.innerHTML += `
      <div class="card-projeto">
        <span class="tag">${escaparHtml(projeto.tipo || "Projeto")}</span>

        <h3>${escaparHtml(projeto.nome || "Sem nome")}</h3>

        <p>${escaparHtml(projeto.estilo || "Sem estilo informado")}</p>

        <div class="detalhes">
          <span>
            ${escaparHtml(projeto.cidade || "")}
            ${projeto.estado ? " - " + escaparHtml(projeto.estado) : ""}
          </span>
          <span>Projeto cadastrado</span>
        </div>

        <button
          class="botao-card abrir-projeto"
          type="button"
          data-id="${escaparHtml(projeto.id)}"
        >
          Acessar projeto
        </button>
      </div>
    `;
  });

  const cardNovo = document.getElementById("novoProjetoCard");

  if (cardNovo) {
    cardNovo.addEventListener("click", function() {
      mostrarTela("tela-novo-projeto");
    });
  }

  document.querySelectorAll(".abrir-projeto").forEach(function(botao) {
    botao.addEventListener("click", function() {
      acessarProjeto(botao.dataset.id);
    });
  });
}

async function criarProjeto() {
  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  const nome = limparTexto(elemento("projeto-nome")?.value);
  const tipo = limparTexto(elemento("projeto-tipo")?.value);
  const estilo = limparTexto(elemento("projeto-estilo")?.value);
  const cidade = limparTexto(elemento("projeto-cidade")?.value);
  const estado = normalizarUF(elemento("projeto-estado")?.value);

  if (!nome) {
    alert("Informe o nome do projeto.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  definirCarregando(true);

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .insert({
      usuario_id: usuario.id,
      nome: nome,
      tipo: tipo,
      estilo: estilo,
      cidade: cidade,
      estado: estado
    })
    .select()
    .single();

  definirCarregando(false);

  if (error) {
    alert("Erro ao criar projeto: " + error.message);
    return;
  }

  limparCampos(elemento("tela-novo-projeto"));
  salvarProjetoAtual(data);
  mostrarTela("tela-projetos");
}

async function acessarProjeto(id) {
  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  if (!id) {
    alert("Projeto não encontrado.");
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao abrir projeto: " + error.message);
    return;
  }

  salvarProjetoAtual(data);
  abrirPainelProjeto();
}

function abrirPainelProjeto() {
  if (!telaExiste("tela-painel-projeto")) {
    garantirTelasInternas();
  }

  mostrarTela("tela-painel-projeto");
}

function carregarPainelProjeto() {
  const projeto = appState.projetoAtual;

  if (!projeto) {
    return;
  }

  const nome = document.getElementById("titulo-projeto");
  const subtitulo = document.getElementById("subtitulo-projeto");

  if (nome) {
    nome.textContent = projeto.nome || "Projeto";
  }

  if (subtitulo) {
    const cidade = projeto.cidade || "";
    const estado = projeto.estado ? " - " + projeto.estado : "";
    const estilo = projeto.estilo || "Projeto musical";

    subtitulo.textContent = estilo + (cidade ? " • " + cidade + estado : "");
  }
}

async function excluirProjeto(id) {
  if (!confirm("Excluir este projeto?")) {
    return;
  }

  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .delete()
    .eq("id", id);

  if (error) {
    alert("Erro ao excluir projeto: " + error.message);
    return;
  }

  if (obterProjetoAtualId() === id) {
    salvarProjetoAtual(null);
  }

  carregarProjetos();
}

async function atualizarProjeto(id, dados) {
  const cliente = sb();

  if (!cliente) {
    alertaErro("Supabase não carregado.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .update(dados)
    .eq("id", id);

  if (error) {
    alert("Erro ao atualizar projeto: " + error.message);
    return;
  }

  carregarProjetos();
}

/* ============================================================
   TELAS INTERNAS
============================================================ */

function garantirTelasInternas() {
  if (telaExiste("tela-painel-projeto")) {
    return;
  }

  const app = document.querySelector(".app");

  if (!app) {
    return;
  }

  const tela = document.createElement("section");

  tela.id = "tela-painel-projeto";
  tela.className = "tela";

  tela.innerHTML = `
    <div class="container">
      <header class="topo">
        <div class="topo-logo">
          <img src="logo.png" alt="Repertório Fácil" />
          <div>
            <h1 id="titulo-projeto">Projeto</h1>
            <p id="subtitulo-projeto">Painel interno do projeto</p>
          </div>
        </div>

        <button class="botao-sair" id="btn-voltar-projetos" type="button">
          Voltar
        </button>
      </header>

      <section class="banner">
        <div>
          <h2>Gerenciar projeto</h2>
          <p>Cadastre integrantes, músicas, repertórios e eventos.</p>
        </div>
      </section>

      <section class="grid-projetos">
        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Integrantes</h3>
          <p>Cadastre músicos, funções e administradores do projeto.</p>
          <button class="botao-card" type="button" data-modulo="integrantes">Abrir</button>
        </div>

        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Músicas</h3>
          <p>Cadastre músicas, tons, BPM, links e observações.</p>
          <button class="botao-card" type="button" data-modulo="musicas">Abrir</button>
        </div>

        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Repertórios</h3>
          <p>Monte sequências para shows, ensaios e apresentações.</p>
          <button class="botao-card" type="button" data-modulo="repertorios">Abrir</button>
        </div>

        <div class="card-projeto">
          <span class="tag">Módulo</span>
          <h3>Eventos</h3>
          <p>Organize datas, locais, horários e repertórios usados.</p>
          <button class="botao-card" type="button" data-modulo="eventos">Abrir</button>
        </div>
      </section>

      <section id="area-modulo" class="grid-projetos" style="margin-top:24px;"></section>

      <nav class="menu-inferior">
        <button id="menu-projeto-inicio" class="ativo" type="button">Início</button>
        <button type="button" data-modulo="integrantes">Integrantes</button>
        <button type="button" data-modulo="musicas">Músicas</button>
        <button type="button" data-modulo="repertorios">Repertórios</button>
        <button type="button" data-modulo="eventos">Eventos</button>
      </nav>
    </div>
  `;

  app.appendChild(tela);
  configurarEventosPainelProjeto();
}

function configurarEventosPainelProjeto() {
  const botaoVoltarProjetos = document.getElementById("btn-voltar-projetos");

  if (botaoVoltarProjetos && !botaoVoltarProjetos.dataset.configurado) {
    botaoVoltarProjetos.dataset.configurado = "true";
    botaoVoltarProjetos.addEventListener("click", function() {
      mostrarTela("tela-projetos");
    });
  }

  document.querySelectorAll("#tela-painel-projeto [data-modulo]").forEach(function(botao) {
    if (botao.dataset.configurado) {
      return;
    }

    botao.dataset.configurado = "true";

    botao.addEventListener("click", function() {
      abrirModulo(botao.dataset.modulo);
    });
  });

  const menuInicio = document.getElementById("menu-projeto-inicio");

  if (menuInicio && !menuInicio.dataset.configurado) {
    menuInicio.dataset.configurado = "true";

    menuInicio.addEventListener("click", function() {
      limparAreaModulo();

      document
        .querySelectorAll("#tela-painel-projeto .menu-inferior button")
        .forEach(function(botao) {
          botao.classList.remove("ativo");
        });

      menuInicio.classList.add("ativo");
    });
  }
}/* ============================================================
   MÓDULOS INTERNOS
============================================================ */

function definirMenuModulo(modulo) {
  document
    .querySelectorAll("#tela-painel-projeto .menu-inferior button")
    .forEach(function(botao) {
      botao.classList.remove("ativo");
    });

  const botao = document.querySelector(
    "#tela-painel-projeto .menu-inferior button[data-modulo='" + modulo + "']"
  );

  if (botao) {
    botao.classList.add("ativo");
  }
}

function limparAreaModulo() {
  const area = document.getElementById("area-modulo");

  if (area) {
    area.innerHTML = "";
  }
}

function abrirModulo(modulo) {
  if (!appState.projetoAtual) {
    alert("Abra um projeto primeiro.");
    mostrarTela("tela-projetos");
    return;
  }

  definirMenuModulo(modulo);

  if (modulo === "integrantes") {
    carregarIntegrantes();
    return;
  }

  if (modulo === "musicas") {
    carregarMusicas();
    return;
  }

  if (modulo === "repertorios") {
    carregarRepertorios();
    return;
  }

  if (modulo === "eventos") {
    carregarEventos();
    return;
  }
}

function montarFormularioModulo(titulo, descricao, campos, botaoTexto, callback) {
  const area = document.getElementById("area-modulo");

  if (!area) {
    return;
  }

  let html = `
    <div class="card-projeto">
      <span class="tag">Cadastro</span>
      <h3>${escaparHtml(titulo)}</h3>
      <p>${escaparHtml(descricao)}</p>
  `;

  campos.forEach(function(campo) {
    if (campo.tipo === "select") {
      html += `
        <select id="${escaparHtml(campo.id)}">
          <option value="">${escaparHtml(campo.placeholder)}</option>
          ${(campo.opcoes || [])
            .map(function(opcao) {
              return `<option value="${escaparHtml(opcao)}">${escaparHtml(opcao)}</option>`;
            })
            .join("")}
        </select>
      `;
    } else {
      html += `
        <input
          id="${escaparHtml(campo.id)}"
          type="${escaparHtml(campo.tipo || "text")}"
          placeholder="${escaparHtml(campo.placeholder)}"
        />
      `;
    }
  });

  html += `
      <button class="botao-card" id="btn-salvar-modulo" type="button">
        ${escaparHtml(botaoTexto)}
      </button>
    </div>
  `;

  area.innerHTML = html;

  const botao = document.getElementById("btn-salvar-modulo");

  if (botao) {
    botao.addEventListener("click", callback);
  }
}

function montarListaModulo(titulo, itens, renderItem) {
  const area = document.getElementById("area-modulo");

  if (!area) {
    return;
  }

  let html = area.innerHTML;

  html += `
    <div class="card-projeto">
      <span class="tag">Lista</span>
      <h3>${escaparHtml(titulo)}</h3>
  `;

  if (!itens || itens.length === 0) {
    html += `<p>Nenhum item cadastrado ainda.</p>`;
  } else {
    itens.forEach(function(item) {
      html += renderItem(item);
    });
  }

  html += `</div>`;

  area.innerHTML = html;
}

async function carregarIntegrantes() {
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Novo integrante",
    "Cadastre um músico ou administrador do projeto.",
    [
      {
        id: "integrante-nome",
        placeholder: "Nome do integrante"
      },
      {
        id: "integrante-funcao",
        placeholder: "Função"
      },
      {
        id: "integrante-email",
        placeholder: "E-mail",
        tipo: "email"
      }
    ],
    "Salvar integrante",
    criarIntegrante
  );

  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    montarListaModulo("Integrantes cadastrados", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Integrantes cadastrados", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.funcao || "Sem função")}
        ${item.email ? " • " + escaparHtml(item.email) : ""}
      </p>
    `;
  });
}

async function criarIntegrante() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const projetoId = obterProjetoAtualId();
  const nome = limparTexto(elemento("integrante-nome")?.value);
  const funcao = limparTexto(elemento("integrante-funcao")?.value);
  const email = limparTexto(elemento("integrante-email")?.value);

  if (!projetoId) {
    alert("Abra um projeto primeiro.");
    return;
  }

  if (!nome) {
    alert("Informe o nome do integrante.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      funcao: funcao,
      email: email
    });

  if (error) {
    alert("Erro ao salvar integrante: " + error.message);
    return;
  }

  carregarIntegrantes();
}

async function carregarMusicas() {
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Nova música",
    "Cadastre músicas para montar repertórios.",
    [
      {
        id: "musica-nome",
        placeholder: "Nome da música"
      },
      {
        id: "musica-artista",
        placeholder: "Artista / banda"
      },
      {
        id: "musica-tom",
        placeholder: "Tom"
      },
      {
        id: "musica-bpm",
        placeholder: "BPM",
        tipo: "number"
      }
    ],
    "Salvar música",
    criarMusica
  );

  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    montarListaModulo("Músicas cadastradas", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Músicas cadastradas", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.artista || "")}
        ${item.tom ? " • Tom: " + escaparHtml(item.tom) : ""}
        ${item.bpm ? " • BPM: " + escaparHtml(item.bpm) : ""}
      </p>
    `;
  });
}

async function criarMusica() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const projetoId = obterProjetoAtualId();
  const nome = limparTexto(elemento("musica-nome")?.value);
  const artista = limparTexto(elemento("musica-artista")?.value);
  const tom = limparTexto(elemento("musica-tom")?.value);
  const bpm = limparTexto(elemento("musica-bpm")?.value);

  if (!projetoId) {
    alert("Abra um projeto primeiro.");
    return;
  }

  if (!nome) {
    alert("Informe o nome da música.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      artista: artista,
      tom: tom,
      bpm: bpm ? Number(bpm) : null
    });

  if (error) {
    alert("Erro ao salvar música: " + error.message);
    return;
  }

  carregarMusicas();
}/* ============================================================
   REPERTÓRIOS
============================================================ */

async function carregarRepertorios() {
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Novo repertório",
    "Crie uma lista de músicas para show, ensaio ou evento.",
    [
      {
        id: "repertorio-nome",
        placeholder: "Nome do repertório"
      },
      {
        id: "repertorio-observacoes",
        placeholder: "Observações"
      }
    ],
    "Salvar repertório",
    criarRepertorio
  );

  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    montarListaModulo("Repertórios cadastrados", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Repertórios cadastrados", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.observacoes || "Sem observações")}
      </p>
    `;
  });
}

async function criarRepertorio() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const projetoId = obterProjetoAtualId();
  const nome = limparTexto(elemento("repertorio-nome")?.value);
  const observacoes = limparTexto(elemento("repertorio-observacoes")?.value);

  if (!projetoId) {
    alert("Abra um projeto primeiro.");
    return;
  }

  if (!nome) {
    alert("Informe o nome do repertório.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      observacoes: observacoes
    });

  if (error) {
    alert("Erro ao salvar repertório: " + error.message);
    return;
  }

  carregarRepertorios();
}

/* ============================================================
   EVENTOS
============================================================ */

async function carregarEventos() {
  const projetoId = obterProjetoAtualId();

  limparAreaModulo();

  montarFormularioModulo(
    "Novo evento",
    "Cadastre shows, ensaios e compromissos do projeto.",
    [
      {
        id: "evento-nome",
        placeholder: "Nome do evento"
      },
      {
        id: "evento-data",
        placeholder: "Data",
        tipo: "date"
      },
      {
        id: "evento-local",
        placeholder: "Local"
      },
      {
        id: "evento-observacoes",
        placeholder: "Observações"
      }
    ],
    "Salvar evento",
    criarEvento
  );

  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("data_evento", { ascending: true });

  if (error) {
    console.error(error);
    montarListaModulo("Eventos cadastrados", [], function() {
      return "";
    });
    return;
  }

  montarListaModulo("Eventos cadastrados", data || [], function(item) {
    return `
      <p>
        <strong>${escaparHtml(item.nome || "Sem nome")}</strong><br>
        ${escaparHtml(item.data_evento || "Sem data")}
        ${item.local ? " • " + escaparHtml(item.local) : ""}
      </p>
    `;
  });
}

async function criarEvento() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const projetoId = obterProjetoAtualId();
  const nome = limparTexto(elemento("evento-nome")?.value);
  const dataEvento = limparTexto(elemento("evento-data")?.value);
  const local = limparTexto(elemento("evento-local")?.value);
  const observacoes = limparTexto(elemento("evento-observacoes")?.value);

  if (!projetoId) {
    alert("Abra um projeto primeiro.");
    return;
  }

  if (!nome) {
    alert("Informe o nome do evento.");
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .insert({
      projeto_id: projetoId,
      nome: nome,
      data_evento: dataEvento || null,
      local: local,
      observacoes: observacoes
    });

  if (error) {
    alert("Erro ao salvar evento: " + error.message);
    return;
  }

  carregarEventos();
}

/* ============================================================
   EVENTOS FIXOS DA INTERFACE
============================================================ */

function configurarBotoesFixos() {
  const botaoGoogle = document.getElementById("btn-google");

  if (botaoGoogle) {
    botaoGoogle.addEventListener("click", entrarComGoogle);
  }

  const botaoLogin = document.getElementById("btn-login-email");

  if (botaoLogin) {
    botaoLogin.addEventListener("click", entrarComEmail);
  }

  const botaoCriarProjeto = document.getElementById("btn-criar-projeto");

  if (botaoCriarProjeto) {
    botaoCriarProjeto.addEventListener("click", criarProjeto);
  }

  document.querySelectorAll("[onclick]").forEach(function(item) {
    const acao = item.getAttribute("onclick");

    if (!acao) {
      return;
    }

    if (acao.includes("mostrarTela('tela-cadastro')")) {
      item.removeAttribute("onclick");
      item.addEventListener("click", function() {
        mostrarTela("tela-cadastro");
      });
    }

    if (acao.includes("mostrarTela('tela-login')")) {
      item.removeAttribute("onclick");
      item.addEventListener("click", function() {
        mostrarTela("tela-login");
      });
    }

    if (acao.includes("mostrarTela('tela-projetos')")) {
      item.removeAttribute("onclick");
      item.addEventListener("click", function() {
        mostrarTela("tela-projetos");
      });
    }

    if (acao.includes("mostrarTela('tela-novo-projeto')")) {
      item.removeAttribute("onclick");
      item.addEventListener("click", function() {
        mostrarTela("tela-novo-projeto");
      });
    }

    if (acao.includes("validarCadastro()")) {
      item.removeAttribute("onclick");
      item.addEventListener("click", validarCadastro);
    }

    if (acao.includes("sair()")) {
      item.removeAttribute("onclick");
      item.addEventListener("click", sair);
    }
  });
}

function configurarEnterNosCampos() {
  const campos = [
    document.getElementById("login-email"),
    document.getElementById("login-senha")
  ];

  campos.forEach(function(campo) {
    if (!campo) {
      return;
    }

    campo.addEventListener("keydown", function(evento) {
      if (evento.key === "Enter") {
        entrarComEmail();
      }
    });
  });
}

function configurarAuthListener() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  cliente.auth.onAuthStateChange(function(event, session) {
    if (session && session.user) {
      appState.sessao = session;
      appState.usuario = session.user;

      preencherUsuario(session.user);

      if (
        appState.telaAtual === "tela-login" ||
        appState.telaAtual === "tela-cadastro"
      ) {
        mostrarTela("tela-projetos", { registrar: false });
      }
    }

    if (event === "SIGNED_OUT") {
      appState.sessao = null;
      appState.usuario = null;
      appState.projetoAtual = null;

      localStorage.removeItem("projeto_atual");

      mostrarTela("tela-login", { registrar: false });
    }
  });
}

async function restaurarProjetoAtual() {
  const id = obterProjetoAtualId();

  if (!id) {
    return;
  }

  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    localStorage.removeItem("projeto_atual");
    return;
  }

  salvarProjetoAtual(data);
}

function prepararAplicacao() {
  configurarBotoesFixos();
  configurarEnterNosCampos();
  configurarAuthListener();
}

document.addEventListener("DOMContentLoaded", async function() {
  prepararAplicacao();
  await verificarSessao();
  await restaurarProjetoAtual();
});