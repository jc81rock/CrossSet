"use strict";

const REPERTORIO_FACIL = {
  urlApp: "https://jc81rock.github.io/RepertorioFacilNovo/",
  tabelas: {
    projetos: "projetos",
    integrantes: "integrantes",
    musicas: "musicas",
    repertorios: "repertorios",
    repertorioMusicas: "repertorio_musicas",
    progressoMusicas: "progresso_musicas",
    eventos: "eventos",
    convites: "convites_projeto"
  }
};

let appState = {
  usuario: null,
  sessao: null,
  telaAtual: "tela-login",
  historico: [],
  projetoAtual: null,
  integrantes: [],
  integranteEditandoId: null,
  musicas: [],
  musicaEditandoId: null,
  repertorios: [],
  repertorioEditandoId: null,
  repertorioMontandoId: null,
  repertorioMusicas: [],
  progressoMusicas: [],
  integrantesProjetoMusicas: [],
  meuIntegranteAtual: null,
  eventos: [],
  eventoEditandoId: null,
  conviteAtual: null
};

function sb() {
  if (typeof supabaseClient !== "undefined" && supabaseClient) {
    return supabaseClient;
  }

  alert("Supabase não carregado.");
  return null;
}

function elemento(id) {
  return document.getElementById(id);
}

function limparTexto(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).trim();
}

function escaparHtml(valor) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizarUF(valor) {
  return limparTexto(valor).toUpperCase().slice(0, 2);
}

