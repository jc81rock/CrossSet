"use strict";

const REPERTORIO_FACIL = {
  urlApp: "https://jc81rock.github.io/RepertorioFacilNovo/",
  tabelas: {
    projetos: "projetos",
    integrantes: "integrantes",
    musicas: "musicas",
    repertorios: "repertorios",
    repertorioMusicas: "repertorio_musicas",
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
    return codigoBusca.split("#")[0].split("&")[0];
  }

  const hashOriginal = window.location.hash || "";
  const hashLimpo = hashOriginal.replace(/^#/, "").replace(/^\?/, "");

  if (hashLimpo) {
    // Importante: depois do login Google o Supabase devolve tokens no hash.
    // Exemplo: #convite=ABC123#access_token=...
    // Por isso o código do convite precisa parar antes de & ou #.
    const matchIgual = hashLimpo.match(/convite=([^&#]+)/);
    if (matchIgual) {
      return decodeURIComponent(matchIgual[1]);
    }

    const matchRota = hashLimpo.match(/convite\/([^/?&#]+)/);
    if (matchRota) {
      return decodeURIComponent(matchRota[1]);
    }

    const paramsHash = new URLSearchParams(hashLimpo.split("#")[0]);
    const codigoHash = limparTexto(paramsHash.get("convite"));

    if (codigoHash) {
      return codigoHash.split("#")[0].split("&")[0];
    }
  }

  const pathMatch = window.location.pathname.match(/convite\/([^/?&#]+)/);
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
        gap: 10px;
        margin-top: 4px;
      }

      #btn-salvar-integrante,
      #btn-convidar-integrante {
        width: 100% !important;
        height: 42px !important;
        min-height: 42px !important;
        border: 0 !important;
        border-radius: 13px !important;
        padding: 0 44px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        position: relative !important;
        gap: 8px !important;
        font-size: 15px !important;
        font-weight: 600 !important;
        letter-spacing: .1px !important;
        line-height: 1 !important;
        cursor: pointer !important;
        transition: transform .15s ease, filter .15s ease, box-shadow .15s ease !important;
      }

      #btn-salvar-integrante {
        background: linear-gradient(135deg, #33c4ff, #7a5cff, #b84dff) !important;
        color: #ffffff !important;
        box-shadow: 0 8px 18px rgba(122, 92, 255, .20) !important;
      }

      #btn-salvar-integrante::before {
        content: "✓";
        position: absolute;
        left: 18px;
        top: 50%;
        transform: translateY(-50%);
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
        line-height: 1;
      }

      #btn-convidar-integrante {
        background: linear-gradient(135deg, #1fc562, #12ad4f) !important;
        color: #ffffff !important;
        box-shadow: 0 8px 18px rgba(37, 211, 102, .18) !important;
      }

      #btn-convidar-integrante::before {
        content: "☎";
        position: absolute;
        left: 16px;
        top: 50%;
        transform: translateY(-50%) rotate(-18deg);
        width: 20px;
        height: 20px;
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
      }

      #btn-convidar-integrante::after {
        content: "→";
        position: absolute;
        right: 18px;
        top: 50%;
        transform: translateY(-50%);
        color: #ffffff;
        font-size: 18px;
        font-weight: 600;
        line-height: 1;
      }

      #btn-salvar-integrante:hover {
        transform: translateY(-1px);
        filter: brightness(1.05);
      }

      #btn-convidar-integrante:hover {
        transform: translateY(-1px);
        filter: brightness(.97);
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
        padding: 8px 10px;
        cursor: pointer;
        font-weight: 700;
      }

      .btn-editar-integrante {
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-integrante {
        background: #fee2e2;
        color: #991b1b;
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
            <button class="botao-card" id="btn-salvar-integrante" type="button">Salvar integrante</button>
            <button class="botao-secundario-modulo" id="btn-convidar-integrante" type="button">Convidar por WhatsApp</button>
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

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("nome", { ascending: true });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar integrantes: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.integrantes = data || [];
  renderizarListaIntegrantes();
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
          </div>

          <div class="botoes-item-integrante">
            <button class="btn-editar-integrante" type="button" data-editar-integrante="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-excluir-integrante" type="button" data-excluir-integrante="${escaparHtml(item.id)}">Excluir</button>
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
    botaoCancelar.style.display = "none";
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
      .eq("projeto_id", projetoId)
      .eq("usuario_id", usuario.id);
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
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id);

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
    "Clique no link abaixo para aceitar o convite:",
    link,
    "",
    "Ao abrir, você cria seu login ou entra com Gmail. Depois completa seu cadastro de integrante e entra direto no projeto.",
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
  tela.style.justifyContent = "center";
  tela.style.alignItems = "center";
  tela.style.padding = "10px";

  tela.innerHTML = `
    <style>
      #tela-convite.tela-ativa {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        min-height: 100vh !important;
        padding: 10px !important;
      }

      #tela-convite .card-login {
        width: min(560px, calc(100vw - 20px)) !important;
        max-width: 560px !important;
        margin: 0 auto !important;
        padding: 14px 18px !important;
        border-radius: 22px !important;
      }

      #tela-convite .logo-login {
        width: 74px !important;
        max-height: 74px !important;
        margin: 0 auto 6px !important;
      }

      #tela-convite .tag {
        margin-bottom: 8px !important;
        padding: 4px 10px !important;
        font-size: 12px !important;
      }

      #tela-convite h1 {
        font-size: 24px !important;
        margin: 4px 0 6px !important;
        line-height: 1.1 !important;
      }

      #tela-convite p {
        margin-bottom: 8px !important;
        font-size: 13px !important;
        line-height: 1.3 !important;
      }

      #convite-detalhes {
        margin: 8px 0 !important;
      }

      #convite-acoes {
        gap: 8px !important;
      }

      #tela-convite input {
        min-height: 34px !important;
        height: 34px !important;
        margin-bottom: 0 !important;
        padding: 7px 10px !important;
        font-size: 13px !important;
      }

      #tela-convite .botao-principal,
      #tela-convite .botao-google {
        min-height: 36px !important;
        height: 36px !important;
        padding: 0 12px !important;
        font-size: 14px !important;
        margin-bottom: 0 !important;
      }

      #tela-convite .divisor {
        margin: 2px 0 !important;
      }

      #tela-convite .botao-link {
        margin-top: 8px !important;
        font-size: 13px !important;
      }

      @media (max-height: 760px) {
        #tela-convite.tela-ativa {
          align-items: flex-start !important;
        }
        #tela-convite .card-login {
          transform: scale(.92);
          transform-origin: top center;
        }
      }
    </style>

    <div class="card-login">
      <img src="logo.png" alt="Repertório Fácil" class="logo-login" />
      <span class="tag">Convite</span>
      <h1 id="convite-titulo">Convite para projeto musical</h1>
      <p id="convite-descricao">Carregando convite...</p>

      <div id="convite-detalhes" style="display:grid; gap:8px;"></div>

      <div id="convite-acoes" style="display:grid; gap:8px;"></div>

      <button class="botao-link" id="btn-voltar-login-convite" type="button">
        Voltar para o login
      </button>
    </div>
  `;

  app.appendChild(tela);

  const voltar = elemento("btn-voltar-login-convite");
  if (voltar) {
    voltar.addEventListener("click", function() {
      limparConvitePendente();
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

  if (data.status && data.status !== "pendente") {
    if (descricao) {
      descricao.textContent = "Este convite já foi utilizado ou não está mais disponível.";
    }
    if (detalhes) {
      detalhes.innerHTML = `
        <div style="border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px 12px; background:#111827; color:#f9fafb;">
          <p style="margin:0 0 6px; color:#d1d5db; font-size:13px;">Projeto</p>
          <h3 style="margin:0; font-size:22px;">${escaparHtml(data.projeto_nome || "Projeto musical")}</h3>
        </div>
      `;
    }
    if (acoes) {
      acoes.innerHTML = `<button class="botao-principal" type="button" id="btn-ir-login-convite-usado">Ir para o login</button>`;
      elemento("btn-ir-login-convite-usado")?.addEventListener("click", function() {
        mostrarTela("tela-login", { registrar: false });
      });
    }
    return;
  }

  appState.conviteAtual = data;
  localStorage.setItem("convite_pendente", codigo);

  renderizarCabecalhoConvite(data);

  const { data: sessaoParaConvite } = await cliente.auth.getSession();
  const usuarioLogado = sessaoParaConvite.session?.user;
  const autenticadoPeloConvite = localStorage.getItem("convite_autenticado_" + codigo) === "true";

  if (usuarioLogado && autenticadoPeloConvite) {
    appState.sessao = sessaoParaConvite.session;
    appState.usuario = usuarioLogado;
    preencherUsuario(usuarioLogado);
    renderizarCadastroIntegranteConvite(data, usuarioLogado);
    return;
  }

  renderizarAutenticacaoConvite(data);
}

function renderizarCabecalhoConvite(convite) {
  const descricao = elemento("convite-descricao");
  const detalhes = elemento("convite-detalhes");

  if (descricao) {
    descricao.textContent = "Você recebeu um convite para entrar em um projeto no Repertório Fácil.";
  }

  if (detalhes) {
    detalhes.innerHTML = `
      <div style="border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px 12px; background:#111827; color:#f9fafb; text-align:left;">
        <p style="margin:0 0 6px; color:#d1d5db; font-size:13px;">Você foi convidado para participar do projeto</p>
        <h3 style="margin:0 0 12px; font-size:22px;">${escaparHtml(convite.projeto_nome || "Projeto musical")}</h3>
        <p style="margin:3px 0;"><strong>Administrador:</strong> ${escaparHtml(convite.criado_por_nome || "Administrador")}</p>
        <p style="margin:10px 0 0; color:#d1d5db; font-size:13px;">Este convite é exclusivo para este projeto. Depois do acesso, você completará seu cadastro de integrante e será salvo diretamente aqui.</p>
      </div>
    `;
  }
}

function renderizarAutenticacaoConvite(convite) {
  const acoes = elemento("convite-acoes");

  if (!acoes) {
    return;
  }

  acoes.innerHTML = `
    <div style="border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px 12px; background:#0b1220; display:grid; gap:7px; text-align:left;">
      <h3 style="margin:0; color:#ffffff;">Aceitar convite</h3>
      <p style="margin:0; color:#d1d5db; font-size:13px;">Para aceitar o convite, crie seu login com e-mail e senha ou entre com Gmail. Depois disso abrirá o cadastro de integrante.</p>

      <button class="botao-google" id="btn-gmail-convite" type="button" style="min-height:36px;">
        <img src="logo_gmail.webp" alt="Gmail" style="width:22px;height:22px;object-fit:contain;margin-right:8px;vertical-align:middle;" />
        Entrar com Gmail
      </button>

      <div class="divisor" style="margin:4px 0;">
        <span></span>
        <p>ou crie sua conta</p>
        <span></span>
      </div>

      <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
        E-mail
        <input id="convite-auth-email" type="email" placeholder="email@exemplo.com" />
      </label>

      <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
        Senha
        <input id="convite-auth-senha" type="password" placeholder="Crie uma senha" />
      </label>

      <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
        Confirmar senha
        <input id="convite-auth-repetir-senha" type="password" placeholder="Repita a senha" />
      </label>

      <button class="botao-principal" id="btn-criar-login-convite" type="button">Criar minha conta</button>
    </div>
  `;

  elemento("btn-gmail-convite")?.addEventListener("click", entrarComGmailConvite);
  elemento("btn-criar-login-convite")?.addEventListener("click", criarLoginConvite);
}

function obterDadosAuthConvite() {
  return {
    email: limparTexto(elemento("convite-auth-email")?.value),
    senha: limparTexto(elemento("convite-auth-senha")?.value),
    repetirSenha: limparTexto(elemento("convite-auth-repetir-senha")?.value)
  };
}

async function entrarComGmailConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  localStorage.setItem("convite_pendente", convite.codigo);
  localStorage.setItem("convite_autenticado_" + convite.codigo, "true");

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
    localStorage.removeItem("convite_autenticado_" + convite.codigo);
    alert("Erro ao entrar com Gmail: " + error.message);
    return;
  }

  if (data && data.url) {
    window.location.href = data.url;
  }
}

async function criarLoginConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const dados = obterDadosAuthConvite();

  if (!dados.email) {
    alert("Informe seu e-mail.");
    return;
  }

  if (!dados.senha) {
    alert("Informe sua senha.");
    return;
  }

  if (dados.senha.length < 6) {
    alert("A senha precisa ter pelo menos 6 caracteres.");
    return;
  }

  if (dados.senha !== dados.repetirSenha) {
    alert("As senhas não coincidem.");
    return;
  }

  const botao = elemento("btn-criar-login-convite");
  if (botao) {
    botao.disabled = true;
    botao.textContent = "Criando conta...";
  }

  const { data, error } = await cliente.auth.signUp({
    email: dados.email,
    password: dados.senha,
    options: {
      emailRedirectTo: REPERTORIO_FACIL.urlApp + "#convite=" + encodeURIComponent(convite.codigo),
      data: {
        origem: "convite_repertorio_facil"
      }
    }
  });

  if (error) {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Criar minha conta";
    }
    alert("Erro ao criar login: " + error.message);
    return;
  }

  if (data.session && data.session.user) {
    localStorage.setItem("convite_autenticado_" + convite.codigo, "true");
    appState.sessao = data.session;
    appState.usuario = data.session.user;
    preencherUsuario(appState.usuario);
    renderizarCadastroIntegranteConvite(convite, appState.usuario);
    return;
  }

  if (botao) {
    botao.disabled = false;
    botao.textContent = "Criar login e senha";
  }

  alert("Conta criada. Se o Supabase pedir confirmação de e-mail, confirme pelo e-mail e depois abra novamente este convite para continuar.");
}

async function entrarEmailConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const dados = obterDadosAuthConvite();

  if (!dados.email || !dados.senha) {
    alert("Informe e-mail e senha.");
    return;
  }

  const botao = elemento("btn-entrar-email-convite");
  if (botao) {
    botao.disabled = true;
    botao.textContent = "Entrando...";
  }

  const { data, error } = await cliente.auth.signInWithPassword({
    email: dados.email,
    password: dados.senha
  });

  if (error) {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Já tenho conta: entrar";
    }
    alert("Erro ao entrar: " + error.message);
    return;
  }

  appState.sessao = data.session || null;
  appState.usuario = data.user || data.session?.user || null;
  preencherUsuario(appState.usuario);
  renderizarCadastroIntegranteConvite(convite, appState.usuario);
}

function renderizarCadastroIntegranteConvite(convite, usuario) {
  renderizarCabecalhoConvite(convite);

  const descricao = elemento("convite-descricao");
  const acoes = elemento("convite-acoes");

  if (descricao) {
    descricao.textContent = "Agora complete seu cadastro de integrante. Ele será salvo diretamente no projeto informado acima.";
  }

  if (!acoes) {
    return;
  }

  const nomePadrao = escaparHtml(obterNomeUsuario(usuario) === "Usuário" ? "" : obterNomeUsuario(usuario));
  const emailPadrao = escaparHtml(usuario?.email || "");

  acoes.innerHTML = `
    <div style="border:1px solid rgba(255,255,255,.12); border-radius:12px; padding:10px 12px; background:#0b1220; display:grid; gap:7px; text-align:left;">
      <h3 style="margin:0; color:#ffffff;">Cadastro de integrante</h3>
      <p style="margin:0; color:#d1d5db; font-size:13px;">Preencha seus dados na banda. Ao salvar, você entrará direto no projeto.</p>

      <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
        Nome
        <input id="convite-integrante-nome" type="text" placeholder="Seu nome" value="${nomePadrao}" />
      </label>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          Função
          <input id="convite-integrante-funcao" type="text" placeholder="Ex: Guitarrista" />
        </label>

        <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
          Instrumento
          <input id="convite-integrante-instrumento" type="text" placeholder="Ex: Guitarra" />
        </label>
      </div>

      <label style="display:grid; gap:6px; color:#e5e7eb; font-size:13px;">
        WhatsApp / Telefone
        <input id="convite-integrante-telefone" type="tel" placeholder="(00) 00000-0000" />
      </label>

      <input id="convite-integrante-email" type="hidden" value="${emailPadrao}" />

      <button class="botao-principal" id="btn-salvar-integrante-convite" type="button">Salvar e entrar no projeto</button>
    </div>
  `;

  elemento("btn-salvar-integrante-convite")?.addEventListener("click", salvarIntegranteConvite);
}

function obterDadosIntegranteConvite() {
  return {
    nome: limparTexto(elemento("convite-integrante-nome")?.value),
    funcao: limparTexto(elemento("convite-integrante-funcao")?.value) || "Integrante",
    instrumento: limparTexto(elemento("convite-integrante-instrumento")?.value),
    telefone: limparTexto(elemento("convite-integrante-telefone")?.value),
    email: limparTexto(elemento("convite-integrante-email")?.value)
  };
}

async function salvarIntegranteConvite() {
  const cliente = sb();
  const convite = appState.conviteAtual;

  if (!cliente || !convite) {
    return;
  }

  const { data: sessionData } = await cliente.auth.getSession();
  const usuario = sessionData.session?.user;

  if (!usuario) {
    renderizarAutenticacaoConvite(convite);
    return;
  }

  const dados = obterDadosIntegranteConvite();

  if (!dados.nome) {
    alert("Informe seu nome.");
    return;
  }

  const botao = elemento("btn-salvar-integrante-convite");
  if (botao) {
    botao.disabled = true;
    botao.textContent = "Salvando...";
  }

  await aceitarConviteComUsuario(usuario, dados);
}

function obterDadosCadastroConvite() {
  return obterDadosIntegranteConvite();
}

function salvarDadosConviteTemporario() {}
function obterDadosConviteTemporario() { return null; }
function limparDadosConviteTemporario() {
  localStorage.removeItem("convite_dados_pendentes");
}

async function entrarComGmailEAceitarConvite() {
  await entrarComGmailConvite();
}

async function criarContaEAceitarConvite() {
  await criarLoginConvite();
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
  const botao = elemento("btn-salvar-integrante-convite");

  if (!cliente || !convite || !usuario) {
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar e entrar no projeto";
    }
    return;
  }

  if (convite.status && convite.status !== "pendente") {
    alert("Este convite já foi utilizado ou não está mais disponível.");
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar e entrar no projeto";
    }
    return;
  }

  const projetoId = convite.projeto_id;
  const nomeUsuario = limparTexto(dadosPerfil.nome) || obterNomeUsuario(usuario);
  const emailUsuario = limparTexto(dadosPerfil.email) || usuario.email || "";
  const funcaoUsuario = limparTexto(dadosPerfil.funcao) || "Integrante";
  const instrumentoUsuario = limparTexto(dadosPerfil.instrumento);
  const telefoneUsuario = limparTexto(dadosPerfil.telefone);

  if (!projetoId) {
    alert("Convite sem projeto vinculado. Gere um novo convite.");
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar e entrar no projeto";
    }
    return;
  }

  const { data: existente, error: erroBusca } = await cliente
    .from(REPERTORIO_FACIL.tabelas.integrantes)
    .select("id")
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id)
    .maybeSingle();

  if (erroBusca) {
    alert("Erro ao verificar integrante: " + erroBusca.message);
    if (botao) {
      botao.disabled = false;
      botao.textContent = "Salvar e entrar no projeto";
    }
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
        telefone: telefoneUsuario,
        convite_id: convite.id,
        status: "ativo"
      });

    if (erroInserir) {
      alert("Erro ao salvar integrante: " + erroInserir.message);
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Salvar e entrar no projeto";
      }
      return;
    }
  } else {
    alert("Este login já está cadastrado neste projeto. Para cadastrar outro integrante, a pessoa precisa aceitar o convite usando a própria conta/Gmail dela.");
  }

  const { error: erroAceitar } = await cliente
    .from(REPERTORIO_FACIL.tabelas.convites)
    .update({
      status: "aceito",
      aceito_em: new Date().toISOString(),
      aceito_por: usuario.id
    })
    .eq("id", convite.id);

  if (erroAceitar) {
    console.warn("Integrante salvo, mas não foi possível marcar o convite como aceito:", erroAceitar.message);
  }

  let projeto = {
    id: projetoId,
    nome: convite.projeto_nome || convite.nome_projeto || "Projeto musical",
    estilo: "Projeto musical",
    cidade: "",
    estado: ""
  };

  const { data: projetoData, error: erroProjeto } = await cliente
    .from(REPERTORIO_FACIL.tabelas.projetos)
    .select("*")
    .eq("id", projetoId)
    .maybeSingle();

  if (!erroProjeto && projetoData) {
    projeto = projetoData;
  }

  salvarProjetoAtual(projeto);
  localStorage.removeItem("convite_autenticado_" + convite.codigo);
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

  if (botao) {
    botao.disabled = false;
    botao.textContent = "Salvar e entrar no projeto";
  }

  if (typeof mostrarToast === "function") {
    mostrarToast("Cadastro salvo. Bem-vindo ao projeto " + (projeto.nome || "musical") + "!");
  }

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
        <p>Cadastre músicas com tom, BPM, link, letra e material musical para montar repertórios.</p>

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
              <small class="ajuda-campo-musica">Velocidade da música (contagem aproximada)</small>
            </label>
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

  const { data, error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("created_at", { ascending: false });

  if (error) {
    lista.innerHTML = `<p>Erro ao carregar músicas: ${escaparHtml(error.message)}</p>`;
    return;
  }

  appState.musicas = data || [];
  renderizarListaMusicas();
}

function obterLinkMusica(item) {
  return item.link_url || item.link || item.youtube_url || item.spotify_url || "";
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

            ${indicadores ? `<div class="indicadores-musica">${indicadores}</div>` : ""}

            ${link ? `<p><a class="link-musica" href="${linkSeguro}" target="_blank" rel="noopener noreferrer">▶ Assistir / Ouvir</a></p>` : ""}
            ${item.observacoes ? `<p><strong>Obs.:</strong> ${escaparHtml(item.observacoes)}</p>` : ""}
          </div>

          <div class="botoes-item-musica">
            <button class="btn-editar-musica" type="button" data-editar-musica="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-excluir-musica" type="button" data-excluir-musica="${escaparHtml(item.id)}">Excluir</button>
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
        gap: 8px;
        flex-wrap: wrap;
        margin-top: 4px;
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
        background: #e5e7eb;
        color: #111827;
      }

      .btn-excluir-repertorio,
      .btn-remover-musica-repertorio {
        background: #fee2e2;
        color: #991b1b;
      }

      .montagem-repertorio {
        margin-top: 18px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,.12);
      }

      .montagem-repertorio-grid {
        display: grid;
        grid-template-columns: minmax(280px, 1fr) minmax(280px, 1.2fr);
        gap: 18px;
      }

      .titulo-montagem-repertorio {
        margin-bottom: 14px;
      }

      .titulo-montagem-repertorio h3 {
        margin-bottom: 6px;
      }

      @media (max-width: 820px) {
        .modulo-repertorios,
        .montagem-repertorio-grid,
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
    </style>

    <div class="modulo-repertorios">
      <div class="card-projeto">
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
            <button class="botao-card" id="btn-salvar-repertorio" type="button">Salvar repertório</button>
            <button class="botao-secundario-modulo btn-compartilhar-repertorio" id="btn-compartilhar-repertorio" type="button" style="display:none;">Compartilhar</button>
            <button class="botao-secundario-modulo btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio" type="button" style="display:none;">PDF</button>
            <button class="botao-secundario-modulo" id="btn-cancelar-repertorio" type="button" style="display:none;">Cancelar edição</button>
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
  renderizarListaRepertorios();
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
    return `
      <div class="item-repertorio">
        <div class="item-repertorio-topo">
          <div class="item-repertorio-conteudo">
            <div class="icone-repertorio-placeholder">R</div>
            <div class="dados-repertorio">
              <h4>${escaparHtml(item.nome || "Sem nome")}</h4>
              <p>${escaparHtml(item.observacoes || "Sem observações")}</p>
            </div>
          </div>

          <div class="botoes-item-repertorio">
            <button class="btn-editar-repertorio" type="button" data-editar-repertorio="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-compartilhar-repertorio" type="button" data-compartilhar-repertorio="${escaparHtml(item.id)}">Compartilhar</button>
            <button class="btn-excluir-repertorio" type="button" data-excluir-repertorio="${escaparHtml(item.id)}">Excluir</button>
          </div>
        </div>
      </div>
    `;
  }).join("");

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
    botaoSalvar.textContent = "Salvar alterações";
    botaoSalvar.style.display = "none";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
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
    botaoSalvar.textContent = "Salvar repertório";
    botaoSalvar.style.display = "inline-block";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
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

  fecharMontagemRepertorio();
}