function mostrarTela(idTela, opcoes = {}) {
  const telaSelecionada = elemento(idTela);

  if (!telaSelecionada) {
    console.warn("Tela não encontrada:", idTela);
    return;
  }

  const telaAnterior = appState.telaAtual;

  document.querySelectorAll(".tela").forEach(function(tela) {
    tela.classList.remove("tela-ativa");
  });

  telaSelecionada.classList.add("tela-ativa");
  appState.telaAtual = idTela;

  if (opcoes.registrar !== false && telaAnterior !== idTela) {
    appState.historico.push(telaAnterior);
  }

  if (idTela === "tela-projetos") {
    carregarProjetos();
  }

  if (idTela === "tela-painel-projeto") {
    carregarPainelProjeto();
  }
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
  const campo = elemento("nome-usuario");

  if (campo && usuario) {
    campo.textContent = "Olá, " + obterNomeUsuario(usuario);
  }
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

function obterCodigoConviteDaURL() {
  const params = new URLSearchParams(window.location.search);
  const codigoBusca = limparTexto(params.get("convite"));

  if (codigoBusca) {
    return codigoBusca;
  }

  const hashOriginal = window.location.hash || "";
  const hashLimpo = hashOriginal.replace(/^#/, "").replace(/^\?/, "");

  if (hashLimpo) {
    const paramsHash = new URLSearchParams(hashLimpo);
    const codigoHash = limparTexto(paramsHash.get("convite"));

    if (codigoHash) {
      return codigoHash;
    }

    const matchIgual = hashLimpo.match(/convite=([^&]+)/);
    if (matchIgual) {
      return decodeURIComponent(matchIgual[1]);
    }

    const matchRota = hashLimpo.match(/convite\/([^/?&]+)/);
    if (matchRota) {
      return decodeURIComponent(matchRota[1]);
    }
  }

  const pathMatch = window.location.pathname.match(/convite\/([^/?&]+)/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
}


function obterCodigoRepertorioDaURL() {
  const params = new URLSearchParams(window.location.search);
  const codigoBusca = limparTexto(params.get("repertorio"));

  if (codigoBusca) {
    return codigoBusca;
  }

  const hashOriginal = window.location.hash || "";
  const hashLimpo = hashOriginal.replace(/^#/, "").replace(/^\?/, "");

  if (hashLimpo) {
    const paramsHash = new URLSearchParams(hashLimpo);
    const codigoHash = limparTexto(paramsHash.get("repertorio"));

    if (codigoHash) {
      return codigoHash;
    }

    const matchIgual = hashLimpo.match(/repertorio=([^&]+)/);
    if (matchIgual) {
      return decodeURIComponent(matchIgual[1]);
    }

    const matchRota = hashLimpo.match(/repertorio\/([^/?&]+)/);
    if (matchRota) {
      return decodeURIComponent(matchRota[1]);
    }
  }

  const pathMatch = window.location.pathname.match(/repertorio\/([^/?&]+)/) || window.location.pathname.match(/r\/([^/?&]+)/);
  return pathMatch ? decodeURIComponent(pathMatch[1]) : "";
}

function obterCodigoConvitePendente() {
  return obterCodigoConviteDaURL() || localStorage.getItem("convite_pendente") || "";
}

function limparConvitePendente() {
  localStorage.removeItem("convite_pendente");

  const url = new URL(window.location.href);
  let mudou = false;

  if (url.searchParams.has("convite")) {
    url.searchParams.delete("convite");
    mudou = true;
  }

  const hashAtual = window.location.hash || "";
  if (hashAtual.includes("convite=")) {
    url.hash = "";
    mudou = true;
  }

  if (mudou) {
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }
}

async function verificarSessao() {
  const cliente = sb();

  if (!cliente) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const codigoRepertorio = obterCodigoRepertorioDaURL();
  if (codigoRepertorio) {
    await carregarRepertorioPublico(codigoRepertorio);
    return;
  }

  const codigoConvite = obterCodigoConviteDaURL();
  if (codigoConvite) {
    localStorage.setItem("convite_pendente", codigoConvite);
    await carregarConvitePublico(codigoConvite);
    return;
  }

  const { data, error } = await cliente.auth.getSession();

  if (error || !data.session) {
    appState.sessao = null;
    appState.usuario = null;
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  appState.sessao = data.session;
  appState.usuario = data.session.user;

  preencherUsuario(appState.usuario);
  mostrarTela("tela-projetos", { registrar: false });
}

async function entrarComGoogle() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: obterCodigoConvitePendente() ? (REPERTORIO_FACIL.urlApp + "#convite=" + encodeURIComponent(obterCodigoConvitePendente())) : REPERTORIO_FACIL.urlApp,
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error) {
    alert("Erro ao entrar com Google: " + error.message);
    return;
  }

  if (data && data.url) {
    window.location.href = data.url;
  }
}

async function entrarComEmail() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const email = limparTexto(elemento("login-email")?.value);
  const senha = limparTexto(elemento("login-senha")?.value);

  if (!email || !senha) {
    alert("Preencha e-mail e senha.");
    return;
  }

  const { data, error } = await cliente.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    alert("Erro ao entrar: " + error.message);
    return;
  }

  appState.sessao = data.session || null;
  appState.usuario = data.user || data.session?.user || null;

  preencherUsuario(appState.usuario);

  const codigoConvite = obterCodigoConvitePendente();
  if (codigoConvite) {
    localStorage.setItem("convite_pendente", codigoConvite);
    await carregarConvitePublico(codigoConvite);
    return;
  }

  mostrarTela("tela-projetos");
}

async function validarCadastro() {
  const cliente = sb();

  if (!cliente) {
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

  if (senha !== repetirSenha) {
    mostrarMensagemCadastro("erro", "As senhas não coincidem.");
    return;
  }

  const { data, error } = await cliente.auth.signUp({
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

  if (error) {
    mostrarMensagemCadastro("erro", "Erro ao criar conta: " + error.message);
    return;
  }

  const codigoConvite = obterCodigoConvitePendente();

  if (codigoConvite && data && data.session) {
    appState.sessao = data.session;
    appState.usuario = data.session.user;
    preencherUsuario(appState.usuario);
    await carregarConvitePublico(codigoConvite);
    return;
  }

  if (codigoConvite) {
    mostrarMensagemCadastro("sucesso", "Conta criada com sucesso. Faça login para aceitar o convite.");
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
}

async function carregarProjetos() {
  const grid = elemento("lista-projetos") || document.querySelector(".grid-projetos");
  const cliente = sb();

  if (!grid || !cliente) {
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
  const grid = elemento("lista-projetos") || document.querySelector(".grid-projetos");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  if (lista.length === 0) {
    grid.innerHTML = `
      <div class="card-projeto projeto-vazio">
        <div class="icone-mais">+</div>
        <h3>Você ainda não possui projetos.</h3>
        <p>Clique em <strong>Novo Projeto</strong> para criar seu primeiro projeto musical.</p>
      </div>
    `;
    return;
  }

  const textoBotao = lista.length === 1 ? "Entrar no Projeto" : "Acessar Projeto";

  lista.forEach(function(projeto) {
    grid.innerHTML += `
      <div class="card-projeto projeto-item">
        <div class="projeto-item-conteudo">
          <span class="tag">${escaparHtml(projeto.tipo || "Projeto")}</span>
          <h3>${escaparHtml(projeto.nome || "Sem nome")}</h3>
          <p>${escaparHtml(projeto.estilo || "Sem estilo informado")}</p>

          <div class="detalhes">
            <span>
              ${escaparHtml(projeto.cidade || "")}
              ${projeto.estado ? " • " + escaparHtml(projeto.estado) : ""}
            </span>
            <span>Projeto cadastrado</span>
          </div>
        </div>

        <button class="botao-card abrir-projeto" type="button" data-id="${escaparHtml(projeto.id)}">
          ${textoBotao}
        </button>
      </div>
    `;
  });

  document.querySelectorAll(".abrir-projeto").forEach(function(botao) {
    botao.addEventListener("click", function() {
      acessarProjeto(botao.dataset.id);
    });
  });
}

async function criarProjeto() {
  const cliente = sb();

  if (!cliente) {
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

  if (!cliente || !id) {
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
  garantirTelasInternas();
  mostrarTela("tela-painel-projeto");
}

function carregarPainelProjeto() {
  const projeto = appState.projetoAtual;

  if (!projeto) {
    return;
  }

  const nome = elemento("titulo-projeto");
  const subtitulo = elemento("subtitulo-projeto");

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

function garantirTelasInternas() {
  if (elemento("tela-painel-projeto")) {
    configurarEventosPainelProjeto();
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
    <style>
      .grid-modulos-painel {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(190px, 1fr)) !important;
        gap: 12px !important;
        align-items: stretch;
        width: 100%;
      }

      .grid-modulos-painel .card-projeto {
        min-height: 165px !important;
        padding: 16px !important;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        gap: 8px;
      }

      .grid-modulos-painel .tag {
        align-self: flex-start;
        font-size: 11px !important;
        padding: 5px 10px !important;
      }

      .grid-modulos-painel h3 {
        font-size: 21px !important;
        margin: 2px 0 0 !important;
        line-height: 1.08;
      }

      .grid-modulos-painel p {
        font-size: 13px !important;
        line-height: 1.28 !important;
        margin: 0 !important;
      }

      .grid-modulos-painel .botao-card {
        min-height: 34px !important;
        padding: 7px 10px !important;
        font-size: 13px !important;
        margin-top: auto;
        border-radius: 12px;
      }

      @media (max-width: 980px) {
        .grid-modulos-painel {
          grid-template-columns: repeat(3, minmax(180px, 1fr)) !important;
        }
      }

      @media (max-width: 760px) {
        .grid-modulos-painel {
          grid-template-columns: repeat(2, minmax(160px, 1fr)) !important;
        }
      }

      @media (max-width: 520px) {
        .grid-modulos-painel {
          grid-template-columns: 1fr !important;
        }
      }
    </style>

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

      <section class="grid-projetos grid-modulos-painel">
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
  const botaoVoltar = elemento("btn-voltar-projetos");

  if (botaoVoltar && !botaoVoltar.dataset.configurado) {
    botaoVoltar.dataset.configurado = "true";
    botaoVoltar.addEventListener("click", function() {
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

  const menuInicio = elemento("menu-projeto-inicio");

  if (menuInicio && !menuInicio.dataset.configurado) {
    menuInicio.dataset.configurado = "true";
    menuInicio.addEventListener("click", function() {
      limparAreaModulo();

      document.querySelectorAll("#tela-painel-projeto .menu-inferior button").forEach(function(botao) {
        botao.classList.remove("ativo");
      });

      menuInicio.classList.add("ativo");
    });
  }
}

function definirMenuModulo(modulo) {
  document.querySelectorAll("#tela-painel-projeto .menu-inferior button").forEach(function(botao) {
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
  const area = elemento("area-modulo");

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

  const area = elemento("area-modulo");
  if (area) {
    area.style.display = "block";
    area.style.width = "100%";
    area.style.gridColumn = "1 / -1";
  }

  if (modulo === "integrantes") {
    carregarIntegrantes();
    rolarParaModulo();
    return;
  }

  if (modulo === "musicas") {
    carregarMusicas();
    rolarParaModulo();
    return;
  }

  if (modulo === "repertorios") {
    carregarRepertorios();
    rolarParaModulo();
    return;
  }

  if (modulo === "eventos") {
    carregarEventos();
    rolarParaModulo();
    return;
  }
}

function rolarParaModulo() {
  const area = elemento("area-modulo");

  if (area) {
    setTimeout(function() {
      area.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }
}

function montarFormularioModulo(titulo, descricao, campos, botaoTexto, callback) {
  const area = elemento("area-modulo");

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
    html += `
      <input
        id="${escaparHtml(campo.id)}"
        type="${escaparHtml(campo.tipo || "text")}"
        placeholder="${escaparHtml(campo.placeholder)}"
      />
    `;
  });

  html += `
      <button class="botao-card" id="btn-salvar-modulo" type="button">
        ${escaparHtml(botaoTexto)}
      </button>
    </div>
  `;

  area.innerHTML = html;

  const botao = elemento("btn-salvar-modulo");

  if (botao) {
    botao.addEventListener("click", callback);
  }
}

function montarListaModulo(titulo, itens, renderItem) {
  const area = elemento("area-modulo");

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
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-integrantes {
        display: grid;
        grid-template-columns: minmax(280px, 380px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .form-integrantes {
        display: grid;
        gap: 10px;
      }

      .form-integrantes label,
      .filtros-integrantes label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-integrantes input,
      .form-integrantes select,
      .filtros-integrantes input,
      .filtros-integrantes select {
        width: 100%;
      }

      .linha-form-integrantes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .acoes-integrante {
        display: grid;
        gap: 8px;
        margin-top: 4px;
      }

      .btn-salvar-integrante-padrao,
      .btn-whatsapp-padrao {
        width: 100%;
        min-height: 42px !important;
        height: 42px !important;
        border: 0;
        border-radius: 13px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        font-size: 15px;
        font-weight: 600;
        transition: transform .15s ease, filter .15s ease;
      }

      .btn-salvar-integrante-padrao {
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
      }

      .btn-whatsapp-padrao {
        background: linear-gradient(135deg, #18bf5b, #16a34a);
        color: #ffffff;
        box-shadow: 0 10px 24px rgba(22, 163, 74, .18);
      }

      .btn-salvar-integrante-padrao:hover,
      .btn-whatsapp-padrao:hover {
        transform: translateY(-1px);
        filter: brightness(1.07);
      }

      .btn-whatsapp-padrao .seta-btn {
        margin-left: auto;
        padding-right: 4px;
        font-size: 18px;
      }

      .btn-whatsapp-padrao .icone-btn {
        width: 23px;
        height: 23px;
        border: 2px solid rgba(255,255,255,.88);
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        line-height: 1;
      }

      .botao-secundario-modulo {
        border: 0;
        border-radius: 12px;
        padding: 11px 14px;
        cursor: pointer;
        background: #eeeeee;
        color: #222;
        font-weight: 700;
      }

      .filtros-integrantes {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 10px;
        margin: 10px 0 14px;
      }

      .lista-integrantes {
        display: grid;
        gap: 10px;
      }

      .item-integrante {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 14px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-integrante-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .foto-integrante-placeholder {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #ffffff;
      }

      .dados-integrante {
        flex: 1;
      }

      .dados-integrante h4 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 17px;
      }

      .dados-integrante p {
        margin: 3px 0;
        font-size: 13px;
        color: #d1d5db;
      }

      .dados-integrante strong {
        color: #f3f4f6;
      }

      .tag-admin {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #7c3aed;
        color: #ffffff;
      }

      .tag-integrante {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #374151;
        color: #e5e7eb;
      }

      .botoes-item-integrante {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-integrante button {
        border: 0;
        border-radius: 10px;
        padding: 8px 12px;
        min-height: 34px;
        cursor: pointer;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .btn-editar-integrante {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-integrante {
        background: #fee2e2;
        color: #991b1b;
      }

      .desenvolvimento-integrante {
        margin-top: 12px;
        padding: 12px;
        border-radius: 13px;
        background: rgba(255, 255, 255, .055);
        border: 1px solid rgba(255, 255, 255, .10);
        display: grid;
        gap: 8px;
      }

      .desenvolvimento-integrante-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #f9fafb;
        font-size: 12px;
        font-weight: 700;
      }

      .desenvolvimento-integrante-percentual {
        font-size: 18px;
        font-weight: 800;
      }

      .desenvolvimento-integrante-percentual.verde { color: #22c55e; }
      .desenvolvimento-integrante-percentual.amarela { color: #facc15; }
      .desenvolvimento-integrante-percentual.vermelha { color: #ef4444; }

      .barra-desenvolvimento-integrante {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255, 255, 255, .10);
      }

      .barra-desenvolvimento-integrante span {
        display: block;
        height: 100%;
        border-radius: 999px;
        transition: width .2s ease;
      }

      .barra-desenvolvimento-integrante span.verde { background: #22c55e; }
      .barra-desenvolvimento-integrante span.amarela { background: #facc15; }
      .barra-desenvolvimento-integrante span.vermelha { background: #ef4444; }

      .desenvolvimento-integrante-contadores {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        font-size: 12px;
        color: #d1d5db;
      }

      .desenvolvimento-integrante-contadores strong {
        font-size: 14px;
        margin-right: 3px;
      }

      .contador-prontas strong { color: #22c55e; }
      .contador-estudo strong { color: #facc15; }
      .contador-nao strong { color: #ef4444; }

      .desenvolvimento-integrante-ajuda {
        color: #94a3b8;
        font-size: 11px;
        line-height: 1.35;
      }

      @media (max-width: 820px) {
        .modulo-integrantes,
        .linha-form-integrantes,
        .filtros-integrantes {
          grid-template-columns: 1fr;
        }

        .item-integrante-topo {
          flex-direction: column;
        }

        .botoes-item-integrante {
          justify-content: flex-start;
        }
      }
    </style>

    <div class="modulo-integrantes">
      <div class="card-projeto" id="card-form-repertorio">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-integrante">Novo integrante</h3>
        <p>Cadastre músicos, funções, instrumentos e administradores do projeto.</p>

        <div class="form-integrantes">
          <label>
            Nome
            <input id="integrante-nome" type="text" placeholder="Nome do integrante" />
          </label>

          <div class="linha-form-integrantes">
            <label>
              Função
              <input id="integrante-funcao" type="text" placeholder="Ex: Vocalista" />
            </label>

            <label>
              Instrumento
              <input id="integrante-instrumento" type="text" placeholder="Ex: Guitarra" />
            </label>
          </div>

          <label>
            Administrador
            <select id="integrante-administrador">
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </label>

          <label>
            E-mail
            <input id="integrante-email" type="email" placeholder="email@exemplo.com" />
          </label>

          <label>
            Telefone
            <input id="integrante-telefone" type="tel" placeholder="(00) 00000-0000" />
          </label>

          <div class="acoes-integrante">
            <button class="btn-salvar-integrante-padrao" id="btn-salvar-integrante" type="button"><span class="icone-btn">✓</span><span>Salvar integrante</span></button>
            <button class="btn-whatsapp-padrao" id="btn-convidar-integrante" type="button"><span class="icone-btn">☏</span><span>Convidar por WhatsApp</span><span class="seta-btn">→</span></button>
            <button class="botao-secundario-modulo" id="btn-cancelar-integrante" type="button" style="display:none;">Cancelar edição</button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Integrantes cadastrados</h3>
        <p>Pesquise, ordene, edite ou exclua integrantes deste projeto.</p>

        <div class="filtros-integrantes">
          <label>
            Pesquisar
            <input id="busca-integrantes" type="text" placeholder="Buscar por nome, função, instrumento, e-mail ou telefone" />
          </label>

          <label>
            Ordenar por
            <select id="ordenar-integrantes">
              <option value="nome">Nome</option>
              <option value="funcao">Função</option>
              <option value="instrumento">Instrumento</option>
              <option value="administrador">Administrador primeiro</option>
            </select>
          </label>
        </div>

        <div id="lista-integrantes" class="lista-integrantes">
          <p>Carregando integrantes...</p>
        </div>
      </div>
    </div>
  `;

  appState.integranteEditandoId = null;
  configurarEventosIntegrantes();
  await buscarIntegrantes();
}

function configurarEventosIntegrantes() {
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");
  const botaoConvidar = elemento("btn-convidar-integrante");
  const busca = elemento("busca-integrantes");
  const ordenar = elemento("ordenar-integrantes");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarIntegrante);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioIntegrante);
  }

  if (botaoConvidar) {
    botaoConvidar.addEventListener("click", gerarConviteIntegrante);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaIntegrantes);
  }

  if (ordenar) {
    ordenar.addEventListener("change", renderizarListaIntegrantes);
  }
}

async function buscarIntegrantes() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-integrantes");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const [integrantesResultado, musicasResultado, progressoResultado] = await Promise.all([
    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("id")
      .eq("projeto_id", projetoId),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ]);

  if (integrantesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(integrantesResultado.error.message)}</p>`;
    return;
  }

  if (musicasResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas do projeto: ${escaparHtml(musicasResultado.error.message)}</p>`;
    return;
  }

  if (progressoResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar desenvolvimento dos integrantes: ${escaparHtml(progressoResultado.error.message)}</p>`;
    return;
  }

  appState.integrantes = integrantesResultado.data || [];
  appState.musicas = musicasResultado.data || [];
  appState.progressoMusicas = progressoResultado.data || [];
  renderizarListaIntegrantes();
}


function obterDesenvolvimentoIntegrante(integranteId) {
  const musicas = appState.musicas || [];
  const progresso = appState.progressoMusicas || [];
  const total = musicas.length;

  if (!total) {
    return {
      percentual: 0,
      cor: "vermelha",
      prontas: 0,
      emEstudo: 0,
      naoIniciadas: 0,
      total: 0
    };
  }

  let pontos = 0;
  let prontas = 0;
  let emEstudo = 0;

  musicas.forEach(function(musica) {
    const registro = progresso.find(function(item) {
      return item.musica_id === musica.id && item.integrante_id === integranteId;
    });

    const status = registro?.status || "nao_iniciada";

    if (status === "pronta") {
      pontos += 1;
      prontas += 1;
      return;
    }

    if (status === "em_estudo") {
      pontos += 0.5;
      emEstudo += 1;
    }
  });

  const percentual = Math.round((pontos / total) * 100);
  const naoIniciadas = Math.max(total - prontas - emEstudo, 0);
  let cor = "vermelha";

  if (percentual === 100) {
    cor = "verde";
  } else if (percentual >= 50) {
    cor = "amarela";
  }

  return { percentual, cor, prontas, emEstudo, naoIniciadas, total };
}

function montarDesenvolvimentoIntegrante(integranteId) {
  const dados = obterDesenvolvimentoIntegrante(integranteId);

  const textoTotal = dados.total === 1 ? "1 música" : `${dados.total} músicas`;

  return `
    <div class="desenvolvimento-integrante">
      <div class="desenvolvimento-integrante-topo">
        <span>📈 Desenvolvimento no projeto</span>
        <span class="desenvolvimento-integrante-percentual ${dados.cor}">${dados.percentual}%</span>
      </div>
      <div class="barra-desenvolvimento-integrante" title="Desenvolvimento no projeto">
        <span class="${dados.cor}" style="width:${dados.percentual}%"></span>
      </div>
      <div class="desenvolvimento-integrante-contadores">
        <span class="contador-prontas"><strong>${dados.prontas}</strong> prontas</span>
        <span class="contador-estudo"><strong>${dados.emEstudo}</strong> em estudo</span>
        <span class="contador-nao"><strong>${dados.naoIniciadas}</strong> não iniciadas</span>
        <span>Total: ${textoTotal}</span>
      </div>
      <small class="desenvolvimento-integrante-ajuda">ⓘ O desenvolvimento é calculado com base no progresso individual deste integrante nas músicas da biblioteca do projeto.</small>
    </div>
  `;
}

function renderizarListaIntegrantes() {
  const lista = elemento("lista-integrantes");
  const busca = limparTexto(elemento("busca-integrantes")?.value).toLowerCase();
  const ordem = elemento("ordenar-integrantes")?.value || "nome";

  if (!lista) {
    return;
  }

  let itens = [...(appState.integrantes || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.funcao,
        item.instrumento,
        item.email,
        item.telefone,
        item.administrador ? "administrador sim" : "administrador não"
      ].join(" ").toLowerCase();

      return texto.includes(busca);
    });
  }

  itens.sort(function(a, b) {
    if (ordem === "administrador") {
      return Number(b.administrador === true) - Number(a.administrador === true) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "nome") {
      return compararTexto(a.nome, b.nome);
    }

    if (ordem === "funcao") {
      return compararTexto(a.funcao, b.funcao) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "instrumento") {
      return compararTexto(a.instrumento, b.instrumento) || compararTexto(a.nome, b.nome);
    }

    return compararTexto(a.nome, b.nome);
  });

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhum integrante encontrado.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const inicial = escaparHtml((item.nome || "?").trim().charAt(0).toUpperCase() || "?");

    return `
      <div class="item-integrante">
        <div class="item-integrante-topo">
          <div class="foto-integrante-placeholder">${inicial}</div>

          <div class="dados-integrante">
            <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
            <p><strong>Função:</strong> ${escaparHtml(item.funcao || "Não informada")}</p>
            <p><strong>Instrumento:</strong> ${escaparHtml(item.instrumento || "Não informado")}</p>
            <p><strong>E-mail:</strong> ${escaparHtml(item.email || "Não informado")}</p>
            <p><strong>Telefone:</strong> ${escaparHtml(item.telefone || "Não informado")}</p>
            ${item.administrador ? `<span class="tag-admin">Administrador</span>` : `<span class="tag-integrante">Integrante</span>`}
            ${montarDesenvolvimentoIntegrante(item.id)}
          </div>

          <div class="botoes-item-integrante">
            <button class="btn-editar-integrante btn-acao-editar" type="button" data-editar-integrante="${escaparHtml(item.id)}">✎ Editar</button>
            <button class="btn-excluir-integrante btn-acao-excluir" type="button" data-excluir-integrante="${escaparHtml(item.id)}">🗑 Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-editar-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarIntegrante(botao.dataset.editarIntegrante);
    });
  });

  lista.querySelectorAll("[data-excluir-integrante]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirIntegrante(botao.dataset.excluirIntegrante);
    });
  });
}

function compararTexto(a, b) {
  return limparTexto(a).localeCompare(limparTexto(b), "pt-BR", { sensitivity: "base" });
}

function obterDadosFormularioIntegrante() {
  return {
    nome: limparTexto(elemento("integrante-nome")?.value),
    funcao: limparTexto(elemento("integrante-funcao")?.value),
    instrumento: limparTexto(elemento("integrante-instrumento")?.value),
    administrador: elemento("integrante-administrador")?.value === "true",
    email: limparTexto(elemento("integrante-email")?.value),
    telefone: limparTexto(elemento("integrante-telefone")?.value)
  };
}

function preencherFormularioIntegrante(item) {
  if (!item) {
    return;
  }

  elemento("integrante-nome").value = item.nome || "";
  elemento("integrante-funcao").value = item.funcao || "";
  elemento("integrante-instrumento").value = item.instrumento || "";
  elemento("integrante-administrador").value = item.administrador ? "true" : "false";
  elemento("integrante-email").value = item.email || "";
  elemento("integrante-telefone").value = item.telefone || "";

  const titulo = elemento("titulo-form-integrante");
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");

  if (titulo) {
    titulo.textContent = "Editar integrante";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar alterações";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "inline-block";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparFormularioIntegrante() {
  appState.integranteEditandoId = null;

  [
    "integrante-nome",
    "integrante-funcao",
    "integrante-instrumento",
    "integrante-email",
    "integrante-telefone"
  ].forEach(function(id) {
    const campo = elemento(id);

    if (campo) {
      campo.value = "";
    }
  });

  const administrador = elemento("integrante-administrador");
  const titulo = elemento("titulo-form-integrante");
  const botaoSalvar = elemento("btn-salvar-integrante");
  const botaoCancelar = elemento("btn-cancelar-integrante");

  if (administrador) {
    administrador.value = "false";
  }

  if (titulo) {
    titulo.textContent = "Novo integrante";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar integrante";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "inline-flex";
  }
}

async function salvarIntegrante() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const dados = obterDadosFormularioIntegrante();

  if (!dados.nome) {
    alert("Informe o nome do integrante.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const payload = {
    projeto_id: projetoId,
    usuario_id: usuario.id,
    nome: dados.nome,
    funcao: dados.funcao,
    instrumento: dados.instrumento,
    administrador: dados.administrador,
    email: dados.email,
    telefone: dados.telefone
  };

  let resultado;

  if (appState.integranteEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .update(payload)
      .eq("id", appState.integranteEditandoId)
      .eq("projeto_id", projetoId);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar integrante: " + resultado.error.message);
    return;
  }

  limparFormularioIntegrante();
  await buscarIntegrantes();
}

function editarIntegrante(id) {
  const item = (appState.integrantes || []).find(function(integrante) {
    return integrante.id === id;
  });

  if (!item) {
    alert("Integrante não encontrado.");
    return;
  }

  appState.integranteEditandoId = id;
  preencherFormularioIntegrante(item);
}

async function excluirIntegrante(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir este integrante?");

  if (!confirmar) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir integrante: " + error.message);
    return;
  }

  if (appState.integranteEditandoId === id) {
    limparFormularioIntegrante();
  }

  await buscarIntegrantes();
}

async function criarIntegrante() {
  await salvarIntegrante();
}

function gerarCodigoConvite() {
  const parteTempo = Date.now().toString(36).toUpperCase();
  const parteAleatoria = Math.random().toString(36).slice(2, 8).toUpperCase();
  return (parteAleatoria + parteTempo).slice(0, 12);
}

async function gerarConviteIntegrante() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const projeto = appState.projetoAtual || {};
  const codigo = gerarCodigoConvite();
  const nomeAdmin = obterNomeUsuario(usuario);
  const nomeProjeto = projeto.nome || "Projeto musical";

  const link = REPERTORIO_FACIL.urlApp + "#convite=" + encodeURIComponent(codigo);
  const mensagem = [
    "🎵 Convite para participar do projeto " + nomeProjeto,
    "",
    "Olá!",
    "",
    nomeAdmin + " convidou você para entrar no projeto " + nomeProjeto + " pelo Repertório Fácil.",
    "",
    "Este convite é exclusivo para esse projeto. Ao aceitar, seus dados serão cadastrados diretamente dentro de " + nomeProjeto + ".",
    "",
    "Clique no link abaixo, preencha seu cadastro e aceite o convite:",
    link,
    "",
    "Se você ainda não possui conta, poderá criá-la durante o processo.",
    "",
    "Nos vemos no projeto! 🎸"
  ].join("\n");

  const payload = {
    projeto_id: projetoId,
    codigo: codigo,
    status: "pendente",
    papel: "integrante",
    criado_por: usuario.id,
    criado_por_nome: nomeAdmin,
    projeto_nome: nomeProjeto,
    link_convite: link,
    mensagem: mensagem
  };

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.convites)
    .insert(payload);

  if (error) {
    alert("Erro ao gerar convite: " + error.message);
    return;
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: "Convite Repertório Fácil",
        text: mensagem,
        url: link
      });
      return;
    }
  } catch (erroCompartilhar) {
    console.warn("Compartilhamento cancelado ou indisponível.", erroCompartilhar);
  }

  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(mensagem);
    } catch (erroClipboard) {
      console.warn("Não foi possível copiar automaticamente.", erroClipboard);
    }
  }

  window.open("https://wa.me/?text=" + encodeURIComponent(mensagem), "_blank");
  alert("Convite gerado. A mensagem também foi copiada para você enviar no WhatsApp.");
}

function garantirTelaConvite() {
  if (elemento("tela-convite")) {
    return;
  }

  const app = document.querySelector(".app");

  if (!app) {
    return;
  }

  const tela = document.createElement("section");
  tela.id = "tela-convite";
  tela.className = "tela";

  tela.innerHTML = `
    <div class="card-login" style="max-width:620px;">
      <img src="logo.png" alt="Repertório Fácil" class="logo-login" />
      <span class="tag">Convite</span>
      <h1 id="convite-titulo">Convite para projeto musical</h1>
      <p id="convite-descricao">Carregando convite...</p>

      <div id="convite-detalhes" style="margin:16px 0; display:grid; gap:8px;"></div>

      <div id="convite-acoes" style="display:grid; gap:10px;"></div>

      <button class="botao-link" id="btn-voltar-login-convite" type="button">
        Voltar para o login
      </button>
    </div>
  `;

  app.appendChild(tela);

  const voltar = elemento("btn-voltar-login-convite");
  if (voltar) {
    voltar.addEventListener("click", function() {
      mostrarTela("tela-login", { registrar: false });
    });
  }
}

async function carregarConvitePublico(codigo) {
  const cliente = sb();

  if (!cliente || !codigo) {
    return;
  }

  garantirTelaConvite();
  mostrarTela("tela-convite", { registrar: false });

  const detalhes = elemento("convite-detalhes");
  const descricao = elemento("convite-descricao");
  const acoes = elemento("convite-acoes");

  if (descricao) {
    descricao.textContent = "Buscando informações do convite...";
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.convites)
    .select("*")
    .eq("codigo", codigo)
    .single();

  if (error || !data) {
    if (descricao) {
      descricao.textContent = "Convite não encontrado ou expirado.";
    }
    if (detalhes) {
      detalhes.innerHTML = "";
    }
    if (acoes) {
      acoes.innerHTML = `<button class="botao-principal" type="button" id="btn-ir-login-convite">Ir para o login</button>`;
      elemento("btn-ir-login-convite")?.addEventListener("click", function() {
        mostrarTela("tela-login", { registrar: false });
      });
    }
    return;
  }

  appState.conviteAtual = data;
  localStorage.setItem("convite_pendente", codigo);

  const dadosPendentesGmail = obterDadosConviteTemporario(codigo);
  const { data: sessaoParaConvite } = await cliente.auth.getSession();
  const usuarioLogado = sessaoParaConvite.session?.user;

  if (usuarioLogado && dadosPendentesGmail) {
    if (descricao) {
      descricao.textContent = "Finalizando seu cadastro no projeto...";
    }
    if (detalhes) {
      detalhes.innerHTML = `<p>Salvando seus dados em ${escaparHtml(data.projeto_nome || "Projeto musical")}...</p>`;
    }
    if (acoes) {
      acoes.innerHTML = "";
    }
    await aceitarConviteComUsuario(usuarioLogado, {
      nome: dadosPendentesGmail.nome,
      funcao: dadosPendentesGmail.funcao,
      instrumento: dadosPendentesGmail.instrumento,
      telefone: dadosPendentesGmail.telefone,
      email: usuarioLogado.email || ""
    });
    return;
  }

  if (descricao) {
    descricao.textContent = "Preencha seus dados para aceitar o convite. Este cadastro será vinculado somente ao projeto informado abaixo.";
  }

  if (detalhes) {
    detalhes.innerHTML = `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px; background:#111827; color:#f9fafb;">
        <p style="margin:0 0 6px; color:#d1d5db; font-size:13px;">Projeto</p>
        <h3 style="margin:0 0 12px; font-size:24px;">${escaparHtml(data.projeto_nome || "Projeto musical")}</h3>
        <p style="margin:3px 0;"><strong>Convidado por:</strong> ${escaparHtml(data.criado_por_nome || "Administrador")}</p>
        <p style="margin:3px 0;"><strong>Função:</strong> ${data.papel === "administrador" ? "Administrador" : "Integrante"}</p>
        <p style="margin:10px 0 0; color:#d1d5db; font-size:13px;">Este convite é exclusivo para este projeto. Você não escolherá outro projeto: ao aceitar, seus dados serão salvos diretamente aqui.</p>
      </div>
    `;
  }

  if (acoes) {
    acoes.innerHTML = `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px; background:#0b1220; display:grid; gap:10px; text-align:left;">
        <h3 style="margin:0; color:#ffffff;">Criar cadastro e aceitar convite</h3>
        <p style="margin:0; color:#d1d5db; font-size:13px;">Este convite é exclusivo para o projeto <strong>${escaparHtml(data.projeto_nome || 'Projeto musical')}</strong>. Para entrar nele, preencha seus dados abaixo. Você pode criar acesso com e-mail e senha ou entrar com Gmail. O cadastro será salvo diretamente como integrante deste projeto.</p>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          Nome completo
          <input id="convite-cadastro-nome" type="text" placeholder="Seu nome" />
        </label>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Função
            <input id="convite-cadastro-funcao" type="text" placeholder="Ex: Guitarrista" />
          </label>

          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Instrumento
            <input id="convite-cadastro-instrumento" type="text" placeholder="Ex: Guitarra" />
          </label>
        </div>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          WhatsApp / Telefone
          <input id="convite-cadastro-telefone" type="tel" placeholder="(00) 00000-0000" />
        </label>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          E-mail
          <input id="convite-cadastro-email" type="email" placeholder="email@exemplo.com" />
        </label>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Senha
            <input id="convite-cadastro-senha" type="password" placeholder="Senha" />
          </label>

          <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
            Repetir senha
            <input id="convite-cadastro-repetir-senha" type="password" placeholder="Repetir senha" />
          </label>
        </div>

        <button class="botao-principal" id="btn-criar-conta-aceitar-convite" type="button">Aceitar convite e entrar no projeto</button>

        <div class="divisor" style="margin:4px 0;">
          <span></span>
          <p>ou</p>
          <span></span>
        </div>

        <button class="botao-google" id="btn-gmail-aceitar-convite" type="button" style="min-height:42px;">
          <img src="logo_gmail.webp" alt="Gmail" style="width:22px;height:22px;object-fit:contain;margin-right:8px;vertical-align:middle;" />
          Entrar com Gmail e entrar no projeto
        </button>
      </div>
    `;

    elemento("btn-criar-conta-aceitar-convite")?.addEventListener("click", criarContaEAceitarConvite);
    elemento("btn-gmail-aceitar-convite")?.addEventListener("click", entrarComGmailEAceitarConvite);
  }
}


function obterDadosCadastroConvite() {
  return {
    nome: limparTexto(elemento("convite-cadastro-nome")?.value),
    funcao: limparTexto(elemento("convite-cadastro-funcao")?.value) || "Integrante",
    instrumento: limparTexto(elemento("convite-cadastro-instrumento")?.value),
    telefone: limparTexto(elemento("convite-cadastro-telefone")?.value),
    email: limparTexto(elemento("convite-cadastro-email")?.value),
    senha: limparTexto(elemento("convite-cadastro-senha")?.value),
    repetirSenha: limparTexto(elemento("convite-cadastro-repetir-senha")?.value)
  };
}

function salvarDadosConviteTemporario(codigo, dados) {
  if (!codigo || !dados) {
    return;
  }

  localStorage.setItem("convite_dados_pendentes", JSON.stringify({
    codigo: codigo,
    dados: {
      nome: dados.nome || "",
      funcao: dados.funcao || "Integrante",
      instrumento: dados.instrumento || "",
      telefone: dados.telefone || ""
    }
  }));
}

function obterDadosConviteTemporario(codigo) {
  const bruto = localStorage.getItem("convite_dados_pendentes");

  if (!bruto || !codigo) {
    return null;
  }

  try {
    const parsed = JSON.parse(bruto);

    if (parsed && parsed.codigo === codigo) {
      return parsed.dados || null;
    }
  } catch (erro) {
    console.warn("Dados temporários do convite inválidos.", erro);
  }

  return null;
}

function limparDadosConviteTemporario() {
  localStorage.removeItem("convite_dados_pendentes");
}

async function entrarComGmailEAceitarConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const dados = obterDadosCadastroConvite();

  if (!dados.nome) {
    alert("Informe seu nome antes de entrar com Gmail.");
    return;
  }

  salvarDadosConviteTemporario(convite.codigo, dados);
  localStorage.setItem("convite_pendente", convite.codigo);

  const { data, error } = await cliente.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: REPERTORIO_FACIL.urlApp + "#convite=" + encodeURIComponent(convite.codigo),
      skipBrowserRedirect: true,
      queryParams: {
        prompt: "select_account"
      }
    }
  });

  if (error) {
    alert("Erro ao entrar com Gmail: " + error.message);
    return;
  }

  if (data && data.url) {
    window.location.href = data.url;
  }
}

async function criarContaEAceitarConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const dadosFormulario = obterDadosCadastroConvite();
  const nome = dadosFormulario.nome;
  const funcao = dadosFormulario.funcao;
  const instrumento = dadosFormulario.instrumento;
  const telefone = dadosFormulario.telefone;
  const email = dadosFormulario.email;
  const senha = dadosFormulario.senha;
  const repetirSenha = dadosFormulario.repetirSenha;

  if (!nome) {
    alert("Informe seu nome.");
    return;
  }

  if (!email) {
    alert("Informe seu e-mail.");
    return;
  }

  if (!senha) {
    alert("Informe sua senha.");
    return;
  }

  if (senha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (senha !== repetirSenha) {
    alert("As senhas não coincidem.");
    return;
  }

  const botaoConvite = elemento("btn-criar-conta-aceitar-convite");
  if (botaoConvite) {
    botaoConvite.disabled = true;
    botaoConvite.textContent = "Salvando cadastro...";
  }

  const dadosPerfil = {
    nome: nome,
    funcao: funcao,
    instrumento: instrumento,
    telefone: telefone,
    email: email
  };

  let usuario = null;

  const { data: sessaoAtual } = await cliente.auth.getSession();
  if (sessaoAtual.session) {
    await cliente.auth.signOut();
  }

  const { data: cadastroData, error: cadastroError } = await cliente.auth.signUp({
    email: email,
    password: senha,
    options: {
      emailRedirectTo: REPERTORIO_FACIL.urlApp + "#convite=" + encodeURIComponent(convite.codigo),
      data: {
        nome: nome,
        full_name: nome,
        telefone: telefone,
        funcao: funcao,
        instrumento: instrumento
      }
    }
  });

  if (cadastroError) {
    if (botaoConvite) {
      botaoConvite.disabled = false;
      botaoConvite.textContent = "Aceitar convite e entrar no projeto";
    }
    alert("Erro ao criar conta: " + cadastroError.message);
    return;
  }

  usuario = cadastroData.user || cadastroData.session?.user || null;

  if (!cadastroData.session) {
    const { data: loginData, error: loginError } = await cliente.auth.signInWithPassword({
      email: email,
      password: senha
    });

    if (!loginError && loginData) {
      usuario = loginData.user || loginData.session?.user || usuario;
    }
  }

  if (!usuario) {
    if (botaoConvite) {
      botaoConvite.disabled = false;
      botaoConvite.textContent = "Aceitar convite e entrar no projeto";
    }
    alert("Não foi possível criar a conta. Tente novamente.");
    return;
  }

  await aceitarConviteComUsuario(usuario, dadosPerfil);
}

async function aceitarConviteAtual() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    localStorage.setItem("convite_pendente", convite.codigo);
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  await aceitarConviteComUsuario(usuario);
}

async function aceitarConviteComUsuario(usuario, dadosPerfil = {}) {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite || !usuario) {
    return;
  }

  if (convite.status && convite.status !== "pendente") {
    alert("Este convite já foi utilizado ou não está mais disponível.");
    return;
  }

  const projetoId = convite.projeto_id;
  const nomeUsuario = limparTexto(dadosPerfil.nome) || obterNomeUsuario(usuario);
  const emailUsuario = limparTexto(dadosPerfil.email) || usuario.email || "";
  const funcaoUsuario = limparTexto(dadosPerfil.funcao) || "Integrante";
  const instrumentoUsuario = limparTexto(dadosPerfil.instrumento);
  const telefoneUsuario = limparTexto(dadosPerfil.telefone);

  const { data: existente, error: erroBusca } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (erroBusca) {
    alert("Erro ao verificar integrante: " + erroBusca.message);
    return;
  }

  let emailJaCadastrado = null;
  if (emailUsuario) {
    const { data: existenteEmail, error: erroEmail } = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("id")
      .eq("projeto_id", projetoId)
      .eq("email", emailUsuario)
      .maybeSingle();

    if (erroEmail) {
      alert("Erro ao verificar e-mail do integrante: " + erroEmail.message);
      return;
    }

    emailJaCadastrado = existenteEmail;
  }

  if (existente || emailJaCadastrado) {
    alert("Este e-mail já está cadastrado como integrante deste projeto.");
    return;
  }

  if (!existente) {
    const { error: erroInserir } = await cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .insert({
        projeto_id: projetoId,
        usuario_id: usuario.id,
        nome: nomeUsuario,
        funcao: funcaoUsuario,
        instrumento: instrumentoUsuario,
        administrador: convite.papel === "administrador",
        email: emailUsuario,
        telefone: telefoneUsuario
      });

    if (erroInserir) {
      alert("Erro ao aceitar convite: " + erroInserir.message);
      return;
    }
  }

  await cliente
    .from(REPERTORIO_FACIL.tabelas.convites)
    .update({
      status: "aceito",
      aceito_em: new Date().toISOString(),
      aceito_por: usuario.id
    })
    .eq("id", convite.id);

  let projeto = null;
  const { data: projetoData } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", projetoId)
    .maybeSingle();

  projeto = projetoData || {
    id: projetoId,
    nome: convite.projeto_nome || "Projeto musical",
    estilo: "Projeto musical",
    cidade: "",
    estado: ""
  };

  salvarProjetoAtual(projeto);
  limparConvitePendente();
  limparDadosConviteTemporario();
  appState.conviteAtual = null;

  try {
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, REPERTORIO_FACIL.urlApp + "#");
    }
  } catch (erroUrl) {
    console.warn("Não foi possível limpar a URL do convite.", erroUrl);
  }

  mostrarToast?.("Cadastro salvo. Bem-vindo ao projeto " + (projeto.nome || "musical") + "!");
  abrirPainelProjeto();
}

async function carregarMusicas() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-musicas {
        display: grid;
        grid-template-columns: minmax(280px, 380px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .form-musicas {
        display: grid;
        gap: 10px;
      }

      .form-musicas label,
      .filtros-musicas label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-musicas input,
      .form-musicas textarea,
      .filtros-musicas input,
      .filtros-musicas select {
        width: 100%;
      }

      .form-musicas textarea {
        min-height: 92px !important;
        resize: vertical;
      }

      .linha-form-musicas {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        align-items: start;
      }

      .linha-form-musicas .ajuda-bpm-musica {
        grid-column: 2;
        margin-top: -4px;
      }

      .acoes-musica {
        display: grid;
        gap: 8px;
        margin-top: 4px;
      }

      .btn-principal-musica,
      .btn-secundario-musica {
        width: 100%;
        min-height: 42px !important;
        height: 42px !important;
        border: 0;
        border-radius: 13px;
        cursor: pointer;
        font-size: 15px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: transform .15s ease, filter .15s ease, opacity .15s ease;
      }

      .btn-principal-musica {
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff);
        color: #ffffff;
      }

      .btn-secundario-musica {
        background: rgba(255, 255, 255, .08);
        border: 1px solid rgba(255, 255, 255, .14);
        color: #f9fafb;
      }

      .btn-principal-musica:hover,
      .btn-secundario-musica:hover {
        transform: translateY(-1px);
        filter: brightness(1.08);
      }

      .filtros-musicas {
        display: grid;
        grid-template-columns: 1.4fr 1fr;
        gap: 10px;
        margin: 10px 0 14px;
      }

      .lista-musicas {
        display: grid;
        gap: 10px;
      }

      .item-musica {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 14px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-musica-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }

      .icone-musica-placeholder {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #ffffff;
      }

      .dados-musica {
        flex: 1;
        min-width: 0;
      }

      .dados-musica h4 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 17px;
      }

      .dados-musica p {
        margin: 3px 0;
        font-size: 13px;
        color: #d1d5db;
      }

      .dados-musica strong {
        color: #f3f4f6;
      }

      .meta-musica {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 8px 0;
      }

      .pill-musica {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(122, 92, 255, .18);
        border: 1px solid rgba(122, 92, 255, .38);
        color: #d9d3ff;
        font-size: 12px;
        font-weight: 700;
      }

      .link-musica {
        color: #93c5fd;
        font-size: 13px;
        text-decoration: none;
        font-weight: 700;
      }

      .link-musica:hover {
        text-decoration: underline;
      }

      .ajuda-campo-musica {
        margin: -4px 0 2px;
        color: #9db2d6;
        font-size: 11px;
        line-height: 1.35;
      }

      .indicadores-musica {
        display: flex;
        gap: 8px;
        align-items: center;
        margin: 6px 0 4px;
      }

      .indicador-conteudo-musica {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 10px;
        background: rgba(255, 255, 255, .08);
        border: 1px solid rgba(255, 255, 255, .12);
        font-size: 15px;
        cursor: default;
      }

      .progresso-musica-card {
        display: grid;
        gap: 8px;
        margin: 9px 0 7px;
        padding: 10px;
        border-radius: 12px;
        background: rgba(255, 255, 255, .055);
        border: 1px solid rgba(255, 255, 255, .10);
      }

      .progresso-musica-resumo {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 12px;
        color: #d1d5db;
      }

      .progresso-musica-percentual {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-size: 13px;
        font-weight: 700;
        color: #f9fafb;
      }

      .bolinha-status-musica {
        width: 11px;
        height: 11px;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 0 2px rgba(255,255,255,.08);
      }

      .bolinha-status-musica.vermelha { background: #ef4444; }
      .bolinha-status-musica.amarela { background: #facc15; }
      .bolinha-status-musica.verde { background: #22c55e; }

      .barra-progresso-musica {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        overflow: hidden;
        background: rgba(255,255,255,.10);
      }

      .barra-progresso-musica span {
        display: block;
        height: 100%;
        border-radius: 999px;
        transition: width .2s ease;
      }

      .barra-progresso-musica span.vermelha { background: #ef4444; }
      .barra-progresso-musica span.amarela { background: #facc15; }
      .barra-progresso-musica span.verde { background: #22c55e; }

      .progresso-musica-ajuda {
        display: block;
        margin-top: -2px;
        font-size: 11px;
        line-height: 1.35;
        color: #94a3b8;
      }

      .meu-progresso-musica {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 2px;
      }

      .meu-progresso-musica span {
        font-size: 12px;
        color: #cbd5e1;
        margin-right: 2px;
      }

      .btn-status-musica {
        width: 25px;
        height: 25px;
        border-radius: 50%;
        border: 2px solid rgba(255,255,255,.16);
        cursor: pointer;
        font-size: 0;
        transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
      }

      .btn-status-musica:hover {
        transform: translateY(-1px) scale(1.04);
      }

      .btn-status-musica.ativo {
        border-color: #ffffff;
        box-shadow: 0 0 0 3px rgba(255,255,255,.18);
      }

      .btn-status-musica.vermelha { background: #ef4444; }
      .btn-status-musica.amarela { background: #facc15; }
      .btn-status-musica.verde { background: #22c55e; }

      .botoes-item-musica {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-musica button {
        border: 0;
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .btn-editar-musica {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-musica {
        background: #fee2e2;
        color: #991b1b;
      }

      @media (max-width: 820px) {
        .modulo-musicas,
        .linha-form-musicas,
        .filtros-musicas {
          grid-template-columns: 1fr;
        }

        .linha-form-musicas .ajuda-bpm-musica {
          grid-column: 1;
        }

        .item-musica-topo {
          flex-direction: column;
        }

        .botoes-item-musica {
          justify-content: flex-start;
        }
      }
    </style>

    <div class="modulo-musicas">
      <div class="card-projeto">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-musica">Nova música</h3>
        <p>Cadastre a biblioteca de músicas do projeto com tom, BPM, link, letra e material musical.</p>

        <div class="form-musicas">
          <label>
            Nome da música
            <input id="musica-nome" type="text" placeholder="Ex: Sweet Child O' Mine" />
          </label>

          <label>
            Artista / Banda
            <input id="musica-artista" type="text" placeholder="Ex: Guns N' Roses" />
          </label>

          <div class="linha-form-musicas">
            <label>
              Tom
              <input id="musica-tom" type="text" placeholder="Ex: D, Em, G" />
            </label>

            <label>
              BPM
              <input id="musica-bpm" type="number" inputmode="numeric" placeholder="Ex: 120" />
            </label>
            <small class="ajuda-campo-musica ajuda-bpm-musica">Velocidade da música (contagem aproximada)</small>
          </div>

          <label>
            Link
            <input id="musica-link" type="url" placeholder="YouTube, Spotify, Deezer..." />
            <small class="ajuda-campo-musica">Cole um link do YouTube, Spotify ou Deezer.</small>
          </label>

          <label>
            Material Musical
            <textarea id="musica-material-musical" placeholder="Cole aqui a cifra, tablatura ou partitura da música (opcional)."></textarea>
          </label>

          <label>
            Letra
            <textarea id="musica-letra" placeholder="Cole aqui a letra da música (opcional)."></textarea>
          </label>

          <label>
            Observações
            <textarea id="musica-observacoes" placeholder="Ex: solo em 2:34, versão acústica, baixar meio tom..."></textarea>
          </label>

          <div class="acoes-musica">
            <button class="btn-principal-musica" id="btn-salvar-musica" type="button">
              <span>＋</span>
              <span>Adicionar música</span>
            </button>
            <button class="btn-secundario-musica" id="btn-cancelar-musica" type="button" style="display:none;">
              Cancelar edição
            </button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Músicas cadastradas</h3>
        <p>Pesquise, ordene, edite ou exclua músicas deste projeto.</p>

        <div class="filtros-musicas">
          <label>
            Pesquisar
            <input id="busca-musicas" type="text" placeholder="Buscar por nome, artista, tom, BPM ou observação" />
          </label>

          <label>
            Ordenar por
            <select id="ordenar-musicas">
              <option value="recentes">Mais recentes</option>
              <option value="nome">Nome</option>
              <option value="artista">Artista</option>
              <option value="tom">Tom</option>
              <option value="bpm">BPM</option>
            </select>
          </label>
        </div>

        <div id="lista-musicas" class="lista-musicas">
          <p>Carregando músicas...</p>
        </div>
      </div>
    </div>
  `;

  appState.musicaEditandoId = null;
  configurarEventosMusicas();
  await buscarMusicas();
}

function configurarEventosMusicas() {
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");
  const busca = elemento("busca-musicas");
  const ordenar = elemento("ordenar-musicas");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarMusica);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioMusica);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaMusicas);
  }

  if (ordenar) {
    ordenar.addEventListener("change", renderizarListaMusicas);
  }
}

async function buscarMusicas() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-musicas");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user || null;

  const [musicasResultado, integrantesResultado, progressoResultado] = await Promise.all([
    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("created_at", { ascending: false }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ]);

  if (musicasResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas: ${escaparHtml(musicasResultado.error.message)}</p>`;
    return;
  }

  if (integrantesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(integrantesResultado.error.message)}</p>`;
    return;
  }

  if (progressoResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar progresso das músicas: ${escaparHtml(progressoResultado.error.message)}</p>`;
    return;
  }

  appState.musicas = musicasResultado.data || [];
  appState.integrantesProjetoMusicas = integrantesResultado.data || [];
  appState.progressoMusicas = progressoResultado.data || [];
  appState.meuIntegranteAtual = encontrarMeuIntegranteNoProjeto(appState.integrantesProjetoMusicas, usuario);

  renderizarListaMusicas();
}

function obterLinkMusica(item) {
  return item.link_url || item.link || item.youtube_url || item.spotify_url || "";
}

function encontrarMeuIntegranteNoProjeto(integrantes, usuario) {
  if (!usuario) {
    return null;
  }

  return (integrantes || []).find(function(integrante) {
    return integrante.usuario_id === usuario.id || integrante.user_id === usuario.id;
  }) || null;
}

function obterProgressoDaMusica(musicaId) {
  const integrantes = appState.integrantesProjetoMusicas || [];
  const progresso = appState.progressoMusicas || [];

  if (!integrantes.length) {
    return { percentual: 0, prontas: 0, total: 0, cor: "vermelha" };
  }

  let pontos = 0;
  let prontas = 0;

  integrantes.forEach(function(integrante) {
    const registro = progresso.find(function(item) {
      return item.musica_id === musicaId && item.integrante_id === integrante.id;
    });

    const status = registro?.status || "nao_iniciada";

    if (status === "pronta") {
      pontos += 1;
      prontas += 1;
      return;
    }

    if (status === "em_estudo") {
      pontos += 0.5;
    }
  });

  const percentual = Math.round((pontos / integrantes.length) * 100);
  let cor = "vermelha";

  if (percentual === 100) {
    cor = "verde";
  } else if (percentual >= 50) {
    cor = "amarela";
  }

  return { percentual: percentual, prontas: prontas, total: integrantes.length, cor: cor };
}

function obterMeuStatusMusica(musicaId) {
  const meuIntegrante = appState.meuIntegranteAtual;

  if (!meuIntegrante) {
    return "nao_iniciada";
  }

  const registro = (appState.progressoMusicas || []).find(function(item) {
    return item.musica_id === musicaId && item.integrante_id === meuIntegrante.id;
  });

  return registro?.status || "nao_iniciada";
}

function montarControleMeuProgresso(musicaId) {
  if (!appState.meuIntegranteAtual) {
    return "";
  }

  const statusAtual = obterMeuStatusMusica(musicaId);

  return `
    <div class="meu-progresso-musica" aria-label="Meu progresso nesta música">
      <span>Meu progresso:</span>
      <button class="btn-status-musica vermelha ${statusAtual === "nao_iniciada" ? "ativo" : ""}" type="button" title="Não iniciada" data-status-musica="nao_iniciada" data-musica-id="${escaparHtml(musicaId)}">Não iniciada</button>
      <button class="btn-status-musica amarela ${statusAtual === "em_estudo" ? "ativo" : ""}" type="button" title="Em estudo" data-status-musica="em_estudo" data-musica-id="${escaparHtml(musicaId)}">Em estudo</button>
      <button class="btn-status-musica verde ${statusAtual === "pronta" ? "ativo" : ""}" type="button" title="Pronta" data-status-musica="pronta" data-musica-id="${escaparHtml(musicaId)}">Pronta</button>
    </div>
  `;
}

function montarResumoProgressoMusica(musicaId) {
  const progresso = obterProgressoDaMusica(musicaId);

  const textoProntas = progresso.total > 0
    ? `${progresso.prontas} de ${progresso.total} integrantes prontos`
    : "Sem integrantes";

  return `
    <div class="progresso-musica-card">
      <div class="progresso-musica-resumo">
        <span class="progresso-musica-percentual">
          <i class="bolinha-status-musica ${progresso.cor}"></i>
          ${progresso.percentual}%
        </span>
        <span>${textoProntas}</span>
      </div>
      <div class="barra-progresso-musica" title="Progresso da música">
        <span class="${progresso.cor}" style="width:${progresso.percentual}%"></span>
      </div>
      <small class="progresso-musica-ajuda">ⓘ O percentual representa o progresso coletivo da banda nesta música.</small>
      ${montarControleMeuProgresso(musicaId)}
    </div>
  `;
}

function renderizarListaMusicas() {
  const lista = elemento("lista-musicas");
  const busca = limparTexto(elemento("busca-musicas")?.value).toLowerCase();
  const ordem = elemento("ordenar-musicas")?.value || "recentes";

  if (!lista) {
    return;
  }

  let itens = [...(appState.musicas || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.artista,
        item.tom,
        item.bpm,
        obterLinkMusica(item),
        item.material_musical,
        item.letra,
        item.observacoes
      ].join(" ").toLowerCase();
      return texto.includes(busca);
    });
  }

  itens.sort(function(a, b) {
    if (ordem === "nome") {
      return compararTexto(a.nome, b.nome);
    }

    if (ordem === "artista") {
      return compararTexto(a.artista, b.artista) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "tom") {
      return compararTexto(a.tom, b.tom) || compararTexto(a.nome, b.nome);
    }

    if (ordem === "bpm") {
      return (Number(a.bpm || 0) - Number(b.bpm || 0)) || compararTexto(a.nome, b.nome);
    }

    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhuma música encontrada.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const link = obterLinkMusica(item);
    const linkSeguro = escaparHtml(link);
    const temLetra = limparTexto(item.letra).length > 0;
    const temMaterial = limparTexto(item.material_musical).length > 0;
    const indicadores = [
      temLetra ? `<span class="indicador-conteudo-musica" title="Letra disponível" aria-label="Letra disponível">📄</span>` : "",
      temMaterial ? `<span class="indicador-conteudo-musica" title="Material musical disponível" aria-label="Material musical disponível">🎼</span>` : ""
    ].filter(Boolean).join("");

    return `
      <div class="item-musica">
        <div class="item-musica-topo">
          <div class="icone-musica-placeholder">♪</div>

          <div class="dados-musica">
            <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
            <p><strong>Artista:</strong> ${escaparHtml(item.artista || "Não informado")}</p>

            <div class="meta-musica">
              <span class="pill-musica">Tom: ${escaparHtml(item.tom || "-")}</span>
              <span class="pill-musica">BPM: ${escaparHtml(item.bpm || "-")}</span>
            </div>

            ${montarResumoProgressoMusica(item.id)}

            ${indicadores ? `<div class="indicadores-musica">${indicadores}</div>` : ""}

            ${link ? `<p><a class="link-musica" href="${linkSeguro}" target="_blank" rel="noopener noreferrer">▶ Assistir / Ouvir</a></p>` : ""}
            ${item.observacoes ? `<p><strong>Obs.:</strong> ${escaparHtml(item.observacoes)}</p>` : ""}
          </div>

          <div class="botoes-item-musica">
            <button class="btn-editar-musica" type="button" data-editar-musica="${escaparHtml(item.id)}">✎ Editar</button>
            <button class="btn-excluir-musica" type="button" data-excluir-musica="${escaparHtml(item.id)}">🗑 Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-editar-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarMusica(botao.dataset.editarMusica);
    });
  });

  lista.querySelectorAll("[data-excluir-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirMusica(botao.dataset.excluirMusica);
    });
  });

  lista.querySelectorAll("[data-status-musica]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      salvarMeuProgressoMusica(botao.dataset.musicaId, botao.dataset.statusMusica);
    });
  });
}

async function salvarMeuProgressoMusica(musicaId, status) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const meuIntegrante = appState.meuIntegranteAtual;

  if (!cliente || !projetoId || !musicaId || !meuIntegrante) {
    alert("Seu cadastro de integrante não foi encontrado neste projeto.");
    return;
  }

  const statusPermitidos = ["nao_iniciada", "em_estudo", "pronta"];

  if (!statusPermitidos.includes(status)) {
    alert("Status inválido.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const payload = {
    projeto_id: projetoId,
    musica_id: musicaId,
    integrante_id: meuIntegrante.id,
    usuario_id: usuario.id,
    status: status,
    updated_at: new Date().toISOString()
  };

  const { data: existente, error: erroBusca } = await cliente
    .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
    .select("id")
    .eq("musica_id", musicaId)
    .eq("integrante_id", meuIntegrante.id)
    .limit(1);

  if (erroBusca) {
    alert("Erro ao verificar progresso: " + erroBusca.message);
    return;
  }

  let resultado;

  if (existente && existente.length > 0) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .update({
        status: status,
        updated_at: payload.updated_at
      })
      .eq("id", existente[0].id);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar progresso: " + resultado.error.message);
    return;
  }

  await buscarMusicas();
}

function obterDadosFormularioMusica() {
  return {
    nome: limparTexto(elemento("musica-nome")?.value),
    artista: limparTexto(elemento("musica-artista")?.value),
    tom: limparTexto(elemento("musica-tom")?.value),
    bpm: limparTexto(elemento("musica-bpm")?.value),
    link_url: limparTexto(elemento("musica-link")?.value),
    material_musical: limparTexto(elemento("musica-material-musical")?.value),
    letra: limparTexto(elemento("musica-letra")?.value),
    observacoes: limparTexto(elemento("musica-observacoes")?.value)
  };
}

function preencherFormularioMusica(item) {
  if (!item) {
    return;
  }

  elemento("musica-nome").value = item.nome || "";
  elemento("musica-artista").value = item.artista || "";
  elemento("musica-tom").value = item.tom || "";
  elemento("musica-bpm").value = item.bpm || "";
  elemento("musica-link").value = obterLinkMusica(item);
  elemento("musica-material-musical").value = item.material_musical || "";
  elemento("musica-letra").value = item.letra || "";
  elemento("musica-observacoes").value = item.observacoes || "";

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");

  if (titulo) {
    titulo.textContent = "Editar música";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<span>✓</span><span>Salvar alterações</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "inline-flex";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function limparFormularioMusica() {
  appState.musicaEditandoId = null;

  ["musica-nome", "musica-artista", "musica-tom", "musica-bpm", "musica-link", "musica-material-musical", "musica-letra", "musica-observacoes"].forEach(function(id) {
    const campo = elemento(id);
    if (campo) {
      campo.value = "";
    }
  });

  const titulo = elemento("titulo-form-musica");
  const botaoSalvar = elemento("btn-salvar-musica");
  const botaoCancelar = elemento("btn-cancelar-musica");

  if (titulo) {
    titulo.textContent = "Nova música";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<span>＋</span><span>Adicionar música</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }
}

async function salvarMusica() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const dados = obterDadosFormularioMusica();
  const bpmNumero = parseInt(dados.bpm, 10);

  if (!dados.nome) {
    alert("Informe o nome da música.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: dados.nome,
    artista: dados.artista,
    tom: dados.tom,
    bpm: Number.isFinite(bpmNumero) ? bpmNumero : null,
    link_url: dados.link_url,
    youtube_url: dados.link_url,
    material_musical: dados.material_musical,
    letra: dados.letra,
    observacoes: dados.observacoes,
    updated_at: new Date().toISOString()
  };

  let resultado;

  if (appState.musicaEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .update(payload)
      .eq("id", appState.musicaEditandoId)
      .eq("projeto_id", projetoId);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar música: " + resultado.error.message);
    return;
  }

  limparFormularioMusica();
  await buscarMusicas();
}

function editarMusica(id) {
  const item = (appState.musicas || []).find(function(musica) {
    return musica.id === id;
  });

  if (!item) {
    alert("Música não encontrada.");
    return;
  }

  appState.musicaEditandoId = id;
  preencherFormularioMusica(item);
}

async function excluirMusica(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir esta música?");

  if (!confirmar) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir música: " + error.message);
    return;
  }

  if (appState.musicaEditandoId === id) {
    limparFormularioMusica();
  }

  await buscarMusicas();
}

async function criarMusica() {
  await salvarMusica();
}

async function carregarRepertorios() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-repertorios {
        display: grid;
        grid-template-columns: minmax(280px, 420px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .card-repertorio-expandido {
        grid-column: 1 / -1;
        overflow: visible;
      }

      .form-repertorio-topo {
        display: grid;
        grid-template-columns: minmax(280px, 420px) minmax(360px, 1fr);
        gap: 18px;
        align-items: start;
      }

      .resumo-repertorio-lateral {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        background: rgba(15,23,42,.48);
      }

      .cards-resumo-repertorio {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }

      .card-resumo-mini {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.045);
        border-radius: 14px;
        padding: 12px;
      }

      .card-resumo-mini strong {
        display: block;
        font-size: 20px;
        color: #fff;
        line-height: 1.1;
      }

      .card-resumo-mini span {
        color: #a8b4c9;
        font-size: 12px;
      }

      .form-repertorios,
      .filtros-montagem-repertorio {
        display: grid;
        gap: 10px;
      }

      .form-repertorios label,
      .filtros-montagem-repertorio label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-repertorios input,
      .form-repertorios textarea,
      .filtros-montagem-repertorio input {
        width: 100%;
      }

      .form-repertorios textarea {
        min-height: 92px;
        resize: vertical;
      }

      .acoes-repertorio,
      .acoes-musica-repertorio,
      .acoes-edicao-repertorio {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 6px;
      }

      .acoes-repertorio {
        flex-direction: column;
      }

      .botao-salvar-repertorio,
      .botao-whatsapp-repertorio,
      .botao-montar-repertorio {
        width: 100%;
        min-height: 44px;
        border: 0;
        border-radius: 13px;
        padding: 0 18px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition: transform .15s ease, filter .15s ease, box-shadow .15s ease;
      }

      .icone-limpo {
        width: 18px;
        height: 18px;
        color: #fff;
        stroke: currentColor;
        stroke-width: 2;
        fill: none;
        stroke-linecap: round;
        stroke-linejoin: round;
        flex: 0 0 18px;
      }

      .botao-salvar-repertorio,
      .botao-montar-repertorio {
        color: #fff;
        background: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
        box-shadow: 0 10px 22px rgba(99, 102, 241, .25);
      }

      .botao-whatsapp-repertorio {
        color: #fff;
        background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
        box-shadow: 0 10px 22px rgba(34, 197, 94, .20);
      }

      .botao-salvar-repertorio:hover,
      .botao-whatsapp-repertorio:hover,
      .botao-montar-repertorio:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }

      .botao-repertorio-secundario {
        width: 100%;
        min-height: 38px;
        border: 1px solid rgba(255,255,255,.14);
        border-radius: 11px;
        padding: 0 14px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: rgba(255,255,255,.06);
        color: #e5e7eb;
      }

      .acoes-edicao-repertorio {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,.12);
        align-items: center;
      }

      .acoes-edicao-repertorio .botao-card,
      .acoes-edicao-repertorio .botao-secundario-modulo {
        min-height: 34px;
        padding: 0 14px;
        font-size: 13px;
        border-radius: 10px;
      }

      .botao-secundario-modulo {
        border: 0;
        border-radius: 12px;
        padding: 11px 14px;
        cursor: pointer;
        background: #eeeeee;
        color: #222;
        font-weight: 700;
      }

      .lista-repertorios,
      .lista-biblioteca-musicas,
      .lista-musicas-repertorio {
        display: grid;
        gap: 10px;
      }

      .item-repertorio,
      .item-biblioteca-musica,
      .item-musica-repertorio {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 12px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-repertorio-topo,
      .item-biblioteca-musica,
      .item-musica-repertorio {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }

      .item-repertorio-conteudo,
      .item-musica-repertorio-conteudo {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
      }

      .icone-repertorio-placeholder,
      .numero-musica-repertorio {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        font-size: 13px;
        color: #ffffff;
      }

      .dados-repertorio h4,
      .dados-musica-repertorio h4,
      .dados-biblioteca-musica h4 {
        margin: 0 0 5px;
        color: #ffffff;
        font-size: 15px;
        line-height: 1.2;
      }

      .dados-repertorio p,
      .dados-musica-repertorio p,
      .dados-biblioteca-musica p {
        margin: 2px 0;
        font-size: 12px;
        line-height: 1.25;
        color: #d1d5db;
      }

      .botoes-item-repertorio,
      .botoes-musica-repertorio {
        display: flex;
        gap: 5px;
        flex-wrap: nowrap;
        justify-content: flex-end;
        align-items: center;
      }

      .botoes-item-repertorio button,
      .botoes-musica-repertorio button,
      .btn-adicionar-musica-repertorio {
        border: 0;
        border-radius: 8px;
        padding: 6px 8px;
        min-height: 28px;
        cursor: pointer;
        font-size: 12px;
        line-height: 1;
        white-space: nowrap;
        font-weight: 700;
      }

      .btn-editar-repertorio,
      .btn-montar-repertorio,
      .btn-gerar-pdf-repertorio,
      .btn-compartilhar-repertorio,
      .btn-mover-repertorio,
      .btn-subir-musica,
      .btn-descer-musica,
      .btn-adicionar-musica-repertorio {
        background: rgba(255,255,255,.08);
        color: #e5e7eb;
        border: 1px solid rgba(255,255,255,.10);
      }

      .btn-excluir-repertorio,
      .btn-remover-musica-repertorio {
        background: rgba(239, 68, 68, .10);
        color: #fecaca;
        border: 1px solid rgba(239, 68, 68, .35);
      }

      .montagem-repertorio {
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid rgba(255,255,255,.12);
        overflow: visible;
      }

      .montagem-repertorio-grid {
        display: grid;
        grid-template-columns: minmax(360px, .9fr) minmax(460px, 1.25fr);
        gap: 18px;
        align-items: start;
      }

      .painel-biblioteca-repertorio,
      .painel-setlist-repertorio {
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        padding: 14px;
        background: rgba(15,23,42,.34);
        min-width: 0;
      }

      .lista-biblioteca-musicas {
        max-height: 420px;
        overflow: auto;
        padding-right: 4px;
      }

      .lista-musicas-repertorio {
        min-height: 240px;
      }

      .titulo-montagem-repertorio {
        margin-bottom: 14px;
      }

      .titulo-montagem-repertorio h3 {
        margin-bottom: 6px;
      }

      .mini-progresso-repertorio,
      .mini-progresso-musica-repertorio {
        margin-top: 8px;
        display: grid;
        gap: 6px;
      }

      .linha-progresso-repertorio {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 700;
      }

      .bolinha-status-musica {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        margin-right: 5px;
        vertical-align: middle;
      }

      .bolinha-status-musica.vermelha { background: #ef4444; }
      .bolinha-status-musica.amarela { background: #facc15; }
      .bolinha-status-musica.verde { background: #22c55e; }

      .barra-mini-progresso {
        width: 100%;
        height: 7px;
        border-radius: 999px;
        background: rgba(255,255,255,.12);
        overflow: hidden;
      }

      .barra-mini-progresso span {
        display: block;
        height: 100%;
        border-radius: 999px;
      }

      .barra-mini-progresso span.vermelha { background: #ef4444; }
      .barra-mini-progresso span.amarela { background: #facc15; }
      .barra-mini-progresso span.verde { background: #22c55e; }

      .resumo-repertorio-inteligente {
        margin: 12px 0 4px;
        padding: 12px;
        border-radius: 14px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
      }

      .biblioteca-acoes-repertorio {
        display: flex;
        gap: 8px;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        margin: 8px 0 10px;
      }

      .check-musica-repertorio {
        width: 18px !important;
        height: 18px !important;
        min-height: 18px !important;
        margin: 2px 8px 0 0 !important;
        flex: 0 0 18px;
      }

      .item-biblioteca-musica .dados-biblioteca-musica {
        flex: 1;
      }

      @media (max-width: 980px) {
        .modulo-repertorios,
        .montagem-repertorio-grid,
        .form-repertorio-topo,
        .cards-resumo-repertorio,
        .item-repertorio-topo,
        .item-biblioteca-musica,
        .item-musica-repertorio {
          grid-template-columns: 1fr;
          flex-direction: column;
        }

        .botoes-item-repertorio,
        .botoes-musica-repertorio {
          justify-content: flex-start;
        }
      }


      /* Repertórios 2.0 - layout amplo de montagem */
      #card-form-repertorio.card-repertorio-expandido {
        width: min(1420px, calc(100vw - 96px)) !important;
        max-width: none !important;
        margin: 0 auto !important;
        overflow: visible !important;
      }

      #card-form-repertorio.card-repertorio-expandido > .tag,
      #card-form-repertorio.card-repertorio-expandido > #titulo-form-repertorio,
      #card-form-repertorio.card-repertorio-expandido > p,
      #card-form-repertorio.card-repertorio-expandido > .form-repertorios > label,
      #card-form-repertorio.card-repertorio-expandido > .form-repertorios > .acoes-repertorio {
        display: none !important;
      }

      #card-form-repertorio.card-repertorio-expandido .montagem-repertorio {
        margin-top: 0 !important;
        padding-top: 0 !important;
        border-top: 0 !important;
      }

      .repertorio-builder {
        display: grid;
        grid-template-columns: minmax(360px, 0.8fr) minmax(560px, 1.2fr);
        gap: 18px;
        align-items: stretch;
        width: 100%;
      }

      .repertorio-builder-card {
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 18px;
        background: rgba(15,23,42,.45);
        padding: 18px;
        min-width: 0;
        overflow: hidden;
      }

      .repertorio-builder-card h3 {
        margin: 0 0 8px;
        font-size: 24px;
      }

      .repertorio-builder-card .texto-ajuda {
        color: #a8b4c9;
        font-size: 13px;
        margin: 0 0 14px;
      }

      .repertorio-builder-form {
        display: grid;
        gap: 10px;
        margin-bottom: 14px;
      }

      .repertorio-builder-form label {
        display: grid;
        gap: 6px;
      }

      .repertorio-resumos {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 12px 0 14px;
      }

      .repertorio-resumo-card {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
        border-radius: 14px;
        padding: 12px;
      }

      .repertorio-resumo-card strong {
        display: block;
        font-size: 20px;
        color: #fff;
      }

      .repertorio-resumo-card span {
        display: block;
        color: #a8b4c9;
        font-size: 12px;
        margin-top: 2px;
      }

      .repertorio-biblioteca-lista {
        max-height: 520px;
        overflow: auto;
        display: grid;
        gap: 8px;
        padding-right: 4px;
      }

      .musica-biblioteca-linha {
        display: grid;
        grid-template-columns: 26px minmax(0, 1fr) auto;
        gap: 10px;
        align-items: center;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 13px;
        padding: 10px;
        background: rgba(255,255,255,.035);
      }

      .musica-biblioteca-linha h4,
      .setlist-linha h4 {
        margin: 0;
        font-size: 14px;
        color: #fff;
        line-height: 1.2;
      }

      .musica-biblioteca-linha p,
      .setlist-linha p {
        margin: 3px 0 0;
        color: #a8b4c9;
        font-size: 12px;
        line-height: 1.25;
      }

      .status-biblioteca-mini {
        min-width: 84px;
        text-align: right;
        color: #e5e7eb;
        font-size: 12px;
        font-weight: 700;
      }

      .status-biblioteca-mini .bolinha-status-musica {
        margin-right: 6px;
      }

      .botao-adicionar-selecionadas-final {
        width: 100%;
        min-height: 44px;
        margin-top: 12px;
        border: 0;
        border-radius: 13px;
        background: linear-gradient(135deg, #38bdf8 0%, #6366f1 50%, #a855f7 100%);
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }

      .setlist-lista-final {
        display: grid;
        gap: 8px;
        max-height: 430px;
        overflow: auto;
        padding-right: 4px;
        min-height: 150px;
      }

      .setlist-linha {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr) auto;
        align-items: center;
        gap: 12px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 13px;
        padding: 10px;
        background: rgba(255,255,255,.04);
      }

      .numero-setlist-final {
        width: 34px;
        height: 34px;
        border-radius: 11px;
        display: grid;
        place-items: center;
        background: linear-gradient(135deg, #4f46e5, #9333ea);
        color: #fff;
        font-weight: 800;
        font-size: 13px;
      }

      .setlist-acoes-final {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .setlist-acoes-final button {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: #fff;
        display: inline-grid;
        place-items: center;
        cursor: pointer;
      }

      .setlist-acoes-final button.remover {
        border-color: rgba(239,68,68,.35);
        color: #fecaca;
        background: rgba(239,68,68,.10);
      }

      .rodape-repertorio-builder {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 14px;
        align-items: center;
      }

      .rodape-repertorio-builder .botao-whatsapp-repertorio,
      .rodape-repertorio-builder .botao-salvar-repertorio {
        margin: 0;
      }

      @media (max-width: 1050px) {
        #card-form-repertorio.card-repertorio-expandido {
          width: min(100%, calc(100vw - 32px)) !important;
        }
        .repertorio-builder {
          grid-template-columns: 1fr;
        }
        .rodape-repertorio-builder,
        .repertorio-resumos {
          grid-template-columns: 1fr;
        }
      }

    </style>

    <div class="modulo-repertorios">
      <div class="card-projeto" id="card-form-repertorio">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-repertorio">Novo repertório</h3>
        <p>Crie uma lista para show, ensaio ou evento.</p>

        <div class="form-repertorios">
          <label>
            Nome do repertório
            <input id="repertorio-nome" type="text" placeholder="Ex: Cicranos Rock 2026" />
          </label>

          <label>
            Observações
            <textarea id="repertorio-observacoes" placeholder="Ex: Repertório usado no ano de 2026"></textarea>
          </label>

          <div class="acoes-repertorio">
            <button class="botao-salvar-repertorio" id="btn-salvar-repertorio" type="button">
              <svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
              <span>Salvar repertório</span>
            </button>
            <button class="botao-montar-repertorio" id="btn-montar-repertorio-form" type="button" style="display:inline-flex;">
              <svg class="icone-limpo" viewBox="0 0 24 24"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              <span>Montar repertório</span>
            </button>
            <button class="botao-whatsapp-repertorio" id="btn-compartilhar-repertorio" type="button" style="display:inline-flex;">
              <svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.8 8.7c.3 2.7 2.2 5.1 4.9 5.9l1.4-1.3 2.1.6"/></svg>
              <span>Enviar repertório via WhatsApp</span><span>→</span>
            </button>
            <button class="botao-repertorio-secundario btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio" type="button" style="display:none;">Gerar PDF</button>
            <button class="botao-repertorio-secundario" id="btn-cancelar-repertorio" type="button" style="display:none;">Cancelar edição</button>
          </div>

          <div id="montagem-repertorio" class="montagem-repertorio" style="display:none;"></div>
        </div>
      </div>

      <div class="card-projeto" id="card-lista-repertorios">
        <span class="tag">Lista</span>
        <h3>Repertórios cadastrados</h3>
        <p>Salve, edite, exclua ou monte as músicas do repertório.</p>

        <div id="lista-repertorios" class="lista-repertorios">
          <p>Carregando repertórios...</p>
        </div>
      </div>
    </div>
  `;

  appState.repertorioEditandoId = null;
  appState.repertorioMontandoId = null;
  appState.repertorioMusicas = [];
  configurarEventosRepertorios();
  await buscarRepertorios();
}

function configurarEventosRepertorios() {
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCancelar = elemento("btn-cancelar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
  const botaoMontarForm = elemento("btn-montar-repertorio-form");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarRepertorio);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioRepertorio);
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.addEventListener("click", function() {
      const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
      compartilharRepertorio(id);
    });
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.addEventListener("click", function() {
      const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
      gerarPDFDoRepertorio(id);
    });
  }

  if (botaoMontarForm) {
    botaoMontarForm.addEventListener("click", function() {
      const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
      montarRepertorio(id);
    });
  }
}

async function buscarRepertorios() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-repertorios");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar repertórios: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.repertorios = data || [];

  const idsRepertorios = appState.repertorios.map(function(item) {
    return item.id;
  });

  const consultas = [
    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("*")
      .eq("projeto_id", projetoId),

    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ];

  if (idsRepertorios.length > 0) {
    consultas.push(
      cliente
        .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
        .select("*")
        .in("repertorio_id", idsRepertorios)
    );
  }

  const resultados = await Promise.all(consultas);
  const musicasResultado = resultados[0];
  const integrantesResultado = resultados[1];
  const progressoResultado = resultados[2];
  const relacoesResultado = resultados[3] || { data: [], error: null };

  if (musicasResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas: ${escaparHtml(musicasResultado.error.message)}</p>`;
    return;
  }

  if (integrantesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(integrantesResultado.error.message)}</p>`;
    return;
  }

  if (progressoResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar progresso: ${escaparHtml(progressoResultado.error.message)}</p>`;
    return;
  }

  if (relacoesResultado.error) {
    lista.innerHTML = `<p>Erro ao carregar músicas dos repertórios: ${escaparHtml(relacoesResultado.error.message)}</p>`;
    return;
  }

  appState.musicas = musicasResultado.data || [];
  appState.integrantesProjetoMusicas = integrantesResultado.data || [];
  appState.progressoMusicas = progressoResultado.data || [];
  appState.repertorioRelacoesTodas = relacoesResultado.data || [];

  renderizarListaRepertorios();
}


function calcularProgressoMedioDasMusicas(idsMusicas) {
  const ids = idsMusicas || [];

  if (!ids.length) {
    return { percentual: 0, cor: "vermelha", quantidade: 0 };
  }

  const soma = ids.reduce(function(total, musicaId) {
    return total + obterProgressoDaMusica(musicaId).percentual;
  }, 0);

  const percentual = Math.round(soma / ids.length);
  let cor = "vermelha";

  if (percentual === 100) {
    cor = "verde";
  } else if (percentual >= 50) {
    cor = "amarela";
  }

  return { percentual: percentual, cor: cor, quantidade: ids.length };
}

function obterIdsMusicasDoRepertorio(repertorioId) {
  return (appState.repertorioRelacoesTodas || [])
    .filter(function(item) {
      return item.repertorio_id === repertorioId;
    })
    .map(function(item) {
      return item.musica_id;
    });
}

function montarMiniProgresso(percentual, cor, textoComplementar) {
  return `
    <div class="mini-progresso-repertorio">
      <div class="linha-progresso-repertorio">
        <span><i class="bolinha-status-musica ${escaparHtml(cor)}"></i>${Number(percentual || 0)}%</span>
        <span>${escaparHtml(textoComplementar || "")}</span>
      </div>
      <div class="barra-mini-progresso" title="Progresso">
        <span class="${escaparHtml(cor)}" style="width:${Number(percentual || 0)}%"></span>
      </div>
    </div>
  `;
}

function renderizarListaRepertorios() {
  const lista = elemento("lista-repertorios");

  if (!lista) {
    return;
  }

  const itens = appState.repertorios || [];

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhum repertório cadastrado ainda.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const idsMusicas = obterIdsMusicasDoRepertorio(item.id);
    const resumo = calcularProgressoMedioDasMusicas(idsMusicas);
    const textoMusicas = resumo.quantidade === 1 ? "1 música" : `${resumo.quantidade} músicas`;

    return `
      <div class="item-repertorio">
        <div class="item-repertorio-topo">
          <div class="item-repertorio-conteudo">
            <div class="icone-repertorio-placeholder">R</div>
            <div class="dados-repertorio">
              <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
              <p>${escaparHtml(item.observacoes || "Sem observações")}</p>
              ${montarMiniProgresso(resumo.percentual, resumo.cor, textoMusicas)}
            </div>
          </div>

          <div class="botoes-item-repertorio">
            <button class="btn-montar-repertorio" type="button" data-montar-repertorio="${escaparHtml(item.id)}">Montar</button>
            <button class="btn-editar-repertorio" type="button" data-editar-repertorio="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-compartilhar-repertorio" type="button" data-compartilhar-repertorio="${escaparHtml(item.id)}">WhatsApp</button>
            <button class="btn-excluir-repertorio" type="button" data-excluir-repertorio="${escaparHtml(item.id)}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-montar-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      montarRepertorio(botao.dataset.montarRepertorio);
    });
  });

  lista.querySelectorAll("[data-editar-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarRepertorio(botao.dataset.editarRepertorio);
    });
  });

  lista.querySelectorAll("[data-compartilhar-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      compartilharRepertorio(botao.dataset.compartilharRepertorio);
    });
  });

  lista.querySelectorAll("[data-excluir-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirRepertorio(botao.dataset.excluirRepertorio);
    });
  });
}

function preencherFormularioRepertorio(item) {
  if (!item) {
    return;
  }

  const campoNome = elemento("repertorio-nome");
  const campoObservacoes = elemento("repertorio-observacoes");
  const titulo = elemento("titulo-form-repertorio");
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
  const botaoMontarForm = elemento("btn-montar-repertorio-form");
  const botaoCancelar = elemento("btn-cancelar-repertorio");

  if (campoNome) {
    campoNome.value = item.nome || "";
  }

  if (campoObservacoes) {
    campoObservacoes.value = item.observacoes || "";
  }

  if (titulo) {
    titulo.textContent = "Editar repertório";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>Salvar alterações</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "inline-flex";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "inline-flex";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  if (botaoMontarForm) {
    botaoMontarForm.style.display = "inline-flex";
  }

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");

  if (cardForm) {
    cardForm.style.gridColumn = "1 / -1";
  }

  if (cardLista) {
    cardLista.style.display = "none";
  }

  if (cardForm) {
    cardForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function limparFormularioRepertorio() {
  appState.repertorioEditandoId = null;

  const campoNome = elemento("repertorio-nome");
  const campoObservacoes = elemento("repertorio-observacoes");
  const titulo = elemento("titulo-form-repertorio");
  const botaoSalvar = elemento("btn-salvar-repertorio");
  const botaoCompartilhar = elemento("btn-compartilhar-repertorio");
  const botaoGerarPdf = elemento("btn-gerar-pdf-repertorio");
  const botaoMontarForm = elemento("btn-montar-repertorio-form");
  const botaoCancelar = elemento("btn-cancelar-repertorio");

  if (campoNome) {
    campoNome.value = "";
  }

  if (campoObservacoes) {
    campoObservacoes.value = "";
  }

  if (titulo) {
    titulo.textContent = "Novo repertório";
  }

  if (botaoSalvar) {
    botaoSalvar.innerHTML = `<svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>Salvar repertório</span>`;
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = appState.repertorioEditandoId || appState.repertorioMontandoId ? "inline-flex" : "none";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "none";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");

  if (cardForm) {
    cardForm.style.gridColumn = "";
  }

  if (cardLista) {
    cardLista.style.display = "block";
  }

  appState.repertorioMusicas = [];
  fecharMontagemRepertorio();
}

async function salvarMusicasTemporariasDoRepertorio(repertorioId) {
  const cliente = sb();

  if (!cliente || !repertorioId) {
    return true;
  }

  const temporarias = (appState.repertorioMusicas || []).filter(function(item) {
    return item.temporario || String(item.id).startsWith("temp-");
  });

  if (!temporarias.length) {
    return true;
  }

  const payload = temporarias.map(function(item, indice) {
    return {
      repertorio_id: repertorioId,
      musica_id: item.musica_id,
      ordem: Number(item.ordem || indice + 1)
    };
  });

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .insert(payload);

  if (error) {
    alert("Repertório salvo, mas houve erro ao salvar as músicas: " + error.message);
    return false;
  }

  return true;
}


function obterValorCampoRepertorio(nomeCampo) {
  const campoMontagem = elemento(nomeCampo + "-montagem");
  if (campoMontagem) {
    return limparTexto(campoMontagem.value);
  }
  return limparTexto(elemento(nomeCampo)?.value);
}

function sincronizarCamposRepertorio() {
  const nomeMontagem = elemento("repertorio-nome-montagem");
  const obsMontagem = elemento("repertorio-observacoes-montagem");
  const nomeBase = elemento("repertorio-nome");
  const obsBase = elemento("repertorio-observacoes");

  if (nomeMontagem && nomeBase) {
    nomeBase.value = nomeMontagem.value || "";
  }
  if (obsMontagem && obsBase) {
    obsBase.value = obsMontagem.value || "";
  }
}

async function salvarRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  sincronizarCamposRepertorio();
  const nome = obterValorCampoRepertorio("repertorio-nome");
  const observacoes = obterValorCampoRepertorio("repertorio-observacoes");

  if (!nome) {
    alert("Informe o nome do repertório.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: nome,
    observacoes: observacoes
  };

  const musicasTemporarias = !appState.repertorioMontandoId
    ? [...(appState.repertorioMusicas || [])]
    : [];

  let idSalvo = appState.repertorioEditandoId || appState.repertorioMontandoId || null;
  let resultado;

  if (idSalvo) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .update(payload)
      .eq("id", idSalvo)
      .eq("projeto_id", projetoId)
      .select()
      .single();
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .insert(payload)
      .select()
      .single();
  }

  if (resultado.error) {
    alert("Erro ao salvar repertório: " + resultado.error.message);
    return;
  }

  idSalvo = resultado.data?.id || idSalvo;

  if (musicasTemporarias.length) {
    appState.repertorioMusicas = musicasTemporarias;
    await salvarMusicasTemporariasDoRepertorio(idSalvo);
  }

  await buscarRepertorios();

  const repertorioSalvo = (appState.repertorios || []).find(function(item) {
    return item.id === idSalvo;
  });

  if (repertorioSalvo) {
    appState.repertorioEditandoId = idSalvo;
    appState.repertorioMontandoId = idSalvo;
    preencherFormularioRepertorio(repertorioSalvo);
    await carregarDadosMontagemRepertorio();
    renderizarMontagemRepertorio();
  }
}

async function criarRepertorio() {
  await salvarRepertorio();
}

async function editarRepertorio(id) {
  const item = (appState.repertorios || []).find(function(repertorio) {
    return repertorio.id === id;
  });

  if (!item) {
    alert("Repertório não encontrado.");
    return;
  }

  appState.repertorioEditandoId = id;
  appState.repertorioMontandoId = id;
  preencherFormularioRepertorio(item);
  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function excluirRepertorio(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir este repertório?");

  if (!confirmar) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir repertório: " + error.message);
    return;
  }

  if (appState.repertorioEditandoId === id) {
    limparFormularioRepertorio();
  }

  if (appState.repertorioMontandoId === id) {
    fecharMontagemRepertorio();
  }

  await buscarRepertorios();
}

function obterRepertorioAtualMontagem() {
  const existente = (appState.repertorios || []).find(function(repertorio) {
    return repertorio.id === appState.repertorioMontandoId;
  });

  if (existente) {
    return existente;
  }

  const nome = obterValorCampoRepertorio("repertorio-nome") || "Novo repertório";
  const observacoes = obterValorCampoRepertorio("repertorio-observacoes") || "Monte seu repertório adicionando músicas da biblioteca.";

  return {
    id: null,
    nome: nome,
    observacoes: observacoes,
    temporario: true
  };
}

async function montarRepertorio(id) {
  appState.repertorioMontandoId = id || appState.repertorioEditandoId || null;

  if (!appState.repertorioMontandoId && !Array.isArray(appState.repertorioMusicas)) {
    appState.repertorioMusicas = [];
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");
  if (cardForm) {
    cardForm.classList.add("card-repertorio-expandido");
    cardForm.style.gridColumn = "1 / -1";
  }
  if (cardLista) {
    cardLista.style.display = "none";
  }

  const montagem = elemento("montagem-repertorio");
  if (montagem) {
    montagem.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function carregarDadosMontagemRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const repertorioId = appState.repertorioMontandoId;

  if (!cliente || !projetoId) {
    return;
  }

  const consultas = [
    cliente
      .from(REPERTORIO_FACIL.tabelas.musicas)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.integrantes)
      .select("*")
      .eq("projeto_id", projetoId)
      .order("nome", { ascending: true }),

    cliente
      .from(REPERTORIO_FACIL.tabelas.progressoMusicas)
      .select("*")
      .eq("projeto_id", projetoId)
  ];

  if (repertorioId) {
    consultas.push(
      cliente
        .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
        .select("*")
        .eq("repertorio_id", repertorioId)
        .order("ordem", { ascending: true })
    );
  }

  const resultados = await Promise.all(consultas);
  const musicasResultado = resultados[0];
  const integrantesResultado = resultados[1];
  const progressoResultado = resultados[2];
  const relacoesResultado = resultados[3] || { data: [], error: null };

  if (musicasResultado.error) {
    alert("Erro ao carregar músicas: " + musicasResultado.error.message);
    return;
  }

  if (integrantesResultado.error) {
    alert("Erro ao carregar integrantes: " + integrantesResultado.error.message);
    return;
  }

  if (progressoResultado.error) {
    alert("Erro ao carregar progresso: " + progressoResultado.error.message);
    return;
  }

  if (relacoesResultado.error) {
    alert("Erro ao carregar músicas do repertório: " + relacoesResultado.error.message);
    return;
  }

  appState.musicas = musicasResultado.data || [];
  appState.integrantesProjetoMusicas = integrantesResultado.data || [];
  appState.progressoMusicas = progressoResultado.data || [];

  if (repertorioId) {
    appState.repertorioMusicas = (relacoesResultado.data || []).map(function(relacao) {
      const musica = appState.musicas.find(function(item) {
        return item.id === relacao.musica_id;
      });

      return {
        id: relacao.id,
        repertorio_id: relacao.repertorio_id,
        musica_id: relacao.musica_id,
        ordem: relacao.ordem || 0,
        musica: musica || null
      };
    }).filter(function(item) {
      return item.musica !== null;
    });
  } else {
    appState.repertorioMusicas = (appState.repertorioMusicas || []).map(function(item) {
      const musica = appState.musicas.find(function(m) { return m.id === item.musica_id; });
      return Object.assign({}, item, { musica: musica || item.musica || null });
    }).filter(function(item) {
      return item.musica !== null;
    });
  }
}

function renderizarMontagemRepertorio() {
  const montagem = elemento("montagem-repertorio");
  const repertorio = obterRepertorioAtualMontagem();

  if (!montagem || !repertorio) {
    return;
  }

  montagem.style.display = "block";

  const idsSelecionados = new Set((appState.repertorioMusicas || []).map(function(item) {
    return item.musica_id;
  }));

  const buscaAtual = limparTexto(elemento("busca-musicas-repertorio")?.value).toLowerCase();
  const ordemAtual = elemento("ordenar-musicas-repertorio")?.value || "preparo";

  let musicasDisponiveis = (appState.musicas || []).filter(function(musica) {
    return !idsSelecionados.has(musica.id);
  });

  if (buscaAtual) {
    musicasDisponiveis = musicasDisponiveis.filter(function(musica) {
      const texto = [musica.nome, musica.artista, musica.tom, musica.bpm].join(" ").toLowerCase();
      return texto.includes(buscaAtual);
    });
  }

  musicasDisponiveis.sort(function(a, b) {
    if (ordemAtual === "nome") {
      return compararTexto(a.nome, b.nome);
    }
    if (ordemAtual === "menos_preparo") {
      return obterProgressoDaMusica(a.id).percentual - obterProgressoDaMusica(b.id).percentual || compararTexto(a.nome, b.nome);
    }
    if (ordemAtual === "recentes") {
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    }
    return obterProgressoDaMusica(b.id).percentual - obterProgressoDaMusica(a.id).percentual || compararTexto(a.nome, b.nome);
  });

  const selecionadas = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  const idsMusicasSelecionadas = selecionadas.map(function(item) {
    return item.musica_id;
  });
  const resumoRepertorio = calcularProgressoMedioDasMusicas(idsMusicasSelecionadas);
  const textoMusicas = resumoRepertorio.quantidade === 1 ? "1 música" : `${resumoRepertorio.quantidade} músicas`;
  const duracaoEstimada = resumoRepertorio.quantidade ? `${Math.max(1, resumoRepertorio.quantidade * 4)} min` : "0 min";
  const nomeAtual = obterValorCampoRepertorio("repertorio-nome") || (repertorio.temporario ? "" : repertorio.nome || "");
  const obsAtual = obterValorCampoRepertorio("repertorio-observacoes") || (repertorio.temporario ? "" : repertorio.observacoes || "");

  montagem.innerHTML = `
    <div class="repertorio-builder">
      <section class="repertorio-builder-card">
        <span class="tag">Repertório inteligente</span>
        <h3>Biblioteca do projeto</h3>
        <p class="texto-ajuda">Escolha músicas já cadastradas no projeto e adicione ao set.</p>

        <div class="filtros-montagem-repertorio">
          <label>
            Pesquisar música
            <input id="busca-musicas-repertorio" type="text" placeholder="Buscar por nome, artista ou tom" value="${escaparHtml(buscaAtual)}" />
          </label>

          <label>
            Ordenar por
            <select id="ordenar-musicas-repertorio">
              <option value="preparo" ${ordemAtual === "preparo" ? "selected" : ""}>Mais preparadas</option>
              <option value="menos_preparo" ${ordemAtual === "menos_preparo" ? "selected" : ""}>Menos preparadas</option>
              <option value="nome" ${ordemAtual === "nome" ? "selected" : ""}>Nome</option>
              <option value="recentes" ${ordemAtual === "recentes" ? "selected" : ""}>Mais recentes</option>
            </select>
          </label>
        </div>

        <div id="lista-biblioteca-musicas" class="repertorio-biblioteca-lista">
          ${renderizarBibliotecaMusicasRepertorio(musicasDisponiveis)}
        </div>

        <button class="botao-adicionar-selecionadas-final" id="btn-adicionar-musicas-selecionadas" type="button">+ Adicionar selecionadas ao repertório</button>
      </section>

      <section class="repertorio-builder-card">
        <h3>Repertório em construção</h3>
        <p class="texto-ajuda">Monte o repertório primeiro. O nome será obrigatório apenas ao salvar.</p>

        <div class="repertorio-builder-form">
          <label>
            Nome do repertório
            <input id="repertorio-nome-montagem" type="text" placeholder="Ex: Rock Nacional, Show Mr. Neno..." value="${escaparHtml(nomeAtual)}" />
          </label>
          <label>
            Observações
            <textarea id="repertorio-observacoes-montagem" placeholder="Ex: Repertório usado no show de verão.">${escaparHtml(obsAtual)}</textarea>
          </label>
        </div>

        <div class="repertorio-resumos">
          <div class="repertorio-resumo-card"><strong>${resumoRepertorio.quantidade}</strong><span>Músicas</span></div>
          <div class="repertorio-resumo-card"><strong>${duracaoEstimada}</strong><span>Duração estimada</span></div>
          <div class="repertorio-resumo-card"><strong>${resumoRepertorio.percentual}%</strong><span>Preparo médio</span></div>
        </div>

        <div class="resumo-repertorio-inteligente">
          ${montarMiniProgresso(resumoRepertorio.percentual, resumoRepertorio.cor, textoMusicas)}
          <p style="margin-top:8px; font-size:12px; color:#cbd5e1;">O percentual do repertório é a média do progresso das músicas selecionadas.</p>
        </div>

        <h3 style="margin-top:16px;">Músicas no repertório</h3>
        <p class="texto-ajuda">Use as setas para organizar a ordem do set.</p>
        <div id="lista-musicas-repertorio" class="setlist-lista-final">
          ${renderizarMusicasSelecionadasRepertorio(selecionadas)}
        </div>

        <div class="rodape-repertorio-builder">
          <button class="botao-salvar-repertorio" id="btn-salvar-repertorio-edicao" type="button"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg><span>${repertorio.temporario ? "Salvar repertório" : "Salvar alterações"}</span></button>
          <button class="botao-whatsapp-repertorio" id="btn-compartilhar-repertorio-edicao" type="button" style="display:${repertorio.temporario ? "none" : "inline-flex"};"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.8 8.7c.3 2.7 2.2 5.1 4.9 5.9l1.4-1.3 2.1.6"/></svg><span>Enviar via WhatsApp</span></button>
        </div>

        <div class="acoes-edicao-repertorio" style="margin-top:10px;">
          <button class="botao-repertorio-secundario btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio-edicao" type="button" style="display:${repertorio.temporario ? "none" : "inline-flex"};">Gerar PDF</button>
          <button class="botao-repertorio-secundario" id="btn-cancelar-repertorio-edicao" type="button">Voltar à lista</button>
        </div>
      </section>
    </div>
  `;

  configurarEventosMontagemRepertorio();
}

function renderizarBibliotecaMusicasRepertorio(musicas) {
  if (!musicas || musicas.length === 0) {
    return `<p style="color:#cbd5e1;">Nenhuma música disponível para adicionar.</p>`;
  }

  return musicas.map(function(musica) {
    const progresso = obterProgressoDaMusica(musica.id);
    const textoStatus = progresso.percentual >= 90 ? "Pronta" : progresso.percentual >= 50 ? "Em estudo" : "Não iniciada";

    return `
      <label class="musica-biblioteca-linha">
        <input class="check-musica-repertorio" type="checkbox" value="${escaparHtml(musica.id)}" aria-label="Selecionar música ${escaparHtml(musica.nome || "")}" />
        <div>
          <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
          <p>${escaparHtml(musica.artista || "Artista não informado")} • Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
        </div>
        <div class="status-biblioteca-mini">
          <span class="bolinha-status-musica ${escaparHtml(progresso.cor)}"></span>${textoStatus}<br />${progresso.percentual}%
        </div>
      </label>
    `;
  }).join("");
}

function renderizarMusicasSelecionadasRepertorio(itens) {
  if (!itens || itens.length === 0) {
    return `<p style="color:#cbd5e1;">Nenhuma música adicionada ainda.</p>`;
  }

  return itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");
    const progresso = obterProgressoDaMusica(musica.id);
    const textoStatus = progresso.percentual >= 90 ? "Pronta" : progresso.percentual >= 50 ? "Em estudo" : "Não iniciada";

    return `
      <div class="setlist-linha">
        <div class="numero-setlist-final">${numero}</div>
        <div>
          <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
          <p>${escaparHtml(musica.artista || "Artista não informado")} • Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
          <p><span class="bolinha-status-musica ${escaparHtml(progresso.cor)}"></span>${textoStatus} • ${progresso.percentual}%</p>
        </div>
        <div class="setlist-acoes-final">
          <button type="button" title="Mover para cima" data-subir-musica-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg></button>
          <button type="button" title="Mover para baixo" data-descer-musica-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></button>
          <button class="remover" type="button" title="Remover" data-remover-musica-repertorio="${escaparHtml(item.id)}"><svg class="icone-limpo" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/></svg></button>
        </div>
      </div>
    `;
  }).join("");
}

function configurarEventosMontagemRepertorio() {
  const busca = elemento("busca-musicas-repertorio");
  const ordenar = elemento("ordenar-musicas-repertorio");
  const botaoAdicionarSelecionadas = elemento("btn-adicionar-musicas-selecionadas");
  const botaoSalvarEdicao = elemento("btn-salvar-repertorio-edicao");
  const botaoCompartilharEdicao = elemento("btn-compartilhar-repertorio-edicao");
  const botaoGerarPdfEdicao = elemento("btn-gerar-pdf-repertorio-edicao");
  const botaoCancelarEdicao = elemento("btn-cancelar-repertorio-edicao");
  const nomeMontagem = elemento("repertorio-nome-montagem");
  const obsMontagem = elemento("repertorio-observacoes-montagem");

  if (busca) {
    busca.addEventListener("input", renderizarMontagemRepertorio);
  }

  if (nomeMontagem) {
    nomeMontagem.addEventListener("input", sincronizarCamposRepertorio);
  }

  if (obsMontagem) {
    obsMontagem.addEventListener("input", sincronizarCamposRepertorio);
  }

  if (ordenar) {
    ordenar.addEventListener("change", renderizarMontagemRepertorio);
  }

  if (botaoAdicionarSelecionadas) {
    botaoAdicionarSelecionadas.addEventListener("click", adicionarMusicasSelecionadasAoRepertorio);
  }

  if (botaoSalvarEdicao) {
    botaoSalvarEdicao.addEventListener("click", salvarRepertorio);
  }

  if (botaoCompartilharEdicao) {
    botaoCompartilharEdicao.addEventListener("click", function() {
      compartilharRepertorio(appState.repertorioEditandoId || appState.repertorioMontandoId);
    });
  }

  if (botaoGerarPdfEdicao) {
    botaoGerarPdfEdicao.addEventListener("click", function() {
      gerarPDFDoRepertorio(appState.repertorioEditandoId || appState.repertorioMontandoId);
    });
  }

  if (botaoCancelarEdicao) {
    botaoCancelarEdicao.addEventListener("click", limparFormularioRepertorio);
  }

  document.querySelectorAll("[data-adicionar-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      adicionarMusicaAoRepertorio(botao.dataset.adicionarMusicaRepertorio);
    });
  });

  document.querySelectorAll("[data-remover-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      removerMusicaDoRepertorio(botao.dataset.removerMusicaRepertorio);
    });
  });

  document.querySelectorAll("[data-subir-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      moverMusicaDoRepertorio(botao.dataset.subirMusicaRepertorio, -1);
    });
  });

  document.querySelectorAll("[data-descer-musica-repertorio]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      moverMusicaDoRepertorio(botao.dataset.descerMusicaRepertorio, 1);
    });
  });
}

async function adicionarMusicasSelecionadasAoRepertorio() {
  const checks = Array.from(document.querySelectorAll("#lista-biblioteca-musicas .check-musica-repertorio:checked"));
  const ids = checks.map(function(campo) {
    return campo.value;
  }).filter(Boolean);

  if (ids.length === 0) {
    alert("Selecione pelo menos uma música.");
    return;
  }

  await adicionarMusicasAoRepertorio(ids);
}

async function adicionarMusicasAoRepertorio(musicaIds) {
  const cliente = sb();
  const repertorioId = appState.repertorioMontandoId;

  if (!musicaIds || musicaIds.length === 0) {
    return;
  }

  const idsJaSelecionados = new Set((appState.repertorioMusicas || []).map(function(item) {
    return item.musica_id;
  }));

  const idsNovos = musicaIds.filter(function(id) {
    return !idsJaSelecionados.has(id);
  });

  if (idsNovos.length === 0) {
    alert("As músicas selecionadas já fazem parte deste repertório.");
    return;
  }

  const maiorOrdem = (appState.repertorioMusicas || []).reduce(function(maior, item) {
    return Math.max(maior, Number(item.ordem || 0));
  }, 0);

  if (!repertorioId) {
    const novosItens = idsNovos.map(function(musicaId, indice) {
      const musica = (appState.musicas || []).find(function(item) { return item.id === musicaId; });
      return {
        id: "temp-" + musicaId,
        repertorio_id: null,
        musica_id: musicaId,
        ordem: maiorOrdem + indice + 1,
        musica: musica || null,
        temporario: true
      };
    }).filter(function(item) { return item.musica !== null; });

    appState.repertorioMusicas = (appState.repertorioMusicas || []).concat(novosItens);
    renderizarMontagemRepertorio();
    return;
  }

  if (!cliente) {
    return;
  }

  const payload = idsNovos.map(function(musicaId, indice) {
    return {
      repertorio_id: repertorioId,
      musica_id: musicaId,
      ordem: maiorOrdem + indice + 1
    };
  });

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .insert(payload);

  if (error) {
    alert("Erro ao adicionar músicas ao repertório: " + error.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function adicionarMusicaAoRepertorio(musicaId) {
  if (!musicaId) {
    return;
  }

  await adicionarMusicasAoRepertorio([musicaId]);
}

async function removerMusicaDoRepertorio(relacaoId) {
  const cliente = sb();

  if (!relacaoId) {
    return;
  }

  const confirmar = confirm("Remover esta música do repertório?");

  if (!confirmar) {
    return;
  }

  if (String(relacaoId).startsWith("temp-")) {
    appState.repertorioMusicas = (appState.repertorioMusicas || []).filter(function(item) {
      return item.id !== relacaoId;
    }).map(function(item, indice) {
      return Object.assign({}, item, { ordem: indice + 1 });
    });
    renderizarMontagemRepertorio();
    return;
  }

  if (!cliente) {
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .delete()
    .eq("id", relacaoId);

  if (error) {
    alert("Erro ao remover música do repertório: " + error.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  await normalizarOrdemRepertorio();
  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function moverMusicaDoRepertorio(relacaoId, direcao) {
  const cliente = sb();

  if (!relacaoId) {
    return;
  }

  const itens = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  const indice = itens.findIndex(function(item) {
    return item.id === relacaoId;
  });

  const novoIndice = indice + direcao;

  if (indice < 0 || novoIndice < 0 || novoIndice >= itens.length) {
    return;
  }

  const atual = itens[indice];
  const outro = itens[novoIndice];

  if (String(atual.id).startsWith("temp-") || String(outro.id).startsWith("temp-") || !appState.repertorioMontandoId) {
    const ordemAtual = atual.ordem;
    atual.ordem = outro.ordem;
    outro.ordem = ordemAtual;
    appState.repertorioMusicas = itens.sort(function(a, b) { return Number(a.ordem || 0) - Number(b.ordem || 0); });
    renderizarMontagemRepertorio();
    return;
  }

  if (!cliente) {
    return;
  }

  const ordemAtual = atual.ordem;
  const ordemOutro = outro.ordem;

  const { error: erroAtual } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .update({ ordem: ordemOutro })
    .eq("id", atual.id);

  if (erroAtual) {
    alert("Erro ao alterar ordem: " + erroAtual.message);
    return;
  }

  const { error: erroOutro } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .update({ ordem: ordemAtual })
    .eq("id", outro.id);

  if (erroOutro) {
    alert("Erro ao alterar ordem: " + erroOutro.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function normalizarOrdemRepertorio() {
  const cliente = sb();

  if (!cliente) {
    return;
  }

  const itens = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  for (let indice = 0; indice < itens.length; indice += 1) {
    await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
      .update({ ordem: indice + 1 })
      .eq("id", itens[indice].id);
  }
}



function garantirTelaRepertorioPublico() {
  if (elemento("tela-repertorio-publico")) {
    return;
  }

  const app = document.querySelector(".app");
  if (!app) {
    return;
  }

  const tela = document.createElement("section");
  tela.id = "tela-repertorio-publico";
  tela.className = "tela";
  tela.innerHTML = `
    <style>
      #tela-repertorio-publico.tela-ativa {
        display: flex !important;
        align-items: flex-start;
        justify-content: center;
        min-height: 100vh;
        padding: 18px;
        background:
          radial-gradient(circle at top left, rgba(51,196,255,.13), transparent 34%),
          radial-gradient(circle at bottom right, rgba(168,85,247,.16), transparent 38%),
          #0d1b2f;
      }

      .pagina-repertorio-publico {
        width: min(860px, 100%);
        margin: 0 auto;
      }

      .card-repertorio-publico {
        background: #07111f;
        border: 1px solid rgba(255,255,255,.13);
        border-radius: 28px;
        padding: 26px;
        box-shadow: 0 22px 70px rgba(0,0,0,.34);
      }

      .publico-tag {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #c4b5fd;
        border: 1px solid rgba(139,92,246,.35);
        background: rgba(139,92,246,.14);
        border-radius: 999px;
        padding: 7px 12px;
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 14px;
      }

      .publico-titulo h1 {
        margin: 0;
        color: #fff;
        font-size: clamp(28px, 5vw, 46px);
        line-height: 1.02;
        letter-spacing: -.04em;
      }

      .publico-titulo p {
        margin: 10px 0 0;
        color: #9fb0d6;
        font-size: 15px;
      }

      .publico-info-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 20px 0;
      }

      .publico-info-card {
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.05);
        border-radius: 16px;
        padding: 14px;
      }

      .publico-info-card span {
        display: block;
        color: #8fa2c8;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: .08em;
        margin-bottom: 6px;
        font-weight: 800;
      }

      .publico-info-card strong {
        color: #fff;
        font-size: 15px;
        line-height: 1.25;
        word-break: break-word;
      }

      .publico-setlist-topo {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-end;
        border-top: 1px solid rgba(255,255,255,.10);
        padding-top: 20px;
        margin-top: 4px;
      }

      .publico-setlist-topo h2 {
        margin: 0;
        font-size: 22px;
        color: #fff;
      }

      .publico-setlist-topo p {
        margin: 4px 0 0;
        color: #9fb0d6;
        font-size: 13px;
      }

      .publico-lista-musicas {
        display: grid;
        gap: 8px;
        margin-top: 14px;
      }

      .publico-musica-item {
        display: grid;
        grid-template-columns: 48px 1fr;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid rgba(255,255,255,.10);
        border-radius: 16px;
        background: rgba(15,23,42,.62);
      }

      .publico-musica-numero {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #38bdf8, #6366f1, #a855f7);
        color: #fff;
        font-weight: 800;
        font-size: 13px;
      }

      .publico-musica-dados strong {
        display: block;
        color: #fff;
        font-size: 15px;
        line-height: 1.25;
      }

      .publico-musica-dados span {
        display: block;
        color: #a8b4c9;
        font-size: 12px;
        margin-top: 3px;
      }

      .publico-rodape {
        margin-top: 18px;
        text-align: center;
        color: #8fa2c8;
        font-size: 12px;
        line-height: 1.55;
      }

      .publico-rodape strong {
        color: #cbd5e1;
      }

      .publico-erro {
        color: #fecaca;
        background: rgba(239,68,68,.10);
        border: 1px solid rgba(239,68,68,.30);
        border-radius: 16px;
        padding: 14px;
        margin-top: 16px;
      }

      @media (max-width: 720px) {
        #tela-repertorio-publico.tela-ativa {
          padding: 12px;
        }

        .card-repertorio-publico {
          padding: 20px;
          border-radius: 22px;
        }

        .publico-info-grid {
          grid-template-columns: 1fr;
        }

        .publico-setlist-topo {
          align-items: flex-start;
          flex-direction: column;
        }
      }
    </style>
    <div class="pagina-repertorio-publico">
      <div class="card-repertorio-publico" id="conteudo-repertorio-publico">
        <span class="publico-tag">Repertório Fácil</span>
        <div class="publico-titulo">
          <h1>Carregando repertório...</h1>
          <p>Buscando informações atualizadas.</p>
        </div>
      </div>
    </div>
  `;

  app.appendChild(tela);
}

function formatarDataPublica(valor) {
  if (!valor) {
    return "Não informada";
  }

  try {
    const data = new Date(valor + "T00:00:00");
    if (Number.isNaN(data.getTime())) {
      return valor;
    }

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(data);
  } catch (erro) {
    return valor;
  }
}

async function carregarRepertorioPublico(repertorioId) {
  const cliente = sb();

  garantirTelaRepertorioPublico();
  mostrarTela("tela-repertorio-publico", { registrar: false });

  const conteudo = elemento("conteudo-repertorio-publico");
  if (!conteudo || !cliente) {
    return;
  }

  conteudo.innerHTML = `
    <span class="publico-tag">Repertório Fácil</span>
    <div class="publico-titulo">
      <h1>Carregando repertório...</h1>
      <p>Buscando informações atualizadas.</p>
    </div>
  `;

  const { data, error } = await cliente.rpc("obter_repertorio_publico", {
    p_repertorio_id: repertorioId
  });

  if (error) {
    conteudo.innerHTML = `
      <span class="publico-tag">Repertório Fácil</span>
      <div class="publico-titulo">
        <h1>Repertório não disponível</h1>
        <p>Não foi possível carregar este repertório.</p>
      </div>
      <div class="publico-erro">
        Verifique se o link está correto ou se a função pública do repertório foi criada no Supabase.
        <br><br>
        Detalhe: ${escaparHtml(error.message)}
      </div>
    `;
    return;
  }

  const repertorio = data || {};
  const projeto = repertorio.projeto || {};
  const evento = repertorio.evento || null;
  const musicas = Array.isArray(repertorio.musicas) ? repertorio.musicas : [];

  const titulo = repertorio.nome || "Repertório";
  const banda = projeto.nome || "Projeto musical";
  const nomeEvento = evento?.nome || "Não vinculado";
  const dataEvento = evento?.data_evento ? formatarDataPublica(evento.data_evento) : "Não informada";

  const listaHtml = musicas.length === 0
    ? `<div class="publico-erro">Nenhuma música foi adicionada a este repertório ainda.</div>`
    : musicas.map(function(item, indice) {
        const numero = String(indice + 1).padStart(2, "0");
        const detalhes = [];
        if (item.artista) detalhes.push(item.artista);
        if (item.tom) detalhes.push("Tom: " + item.tom);
        if (item.bpm) detalhes.push("BPM: " + item.bpm);

        return `
          <div class="publico-musica-item">
            <div class="publico-musica-numero">${numero}</div>
            <div class="publico-musica-dados">
              <strong>${escaparHtml(item.nome || "Sem nome")}</strong>
              ${detalhes.length ? `<span>${escaparHtml(detalhes.join(" • "))}</span>` : ""}
            </div>
          </div>
        `;
      }).join("");

  conteudo.innerHTML = `
    <span class="publico-tag">Repertório</span>

    <div class="publico-titulo">
      <h1>${escaparHtml(titulo)}</h1>
      <p>Link público do repertório atualizado automaticamente.</p>
    </div>

    <div class="publico-info-grid">
      <div class="publico-info-card">
        <span>Banda / Projeto</span>
        <strong>${escaparHtml(banda)}</strong>
      </div>
      <div class="publico-info-card">
        <span>Evento</span>
        <strong>${escaparHtml(nomeEvento)}</strong>
      </div>
      <div class="publico-info-card">
        <span>Data</span>
        <strong>${escaparHtml(dataEvento)}</strong>
      </div>
    </div>

    <div class="publico-setlist-topo">
      <div>
        <h2>Setlist</h2>
        <p>${musicas.length} música${musicas.length === 1 ? "" : "s"} na ordem salva.</p>
      </div>
    </div>

    <div class="publico-lista-musicas">
      ${listaHtml}
    </div>

    <div class="publico-rodape">
      <strong>Repertório Fácil</strong><br>
      Este repertório é atualizado automaticamente.<br>
      Sempre consulte este link antes do ensaio ou show.
    </div>
  `;
}

function formatarDataPDF(data) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(data || new Date());
  } catch (erro) {
    return "";
  }
}

async function obterMusicasDoRepertorioParaPDF(repertorioId) {
  const cliente = sb();

  if (!cliente || !repertorioId) {
    return [];
  }

  if (appState.repertorioMontandoId === repertorioId && Array.isArray(appState.repertorioMusicas)) {
    return [...appState.repertorioMusicas].sort(function(a, b) {
      return Number(a.ordem || 0) - Number(b.ordem || 0);
    });
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .select("id, ordem, musica:musica_id(id, nome, artista, tom, bpm)")
    .eq("repertorio_id", repertorioId)
    .order("ordem", { ascending: true });

  if (error) {
    alert("Erro ao carregar músicas do repertório para PDF: " + error.message);
    return [];
  }

  return data || [];
}

function abrirJanelaImpressaoRepertorio(html) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const janela = window.open(url, "_blank");

  if (!janela) {
    URL.revokeObjectURL(url);
    alert("O navegador bloqueou a janela de impressão. Libere pop-ups para este site e tente novamente.");
    return;
  }

  setTimeout(function() {
    URL.revokeObjectURL(url);
  }, 60000);
}

function montarUrlCompartilhavel(tipo, id) {
  const base = REPERTORIO_FACIL.urlApp || window.location.origin + window.location.pathname;
  const separador = base.includes("?") ? "&" : "?";
  return base + separador + tipo + "=" + encodeURIComponent(id || "");
}

async function copiarTextoCompartilhamento(texto) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch (erro) {
    // fallback abaixo
  }

  const campo = document.createElement("textarea");
  campo.value = texto;
  campo.setAttribute("readonly", "readonly");
  campo.style.position = "fixed";
  campo.style.left = "-9999px";
  document.body.appendChild(campo);
  campo.select();

  let sucesso = false;
  try {
    sucesso = document.execCommand("copy");
  } catch (erro) {
    sucesso = false;
  }

  document.body.removeChild(campo);
  return sucesso;
}

async function compartilharConteudo(titulo, texto, url) {
  const conteudo = texto + (url ? "\n\nLink: " + url : "");

  if (navigator.share) {
    try {
      await navigator.share({
        title: titulo,
        text: texto,
        url: url || REPERTORIO_FACIL.urlApp
      });
      return;
    } catch (erro) {
      // usuário cancelou ou navegador não compartilhou; usa fallback abaixo
    }
  }

  const copiado = await copiarTextoCompartilhamento(conteudo);

  if (copiado) {
    const abrirWhatsapp = confirm("Link e texto copiados. Deseja abrir o WhatsApp para compartilhar?");

    if (abrirWhatsapp) {
      window.open("https://wa.me/?text=" + encodeURIComponent(conteudo), "_blank");
    }
  } else {
    prompt("Copie o texto abaixo para compartilhar:", conteudo);
  }
}

async function montarTextoCompartilhamentoRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });

  if (!repertorio) {
    alert("Repertório não encontrado.");
    return null;
  }

  const projeto = appState.projetoAtual || {};
  const itens = await obterMusicasDoRepertorioParaPDF(repertorioId);
  const linhas = [];

  linhas.push("Repertório Fácil");
  linhas.push("");
  linhas.push("Projeto: " + (projeto.nome || "Projeto"));
  linhas.push("Repertório: " + (repertorio.nome || "Repertório"));

  if (repertorio.observacoes) {
    linhas.push("Observações: " + repertorio.observacoes);
  }

  linhas.push("");
  linhas.push("Músicas:");

  if (itens.length === 0) {
    linhas.push("Nenhuma música adicionada ainda.");
  } else {
    itens.forEach(function(item, indice) {
      const musica = item.musica || {};
      const numero = String(indice + 1).padStart(2, "0");
      let linha = numero + ". " + (musica.nome || "Sem nome");

      if (musica.artista) {
        linha += " - " + musica.artista;
      }

      const detalhes = [];

      if (musica.tom) {
        detalhes.push("Tom: " + musica.tom);
      }

      if (musica.bpm) {
        detalhes.push("BPM: " + musica.bpm);
      }

      if (detalhes.length > 0) {
        linha += " (" + detalhes.join(" • ") + ")";
      }

      linhas.push(linha);
    });
  }

  linhas.push("");
  linhas.push("Total de músicas: " + itens.length);
  linhas.push("Compartilhado pelo Repertório Fácil");

  return linhas.join("\n");
}

async function compartilharRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });

  if (!repertorio) {
    alert("Repertório não encontrado.");
    return;
  }

  const texto = await montarTextoCompartilhamentoRepertorio(repertorioId);

  if (!texto) {
    return;
  }

  const url = montarUrlCompartilhavel("repertorio", repertorioId);
  await compartilharConteudo("Repertório - " + (repertorio.nome || "Repertório"), texto, url);
}

function montarTextoCompartilhamentoEvento(evento) {
  const projeto = appState.projetoAtual || {};
  const linhas = [];

  linhas.push("Repertório Fácil");
  linhas.push("");
  linhas.push("Projeto: " + (projeto.nome || "Projeto"));
  linhas.push("Evento: " + (evento.nome || "Evento"));
  linhas.push("Data: " + formatarDataBR(evento.data_evento));

  if (evento.hora_evento) {
    linhas.push("Horário: " + evento.hora_evento);
  }

  if (evento.local) {
    linhas.push("Local: " + evento.local);
  }

  const localizacao = [evento.cidade, evento.estado].filter(Boolean).join(" - ");

  if (localizacao) {
    linhas.push("Cidade: " + localizacao);
  }

  linhas.push("Status: " + (evento.status || "Agendado"));
  linhas.push("Repertório: " + obterNomeRepertorioPorId(evento.repertorio_id));

  if (evento.observacoes) {
    linhas.push("Observações: " + evento.observacoes);
  }

  linhas.push("");
  linhas.push("Compartilhado pelo Repertório Fácil");

  return linhas.join("\n");
}

async function compartilharEvento(eventoId) {
  const evento = (appState.eventos || []).find(function(item) {
    return item.id === eventoId;
  });

  if (!evento) {
    alert("Evento não encontrado.");
    return;
  }

  const texto = montarTextoCompartilhamentoEvento(evento);
  const url = montarUrlCompartilhavel("evento", eventoId);
  await compartilharConteudo("Evento - " + (evento.nome || "Evento"), texto, url);
}

async function gerarPDFDoRepertorio(repertorioId) {
  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === repertorioId;
  });
  const projeto = appState.projetoAtual || {};

  if (!repertorio) {
    alert("Selecione um repertório salvo antes de gerar o PDF.");
    return;
  }

  const itens = await obterMusicasDoRepertorioParaPDF(repertorioId);

  if (itens.length === 0) {
    alert("Adicione músicas ao repertório antes de gerar o PDF.");
    return;
  }

  const dataGeracao = formatarDataPDF(new Date());
  const nomeProjeto = escaparHtml(projeto.nome || "Projeto");
  const nomeRepertorio = escaparHtml(repertorio.nome || "Repertório");
  const observacoes = escaparHtml(repertorio.observacoes || "");

  const linhas = itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");

    return `
      <tr>
        <td class="numero">${numero}</td>
        <td>
          <strong>${escaparHtml(musica.nome || "Sem nome")}</strong>
          <span>${escaparHtml(musica.artista || "Artista não informado")}</span>
        </td>
        <td>${escaparHtml(musica.tom || "-")}</td>
        <td>${escaparHtml(musica.bpm || "-")}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${nomeProjeto} - ${nomeRepertorio}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          font-family: Arial, Helvetica, sans-serif;
          color: #111827;
          background: #ffffff;
        }
        .cabecalho {
          border-bottom: 3px solid #6d28d9;
          padding-bottom: 16px;
          margin-bottom: 22px;
        }
        .marca {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #6d28d9;
          margin-bottom: 8px;
        }
        h1 {
          margin: 0 0 6px;
          font-size: 28px;
          color: #111827;
        }
        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #374151;
        }
        .info {
          margin-top: 14px;
          display: grid;
          gap: 4px;
          font-size: 13px;
          color: #4b5563;
        }
        .observacoes {
          margin: 18px 0;
          padding: 12px 14px;
          border-radius: 10px;
          background: #f3f4f6;
          font-size: 13px;
          color: #374151;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }
        th {
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .04em;
          color: #6b7280;
          border-bottom: 2px solid #e5e7eb;
          padding: 10px 8px;
        }
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 12px 8px;
          vertical-align: top;
          font-size: 14px;
        }
        td strong {
          display: block;
          font-size: 15px;
          color: #111827;
          margin-bottom: 3px;
        }
        td span {
          display: block;
          font-size: 12px;
          color: #6b7280;
        }
        .numero {
          width: 52px;
          font-weight: 800;
          color: #6d28d9;
        }
        .rodape {
          margin-top: 24px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          gap: 16px;
          font-size: 12px;
          color: #6b7280;
        }
        @media print {
          body { padding: 22px; }
          .cabecalho { break-after: avoid; }
          tr { break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <section class="cabecalho">
        <div class="marca">Repertório Fácil</div>
        <h1>${nomeProjeto}</h1>
        <h2>${nomeRepertorio}</h2>
        <div class="info">
          <div><strong>Data de geração:</strong> ${escaparHtml(dataGeracao)}</div>
          <div><strong>Total de músicas:</strong> ${itens.length}</div>
        </div>
      </section>

      ${observacoes ? `<div class="observacoes"><strong>Observações:</strong><br>${observacoes}</div>` : ""}

      <table>
        <thead>
          <tr>
            <th>Nº</th>
            <th>Música</th>
            <th>Tom</th>
            <th>BPM</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>

      <div class="rodape">
        <span>Gerado pelo Repertório Fácil</span>
        <span>${nomeRepertorio}</span>
      </div>

      <script>
        window.addEventListener('load', function() {
          setTimeout(function() {
            window.print();
          }, 300);
        });
      <\/script>
    </body>
    </html>
  `;

  abrirJanelaImpressaoRepertorio(html);
}

async function salvarRepertorioPDF() {
  const id = appState.repertorioEditandoId || appState.repertorioMontandoId;
  await gerarPDFDoRepertorio(id);
}

function fecharMontagemRepertorio() {
  appState.repertorioMontandoId = null;
  appState.repertorioMusicas = [];

  const montagem = elemento("montagem-repertorio");
  if (montagem) {
    montagem.style.display = "none";
    montagem.innerHTML = "";
  }

  const cardForm = elemento("card-form-repertorio");
  const cardLista = elemento("card-lista-repertorios");
  if (cardForm) {
    cardForm.classList.remove("card-repertorio-expandido");
    cardForm.style.gridColumn = "";
  }
  if (cardLista) {
    cardLista.style.display = "block";
  }
}

async function carregarEventos() {
  const area = elemento("area-modulo");
  const projetoId = obterProjetoAtualId();

  if (!area) {
    return;
  }

  if (!projetoId) {
    area.innerHTML = `
      <div class="card-projeto">
        <h3>Projeto não encontrado</h3>
        <p>Volte para Meus Projetos e acesse o projeto novamente.</p>
      </div>
    `;
    return;
  }

  area.innerHTML = `
    <style>
      .modulo-eventos {
        display: grid;
        grid-template-columns: minmax(280px, 420px) 1fr;
        gap: 18px;
        width: 100%;
      }

      .form-eventos,
      .filtros-eventos {
        display: grid;
        gap: 10px;
      }

      .form-eventos label,
      .filtros-eventos label {
        display: grid;
        gap: 6px;
        font-size: 13px;
        color: #e5e7eb;
      }

      .form-eventos input,
      .form-eventos select,
      .form-eventos textarea,
      .filtros-eventos input,
      .filtros-eventos select {
        width: 100%;
      }

      .form-eventos textarea {
        min-height: 92px;
        resize: vertical;
      }

      .linha-form-eventos {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .acoes-evento {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
      }

      .lista-eventos {
        display: grid;
        gap: 10px;
      }

      .item-evento {
        border: 1px solid rgba(255, 255, 255, .16);
        border-radius: 14px;
        padding: 14px;
        background: #1f2937;
        color: #f9fafb;
      }

      .item-evento-topo {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .item-evento-conteudo {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        flex: 1;
      }

      .icone-evento-placeholder {
        width: 42px;
        height: 42px;
        min-width: 42px;
        border-radius: 50%;
        background: #6d28d9;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #ffffff;
      }

      .dados-evento h4 {
        margin: 0 0 6px;
        color: #ffffff;
        font-size: 17px;
      }

      .dados-evento p {
        margin: 3px 0;
        font-size: 13px;
        color: #d1d5db;
      }

      .dados-evento strong {
        color: #f3f4f6;
      }

      .tag-status-evento {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 9px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        background: #374151;
        color: #e5e7eb;
      }

      .tag-status-confirmado {
        background: #166534;
        color: #dcfce7;
      }

      .tag-status-cancelado {
        background: #7f1d1d;
        color: #fee2e2;
      }

      .tag-status-realizado {
        background: #1e3a8a;
        color: #dbeafe;
      }

      .botoes-item-evento {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .botoes-item-evento button {
        border: 0;
        border-radius: 10px;
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .btn-editar-evento,
      .btn-compartilhar-evento {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-evento {
        background: #fee2e2;
        color: #991b1b;
      }

      @media (max-width: 820px) {
        .modulo-eventos,
        .linha-form-eventos,
        .filtros-eventos,
        .item-evento-topo {
          grid-template-columns: 1fr;
          flex-direction: column;
        }

        .botoes-item-evento {
          justify-content: flex-start;
        }
      }
    </style>

    <div class="modulo-eventos">
      <div class="card-projeto">
        <span class="tag">Cadastro</span>
        <h3 id="titulo-form-evento">Novo evento</h3>
        <p>Cadastre shows, ensaios e compromissos do projeto.</p>

        <div class="form-eventos">
          <label>
            Nome do evento
            <input id="evento-nome" type="text" placeholder="Ex: Festa Pinga Óleo MC" />
          </label>

          <div class="linha-form-eventos">
            <label>
              Data
              <input id="evento-data" type="date" />
            </label>

            <label>
              Horário
              <input id="evento-hora" type="time" />
            </label>
          </div>

          <label>
            Local
            <input id="evento-local" type="text" placeholder="Ex: Águias do Sol MC" />
          </label>

          <div class="linha-form-eventos">
            <label>
              Cidade
              <input id="evento-cidade" type="text" placeholder="Ex: Diadema" />
            </label>

            <label>
              Estado (UF)
              <input id="evento-estado" type="text" maxlength="2" placeholder="SP" />
            </label>
          </div>

          <label>
            Repertório
            <select id="evento-repertorio">
              <option value="">Sem repertório definido</option>
            </select>
          </label>

          <label>
            Status
            <select id="evento-status">
              <option value="Agendado">Agendado</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="Realizado">Realizado</option>
            </select>
          </label>

          <label>
            Observações
            <textarea id="evento-observacoes" placeholder="Ex: Chegar às 18h para passagem de som"></textarea>
          </label>

          <div class="acoes-evento">
            <button class="botao-card" id="btn-salvar-evento" type="button">Salvar evento</button>
            <button class="botao-secundario-modulo" id="btn-cancelar-evento" type="button" style="display:none;">Cancelar edição</button>
          </div>
        </div>
      </div>

      <div class="card-projeto">
        <span class="tag">Lista</span>
        <h3>Eventos cadastrados</h3>
        <p>Cadastre, edite ou exclua eventos do projeto.</p>

        <div class="filtros-eventos">
          <label>
            Pesquisar
            <input id="busca-eventos" type="text" placeholder="Buscar por evento, local, cidade, status ou repertório" />
          </label>
        </div>

        <div id="lista-eventos" class="lista-eventos">
          <p>Carregando eventos...</p>
        </div>
      </div>
    </div>
  `;

  appState.eventoEditandoId = null;
  configurarEventosModuloEventos();
  await carregarRepertoriosParaEvento();
  await buscarEventos();
}

function configurarEventosModuloEventos() {
  const botaoSalvar = elemento("btn-salvar-evento");
  const botaoCancelar = elemento("btn-cancelar-evento");
  const busca = elemento("busca-eventos");

  if (botaoSalvar) {
    botaoSalvar.addEventListener("click", salvarEvento);
  }

  if (botaoCancelar) {
    botaoCancelar.addEventListener("click", limparFormularioEvento);
  }

  if (busca) {
    busca.addEventListener("input", renderizarListaEventos);
  }
}

async function carregarRepertoriosParaEvento() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const select = elemento("evento-repertorio");

  if (!cliente || !projetoId || !select) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorios)
    .select("id, nome")
    .eq("projeto_id", projetoId)
    .order("nome", { ascending: true });

  if (error) {
    select.innerHTML = `<option value="">Erro ao carregar repertórios</option>`;
    return;
  }

  appState.repertorios = data || appState.repertorios || [];

  select.innerHTML = `<option value="">Sem repertório definido</option>`;

  (data || []).forEach(function(repertorio) {
    select.innerHTML += `
      <option value="${escaparHtml(repertorio.id)}">${escaparHtml(repertorio.nome || "Sem nome")}</option>
    `;
  });
}

async function buscarEventos() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const lista = elemento("lista-eventos");

  if (!cliente || !projetoId || !lista) {
    return;
  }

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("data_evento", { ascending: true })
    .order("hora_evento", { ascending: true });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar eventos: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.eventos = data || [];
  renderizarListaEventos();
}

function obterNomeRepertorioPorId(id) {
  if (!id) {
    return "Sem repertório definido";
  }

  const repertorio = (appState.repertorios || []).find(function(item) {
    return item.id === id;
  });

  return repertorio?.nome || "Repertório não encontrado";
}

function formatarDataBR(data) {
  if (!data) {
    return "Sem data";
  }

  const partes = String(data).split("-");

  if (partes.length !== 3) {
    return data;
  }

  return partes[2] + "/" + partes[1] + "/" + partes[0];
}

function renderizarListaEventos() {
  const lista = elemento("lista-eventos");
  const busca = limparTexto(elemento("busca-eventos")?.value).toLowerCase();

  if (!lista) {
    return;
  }

  let itens = [...(appState.eventos || [])];

  if (busca) {
    itens = itens.filter(function(item) {
      const texto = [
        item.nome,
        item.local,
        item.cidade,
        item.estado,
        item.status,
        item.observacoes,
        obterNomeRepertorioPorId(item.repertorio_id)
      ].join(" ").toLowerCase();

      return texto.includes(busca);
    });
  }

  if (itens.length === 0) {
    lista.innerHTML = `<p>Nenhum evento encontrado.</p>`;
    return;
  }

  lista.innerHTML = itens.map(function(item) {
    const status = item.status || "Agendado";
    const classeStatus = status === "Confirmado"
      ? "tag-status-confirmado"
      : status === "Cancelado"
        ? "tag-status-cancelado"
        : status === "Realizado"
          ? "tag-status-realizado"
          : "";

    return `
      <div class="item-evento">
        <div class="item-evento-topo">
          <div class="item-evento-conteudo">
            <div class="icone-evento-placeholder">📅</div>

            <div class="dados-evento">
              <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
              <p><strong>Data:</strong> ${escaparHtml(formatarDataBR(item.data_evento))}${item.hora_evento ? " • " + escaparHtml(item.hora_evento) : ""}</p>
              <p><strong>Local:</strong> ${escaparHtml(item.local || "Não informado")}</p>
              <p><strong>Cidade:</strong> ${escaparHtml(item.cidade || "Não informada")}${item.estado ? " - " + escaparHtml(item.estado) : ""}</p>
              <p><strong>Repertório:</strong> ${escaparHtml(obterNomeRepertorioPorId(item.repertorio_id))}</p>
              ${item.observacoes ? `<p><strong>Obs:</strong> ${escaparHtml(item.observacoes)}</p>` : ""}
              <span class="tag-status-evento ${classeStatus}">${escaparHtml(status)}</span>
            </div>
          </div>

          <div class="botoes-item-evento">
            <button class="btn-editar-evento" type="button" data-editar-evento="${escaparHtml(item.id)}">✎ Editar</button>
            <button class="btn-compartilhar-evento" type="button" data-compartilhar-evento="${escaparHtml(item.id)}">↗ Compartilhar</button>
            <button class="btn-excluir-evento" type="button" data-excluir-evento="${escaparHtml(item.id)}">🗑 Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

  lista.querySelectorAll("[data-editar-evento]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      editarEvento(botao.dataset.editarEvento);
    });
  });

  lista.querySelectorAll("[data-compartilhar-evento]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      compartilharEvento(botao.dataset.compartilharEvento);
    });
  });

  lista.querySelectorAll("[data-excluir-evento]").forEach(function(botao) {
    botao.addEventListener("click", function() {
      excluirEvento(botao.dataset.excluirEvento);
    });
  });
}

function obterDadosFormularioEvento() {
  return {
    nome: limparTexto(elemento("evento-nome")?.value),
    data_evento: limparTexto(elemento("evento-data")?.value),
    hora_evento: limparTexto(elemento("evento-hora")?.value),
    local: limparTexto(elemento("evento-local")?.value),
    cidade: limparTexto(elemento("evento-cidade")?.value),
    estado: normalizarUF(elemento("evento-estado")?.value),
    repertorio_id: limparTexto(elemento("evento-repertorio")?.value),
    status: limparTexto(elemento("evento-status")?.value) || "Agendado",
    observacoes: limparTexto(elemento("evento-observacoes")?.value)
  };
}

function preencherFormularioEvento(item) {
  if (!item) {
    return;
  }

  elemento("evento-nome").value = item.nome || "";
  elemento("evento-data").value = item.data_evento || "";
  elemento("evento-hora").value = item.hora_evento || "";
  elemento("evento-local").value = item.local || "";
  elemento("evento-cidade").value = item.cidade || "";
  elemento("evento-estado").value = item.estado || "";
  elemento("evento-repertorio").value = item.repertorio_id || "";
  elemento("evento-status").value = item.status || "Agendado";
  elemento("evento-observacoes").value = item.observacoes || "";

  const titulo = elemento("titulo-form-evento");
  const botaoSalvar = elemento("btn-salvar-evento");
  const botaoCancelar = elemento("btn-cancelar-evento");
  const botaoCompartilhar = elemento("btn-compartilhar-evento");
  const botaoGerarPdf = elemento("btn-gerar-pdf-evento");

  if (titulo) {
    titulo.textContent = "Editar evento";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "✓ Salvar alterações";
    botaoSalvar.style.display = "inline-flex";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = appState.repertorioEditandoId || appState.repertorioMontandoId ? "inline-flex" : "none";
  }

  if (botaoGerarPdf) {
    botaoGerarPdf.style.display = "none";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }

  const area = elemento("area-modulo");
  if (area) {
    area.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function limparFormularioEvento() {
  appState.eventoEditandoId = null;

  [
    "evento-nome",
    "evento-data",
    "evento-hora",
    "evento-local",
    "evento-cidade",
    "evento-estado",
    "evento-observacoes"
  ].forEach(function(id) {
    const campo = elemento(id);
    if (campo) {
      campo.value = "";
    }
  });

  const repertorio = elemento("evento-repertorio");
  const status = elemento("evento-status");
  const titulo = elemento("titulo-form-evento");
  const botaoSalvar = elemento("btn-salvar-evento");
  const botaoCancelar = elemento("btn-cancelar-evento");

  if (repertorio) {
    repertorio.value = "";
  }

  if (status) {
    status.value = "Agendado";
  }

  if (titulo) {
    titulo.textContent = "Novo evento";
  }

  if (botaoSalvar) {
    botaoSalvar.textContent = "Salvar evento";
  }

  if (botaoCancelar) {
    botaoCancelar.style.display = "none";
  }
}

async function salvarEvento() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const dados = obterDadosFormularioEvento();

  if (!dados.nome) {
    alert("Informe o nome do evento.");
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const payload = {
    projeto_id: projetoId,
    usuario_id: usuario.id,
    nome: dados.nome,
    data_evento: dados.data_evento || null,
    hora_evento: dados.hora_evento || null,
    local: dados.local,
    cidade: dados.cidade,
    estado: dados.estado,
    repertorio_id: dados.repertorio_id || null,
    status: dados.status,
    observacoes: dados.observacoes
  };

  let resultado;

  if (appState.eventoEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.eventos)
      .update(payload)
      .eq("id", appState.eventoEditandoId)
      .eq("projeto_id", projetoId)
      .eq("usuario_id", usuario.id);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.eventos)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar evento: " + resultado.error.message);
    return;
  }

  limparFormularioEvento();
  await buscarEventos();
}

function editarEvento(id) {
  const item = (appState.eventos || []).find(function(evento) {
    return evento.id === id;
  });

  if (!item) {
    alert("Evento não encontrado.");
    return;
  }

  appState.eventoEditandoId = id;
  preencherFormularioEvento(item);
}

async function excluirEvento(id) {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !id || !projetoId) {
    return;
  }

  const confirmar = confirm("Excluir este evento?");

  if (!confirmar) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    mostrarTela("tela-login", { registrar: false });
    return;
  }

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.eventos)
    .delete()
    .eq("id", id)
    .eq("projeto_id", projetoId);

  if (error) {
    alert("Erro ao excluir evento: " + error.message);
    return;
  }

  if (appState.eventoEditandoId === id) {
    limparFormularioEvento();
  }

  await buscarEventos();
}

async function criarEvento() {
  await salvarEvento();
}

async function restaurarProjetoAtual() {
  const id = obterProjetoAtualId();

  if (!id) {
    return;
  }

  const cliente = sb();

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

function configurarBotoesFixos() {
  const botaoGoogle = elemento("btn-google");

  if (botaoGoogle) {
    botaoGoogle.addEventListener("click", entrarComGoogle);
  }

  const botaoLogin = elemento("btn-login-email");

  if (botaoLogin) {
    botaoLogin.addEventListener("click", entrarComEmail);
  }

  const botaoCriarProjeto = elemento("btn-criar-projeto");

  if (botaoCriarProjeto) {
    botaoCriarProjeto.addEventListener("click", criarProjeto);
  }

  document.querySelectorAll("[onclick]").forEach(function(item) {
    const acao = item.getAttribute("onclick");

    if (!acao) {
      return;
    }

    item.removeAttribute("onclick");

    if (acao.includes("tela-cadastro")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-cadastro");
      });
    }

    if (acao.includes("tela-login")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-login");
      });
    }

    if (acao.includes("tela-projetos")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-projetos");
      });
    }

    if (acao.includes("tela-novo-projeto")) {
      item.addEventListener("click", function() {
        mostrarTela("tela-novo-projeto");
      });
    }

    if (acao.includes("validarCadastro")) {
      item.addEventListener("click", validarCadastro);
    }

    if (acao.includes("sair")) {
      item.addEventListener("click", sair);
    }
  });
}

function configurarEnterNosCampos() {
  const campos = [
    elemento("login-email"),
    elemento("login-senha")
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

function configurarNavegacaoEnterGlobal() {
  if (window.__repertorioFacilEnterGlobalConfigurado) {
    return;
  }

  window.__repertorioFacilEnterGlobalConfigurado = true;

  document.addEventListener("keydown", function(evento) {
    if (evento.key !== "Enter" || evento.isComposing) {
      return;
    }

    const campoAtual = evento.target;

    if (!campoAtual || !campoAtual.matches || !campoAtual.matches("input, select, textarea")) {
      return;
    }

    if (campoAtual.id === "login-email" || campoAtual.id === "login-senha") {
      return;
    }

    const tag = campoAtual.tagName.toLowerCase();

    if (tag === "textarea") {
      if (evento.ctrlKey || evento.metaKey) {
        evento.preventDefault();
        acionarBotaoSalvarDoFormulario(campoAtual);
      }

      return;
    }

    evento.preventDefault();

    if (evento.shiftKey) {
      focarCampoAnterior(campoAtual);
      return;
    }

    focarProximoCampoOuSalvar(campoAtual);
  });
}

function obterControlesDoFormulario(campo) {
  const container =
    campo.closest(".form-integrantes") ||
    campo.closest(".form-musicas") ||
    campo.closest(".form-repertorios") ||
    campo.closest(".form-eventos") ||
    campo.closest(".card-login") ||
    campo.closest(".card-projeto");

  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll("input, select, textarea")).filter(function(controle) {
    if (controle.disabled || controle.readOnly) {
      return false;
    }

    const estilo = window.getComputedStyle(controle);

    if (estilo.display === "none" || estilo.visibility === "hidden") {
      return false;
    }

    if (controle.offsetParent === null && estilo.position !== "fixed") {
      return false;
    }

    return true;
  });
}

function focarProximoCampoOuSalvar(campoAtual) {
  const controles = obterControlesDoFormulario(campoAtual);
  const indiceAtual = controles.indexOf(campoAtual);

  if (indiceAtual === -1) {
    return;
  }

  const proximoCampo = controles[indiceAtual + 1];

  if (proximoCampo) {
    proximoCampo.focus();

    if (typeof proximoCampo.select === "function" && proximoCampo.tagName.toLowerCase() !== "select") {
      proximoCampo.select();
    }

    return;
  }

  acionarBotaoSalvarDoFormulario(campoAtual);
}

function focarCampoAnterior(campoAtual) {
  const controles = obterControlesDoFormulario(campoAtual);
  const indiceAtual = controles.indexOf(campoAtual);

  if (indiceAtual <= 0) {
    return;
  }

  const campoAnterior = controles[indiceAtual - 1];

  if (campoAnterior) {
    campoAnterior.focus();

    if (typeof campoAnterior.select === "function" && campoAnterior.tagName.toLowerCase() !== "select") {
      campoAnterior.select();
    }
  }
}

function acionarBotaoSalvarDoFormulario(campo) {
  const container =
    campo.closest(".form-integrantes") ||
    campo.closest(".form-musicas") ||
    campo.closest(".form-repertorios") ||
    campo.closest(".form-eventos") ||
    campo.closest(".card-login") ||
    campo.closest(".card-projeto");

  if (!container) {
    return;
  }

  const botaoSalvar =
    container.querySelector("#btn-salvar-integrante") ||
    container.querySelector("#btn-salvar-musica") ||
    container.querySelector("#btn-salvar-repertorio") ||
    container.querySelector("#btn-salvar-evento") ||
    container.querySelector("#btn-criar-projeto") ||
    container.querySelector("#btn-login-email") ||
    container.querySelector("button[id*='salvar']") ||
    container.querySelector("button.botao-card") ||
    container.querySelector("button.botao-principal");

  if (botaoSalvar && !botaoSalvar.disabled) {
    botaoSalvar.click();
  }
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

      const codigoConvite = obterCodigoConvitePendente();
      if (codigoConvite) {
        carregarConvitePublico(codigoConvite);
        return;
      }

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


function prepararAplicacao() {
  configurarBotoesFixos();
  configurarEnterNosCampos();
  configurarAuthListener();
  configurarNavegacaoEnterGlobal();
}

document.addEventListener("DOMContentLoaded", async function() {
  prepararAplicacao();

  await verificarSessao();
  await restaurarProjetoAtual();
});