async function salvarRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();

  if (!cliente || !projetoId) {
    return;
  }

  const nome = limparTexto(elemento("repertorio-nome")?.value);
  const observacoes = limparTexto(elemento("repertorio-observacoes")?.value);

  if (!nome) {
    alert("Informe o nome do repertório.");
    return;
  }

  const payload = {
    projeto_id: projetoId,
    nome: nome,
    observacoes: observacoes
  };

  let resultado;

  if (appState.repertorioEditandoId) {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .update(payload)
      .eq("id", appState.repertorioEditandoId)
      .eq("projeto_id", projetoId);
  } else {
    resultado = await cliente
      .from(REPERTORIO_FACIL.tabelas.repertorios)
      .insert(payload);
  }

  if (resultado.error) {
    alert("Erro ao salvar repertório: " + resultado.error.message);
    return;
  }

  limparFormularioRepertorio();
  await buscarRepertorios();
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
  return (appState.repertorios || []).find(function(repertorio) {
    return repertorio.id === appState.repertorioMontandoId;
  });
}

async function montarRepertorio(id) {
  appState.repertorioMontandoId = id;
  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();

  const montagem = elemento("montagem-repertorio");
  if (montagem) {
    montagem.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function carregarDadosMontagemRepertorio() {
  const cliente = sb();
  const projetoId = obterProjetoAtualId();
  const repertorioId = appState.repertorioMontandoId;

  if (!cliente || !projetoId || !repertorioId) {
    return;
  }

  const { data: musicas, error: erroMusicas } = await cliente
    .from(REPERTORIO_FACIL.tabelas.musicas)
    .select("*")
    .eq("projeto_id", projetoId)
    .order("nome", { ascending: true });

  if (erroMusicas) {
    alert("Erro ao carregar músicas: " + erroMusicas.message);
    return;
  }

  const { data: relacoes, error: erroRelacoes } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .select("*")
    .eq("repertorio_id", repertorioId)
    .order("ordem", { ascending: true });

  if (erroRelacoes) {
    alert("Erro ao carregar músicas do repertório: " + erroRelacoes.message);
    return;
  }

  appState.musicas = musicas || [];
  appState.repertorioMusicas = (relacoes || []).map(function(relacao) {
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

  let musicasDisponiveis = (appState.musicas || []).filter(function(musica) {
    return !idsSelecionados.has(musica.id);
  });

  if (buscaAtual) {
    musicasDisponiveis = musicasDisponiveis.filter(function(musica) {
      const texto = [musica.nome, musica.artista, musica.tom, musica.bpm].join(" ").toLowerCase();
      return texto.includes(buscaAtual);
    });
  }

  const selecionadas = [...(appState.repertorioMusicas || [])].sort(function(a, b) {
    return Number(a.ordem || 0) - Number(b.ordem || 0);
  });

  montagem.innerHTML = `
    <div class="titulo-montagem-repertorio">
      <span class="tag">Músicas do repertório</span>
      <p><strong>${escaparHtml(repertorio.nome || "Repertório")}</strong></p>
      <p>Adicione músicas, altere a ordem e remova músicas deste repertório.</p>
    </div>

    <div class="montagem-repertorio-grid">
      <div>
        <h3>Biblioteca de músicas</h3>
        <div class="filtros-montagem-repertorio">
          <label>
            Pesquisar música
            <input id="busca-musicas-repertorio" type="text" placeholder="Buscar por nome, artista ou tom" value="${escaparHtml(buscaAtual)}" />
          </label>
        </div>
        <div id="lista-biblioteca-musicas" class="lista-biblioteca-musicas">
          ${renderizarBibliotecaMusicasRepertorio(musicasDisponiveis)}
        </div>
      </div>

      <div>
        <h3>Músicas no repertório</h3>
        <p>${selecionadas.length} música(s) selecionada(s).</p>
        <div id="lista-musicas-repertorio" class="lista-musicas-repertorio">
          ${renderizarMusicasSelecionadasRepertorio(selecionadas)}
        </div>
      </div>
    </div>

    <div class="acoes-edicao-repertorio">
      <button class="botao-card" id="btn-salvar-repertorio-edicao" type="button">Salvar alterações</button>
      <button class="botao-secundario-modulo btn-compartilhar-repertorio" id="btn-compartilhar-repertorio-edicao" type="button">Compartilhar</button>
      <button class="botao-secundario-modulo btn-gerar-pdf-repertorio" id="btn-gerar-pdf-repertorio-edicao" type="button">Gerar PDF</button>
      <button class="botao-secundario-modulo" id="btn-cancelar-repertorio-edicao" type="button">Cancelar edição</button>
    </div>
  `;

  configurarEventosMontagemRepertorio();
}

function renderizarBibliotecaMusicasRepertorio(musicas) {
  if (!musicas || musicas.length === 0) {
    return `<p>Nenhuma música disponível para adicionar.</p>`;
  }

  return musicas.map(function(musica) {
    return `
      <div class="item-biblioteca-musica">
        <div class="dados-biblioteca-musica">
          <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
          <p>${escaparHtml(musica.artista || "Artista não informado")}</p>
          <p>Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
        </div>
        <button class="btn-adicionar-musica-repertorio" type="button" data-adicionar-musica-repertorio="${escaparHtml(musica.id)}">+ Adicionar</button>
      </div>
    `;
  }).join("");
}

function renderizarMusicasSelecionadasRepertorio(itens) {
  if (!itens || itens.length === 0) {
    return `<p>Nenhuma música adicionada ainda.</p>`;
  }

  return itens.map(function(item, indice) {
    const musica = item.musica || {};
    const numero = String(indice + 1).padStart(2, "0");

    return `
      <div class="item-musica-repertorio">
        <div class="item-musica-repertorio-conteudo">
          <div class="numero-musica-repertorio">${numero}</div>
          <div class="dados-musica-repertorio">
            <h4>${escaparHtml(musica.nome || "Sem nome")}</h4>
            <p>${escaparHtml(musica.artista || "Artista não informado")}</p>
            <p>Tom: ${escaparHtml(musica.tom || "Não informado")} ${musica.bpm ? "• BPM: " + escaparHtml(musica.bpm) : ""}</p>
          </div>
        </div>

        <div class="botoes-musica-repertorio">
          <button class="btn-subir-musica" type="button" data-subir-musica-repertorio="${escaparHtml(item.id)}">⬆ Antes</button>
          <button class="btn-descer-musica" type="button" data-descer-musica-repertorio="${escaparHtml(item.id)}">⬇ Depois</button>
          <button class="btn-remover-musica-repertorio" type="button" data-remover-musica-repertorio="${escaparHtml(item.id)}">🗑 Remover</button>
        </div>
      </div>
    `;
  }).join("");
}

function configurarEventosMontagemRepertorio() {
  const busca = elemento("busca-musicas-repertorio");
  const botaoSalvarEdicao = elemento("btn-salvar-repertorio-edicao");
  const botaoCompartilharEdicao = elemento("btn-compartilhar-repertorio-edicao");
  const botaoGerarPdfEdicao = elemento("btn-gerar-pdf-repertorio-edicao");
  const botaoCancelarEdicao = elemento("btn-cancelar-repertorio-edicao");

  if (busca) {
    busca.addEventListener("input", renderizarMontagemRepertorio);
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

async function adicionarMusicaAoRepertorio(musicaId) {
  const cliente = sb();
  const repertorioId = appState.repertorioMontandoId;

  if (!cliente || !repertorioId || !musicaId) {
    return;
  }

  const maiorOrdem = (appState.repertorioMusicas || []).reduce(function(maior, item) {
    return Math.max(maior, Number(item.ordem || 0));
  }, 0);

  const { error } = await cliente
    .from(REPERTORIO_FACIL.tabelas.repertorioMusicas)
    .insert({
      repertorio_id: repertorioId,
      musica_id: musicaId,
      ordem: maiorOrdem + 1
    });

  if (error) {
    alert("Erro ao adicionar música ao repertório: " + error.message);
    return;
  }

  await carregarDadosMontagemRepertorio();
  renderizarMontagemRepertorio();
}

async function removerMusicaDoRepertorio(relacaoId) {
  const cliente = sb();

  if (!cliente || !relacaoId) {
    return;
  }

  const confirmar = confirm("Remover esta música do repertório?");

  if (!confirmar) {
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

  if (!cliente || !relacaoId) {
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
            <button class="btn-editar-evento" type="button" data-editar-evento="${escaparHtml(item.id)}">Editar</button>
            <button class="btn-compartilhar-evento" type="button" data-compartilhar-evento="${escaparHtml(item.id)}">Compartilhar</button>
            <button class="btn-excluir-evento" type="button" data-excluir-evento="${escaparHtml(item.id)}">Excluir</button>
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
    botaoSalvar.textContent = "Salvar alterações";
    botaoSalvar.style.display = "none";
  }

  if (botaoCompartilhar) {
    botaoCompartilhar.style.display = "none";
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
    .eq("projeto_id", projetoId)
    .eq("usuario_id", usuario.id);

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