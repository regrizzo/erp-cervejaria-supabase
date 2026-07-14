
const SUPABASE_URL = "https://bwmkdalsupuzrsxdlrcm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtkYWxzdXB1enJzeGRscmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODY2MDYsImV4cCI6MjA5OTU2MjYwNn0.OJuCLFtIr5K9noT-w2jp0mW_SctmIMmv5mtfbSEc6ZE";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  loaded: {},
  cervejas: [],
  insumos: [],
  clientes: [],
  producoesFermentando: [],
  fermentosReuso: [],
  debitosPhenomena: [],
  configuracoes: {},
  retornos: []
};

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await sb.auth.getSession();
  if (data.session) iniciarApp();
  else mostrarLogin();
});

function mostrarLogin() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("app").style.display = "none";
}

function iniciarApp() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("app").style.display = "block";
  carregarInicio();
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginSenha").value;
  const erro = document.getElementById("loginErro");
  erro.style.display = "none";

  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    erro.innerText = error.message;
    erro.style.display = "block";
    return;
  }
  iniciarApp();
}

async function logout() {
  await sb.auth.signOut();
  mostrarLogin();
}

function mostrarTela(nome) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".bottomNav button").forEach(b => b.classList.remove("active"));

  const mapa = {
    inicio: "telaInicio",
    producao: "telaProducao",
    estoque: "telaEstoque",
    saidas: "telaSaidas",
    mais: "telaMais",
    fermentos: "telaFermentos",
    phenomena: "telaPhenomena",
    retornos: "telaRetornos",
    painelDia: "telaPainelDia",
    relatorio: "telaRelatorio",
    auditoria: "telaAuditoria",
    configuracoes: "telaConfiguracoes",
    backup: "telaBackup",
    clientes: "telaClientes",
    cadastros: "telaCadastros"
  };

  document.getElementById(mapa[nome]).classList.add("active");

  const btns = document.querySelectorAll(".bottomNav button");
  if (nome === "inicio") btns[0].classList.add("active");
  if (nome === "producao") btns[1].classList.add("active");
  if (nome === "estoque") btns[2].classList.add("active");
  if (nome === "saidas") btns[3].classList.add("active");
  if (["mais","clientes","cadastros","fermentos","phenomena","retornos","painelDia","relatorio","auditoria","configuracoes","backup"].includes(nome)) btns[4].classList.add("active");

  if (nome === "inicio") carregarInicio();
  if (nome === "producao") carregarProducao();
  if (nome === "estoque") carregarEstoque();
  if (nome === "saidas") carregarSaidas();
  if (nome === "clientes") carregarClientes();
  if (nome === "cadastros") carregarCadastros();
  if (nome === "fermentos") carregarFermentos();
  if (nome === "phenomena") carregarPhenomena();
  if (nome === "retornos") carregarRetornos();
  if (nome === "painelDia") carregarPainelDia();
  if (nome === "relatorio") prepararRelatorio();
  if (nome === "auditoria") carregarAuditoria();
  if (nome === "configuracoes") carregarConfiguracoes();
}

function toggleForm(id) {
  const el = document.getElementById(id);
  const aberto = el.style.display === "block";
  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  el.style.display = aberto ? "none" : "block";

  if (!aberto) {
    if (id === "formProducao") prepararFormProducao();
    if (id === "formDryHop") prepararFormDryHop();
    if (id === "formEnvase") prepararFormEnvase();
    if (id === "formEntradaCerveja") prepararFormEntradaCerveja();
    if (id === "formEntradaInsumo") prepararFormEntradaInsumo();
    if (id === "formAjusteCerveja") prepararFormAjusteCerveja();
    if (id === "formAjusteInsumo") prepararFormAjusteInsumo();
    if (id === "formSaida") prepararFormSaida();
    if (id === "formColetaFermento") prepararFormColetaFermento();
    if (id === "formDescarteFermento") prepararFormDescarteFermento();
    if (id === "formRetiradaPhenomena") prepararFormRetiradaPhenomena();
    if (id === "formPagamentoPhenomena") prepararFormPagamentoPhenomena();
    if (id === "formRetorno") prepararFormRetorno();
    if (id === "formExtratoCliente") prepararFormExtratoCliente();
  }
}

function mostrarErro(id, msg) {
  const el = document.getElementById(id);
  if (!msg) {
    el.style.display = "none";
    el.innerText = "";
  } else {
    el.innerText = msg;
    el.style.display = "block";
  }
}

function fmt(n, casas=0) {
  return Number(n || 0).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

function fmtMoeda(n) {
  return Number(n || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}

async function carregarConfiguracoesBase(force=false) {
  if (state.loaded.configuracoesBase && !force) return;

  const { data, error } = await sb.from("configuracoes").select("*");
  state.configuracoes = {};

  if (!error) {
    (data || []).forEach(r => state.configuracoes[r.chave] = r.valor);
  }

  if (!state.configuracoes.dias_alerta_barril_cliente) state.configuracoes.dias_alerta_barril_cliente = "21";
  if (!state.configuracoes.dias_alerta_lote_fermentando) state.configuracoes.dias_alerta_lote_fermentando = "10";
  if (!state.configuracoes.dias_alerta_validade_insumos) state.configuracoes.dias_alerta_validade_insumos = "30";

  state.loaded.configuracoesBase = true;
}

function getConfigNumero(chave, padrao) {
  const v = Number(state.configuracoes[chave]);
  return Number.isFinite(v) ? v : padrao;
}

function litrosBarris(q10,q20,q30,q50) {
  return (Number(q10)||0)*10 + (Number(q20)||0)*20 + (Number(q30)||0)*30 + (Number(q50)||0)*50;
}

function somaBarris(q10,q20,q30,q50) {
  return (Number(q10)||0) + (Number(q20)||0) + (Number(q30)||0) + (Number(q50)||0);
}

function ordenarComZeradosFinal(arr, getNome, getQtd) {
  return [...arr].sort((a,b) => {
    const za = Number(getQtd(a) || 0) <= 0 ? 1 : 0;
    const zb = Number(getQtd(b) || 0) <= 0 ? 1 : 0;
    if (za !== zb) return za - zb;
    return String(getNome(a)).localeCompare(String(getNome(b)), "pt-BR");
  });
}

function invalidar(...nomes) {
  nomes.forEach(n => state.loaded[n] = false);
}

async function carregarInicio(force=false) {
  if (state.loaded.inicio && !force) return;

  const [estoque, producoes, clientes, insumos, saidas, retornos] = await Promise.all([
    sb.from("estoque_cerveja").select("litros"),
    sb.from("producoes").select("id,status").eq("status","FERMENTANDO"),
    sb.from("clientes").select("id", { count:"exact", head:true }),
    sb.from("estoque_insumos").select("tipo,quantidade"),
    sb.from("saidas").select("q10,q20,q30,q50"),
    sb.from("retornos").select("q10,q20,q30,q50")
  ]);

  const litros = (estoque.data || []).reduce((s,r) => s + Number(r.litros || 0), 0);
  const malte = (insumos.data || []).filter(i => i.tipo === "MALTE").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const lupulo = (insumos.data || []).filter(i => i.tipo === "LUPULO").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const fermento = (insumos.data || []).filter(i => i.tipo === "FERMENTO").reduce((s,r) => s + Number(r.quantidade || 0), 0);

  const barrisSaidas = (saidas.data || []).reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisRetornos = (retornos.data || []).reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0);
  const barrisEmClientes = Math.max(0, barrisSaidas - barrisRetornos);

  document.getElementById("cardEstoqueCerveja").innerText = fmt(litros) + " L";
  document.getElementById("cardFermentando").innerText = (producoes.data || []).length;
  document.getElementById("cardClientes").innerText = clientes.count || 0;
  document.getElementById("cardMalte").innerText = fmt(malte, 1) + " KG";
  document.getElementById("cardLupulo").innerText = fmt(lupulo, 1) + " G";
  document.getElementById("cardFermento").innerText = fmt(fermento, 1) + " UN";
  const cardBarris = document.getElementById("cardBarrisClientes");
  if (cardBarris) cardBarris.innerText = barrisEmClientes;

  const { data: movs } = await sb.from("movimentacoes")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(5);

  const movBox = document.getElementById("inicioMovimentacoes");
  if (movBox) {
    movBox.innerHTML = (movs || []).length ? "" : '<div class="item"><span class="sub">Nenhuma movimentação ainda.</span></div>';
    (movs || []).forEach(m => {
      movBox.insertAdjacentHTML("beforeend", `
        <div class="item">
          <div>
            <strong>${escapeHtml(m.tipo)} — ${escapeHtml(m.item_nome || "")}</strong>
            <div class="sub">${dataHoraBR(m.criado_em)} • ${escapeHtml(m.categoria || "")}</div>
          </div>
          <span class="badge">${fmt(m.quantidade,2)} ${escapeHtml(m.unidade || "")}</span>
        </div>
      `);
    });
  }

  state.loaded.inicio = true;
}

async function carregarBaseCadastros(force=false) {
  if (state.loaded.baseCadastros && !force) return;

  const [cervejas, insumos, clientes] = await Promise.all([
    sb.from("cervejas").select("*").eq("ativo", true).order("nome"),
    sb.from("insumos").select("*").eq("ativo", true).order("tipo").order("nome"),
    sb.from("clientes").select("*").eq("ativo", true).order("nome")
  ]);

  state.cervejas = cervejas.data || [];
  state.insumos = insumos.data || [];
  state.clientes = clientes.data || [];
  state.loaded.baseCadastros = true;
}

async function carregarProducoesFermentando(force=false) {
  if (state.loaded.producoesFermentando && !force) return;
  const { data } = await sb.from("producoes")
    .select("*")
    .eq("status","FERMENTANDO")
    .order("data_producao", { ascending:false });
  state.producoesFermentando = data || [];
  state.loaded.producoesFermentando = true;
}

async function carregarProducao(force=false) {
  if (state.loaded.producao && !force) return;
  await carregarBaseCadastros(force);
  await carregarProducoesFermentando(force);
  renderProducoes();
  state.loaded.producao = true;
}

function renderProducoes() {
  const box = document.getElementById("listaProducoes");
  box.innerHTML = state.producoesFermentando.length ? "" : '<div class="item"><span class="sub">Nenhuma cerveja em produção.</span></div>';

  state.producoesFermentando.forEach(p => {
    const dias = Math.max(0, Math.floor((new Date() - new Date(p.data_producao + "T00:00:00")) / 86400000));
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(p.cerveja_nome)}</strong>
          <div class="sub">Lote ${escapeHtml(p.lote)} • ${fmt(p.litros_produzidos)} L</div>
          <div class="sub">Produzida em ${dataBR(p.data_producao)} • ${dias} dia(s) em produção</div>
        </div>
        <span class="badge">${escapeHtml(p.status)}</span>
      </div>
    `);
  });
}

function prepararSelectCervejas(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Selecionar cerveja...</option>';
  state.cervejas.forEach(c => {
    const op = document.createElement("option");
    op.value = c.nome;
    op.textContent = c.nome;
    sel.appendChild(op);
  });
}

function prepararSelectLotes(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Selecionar lote...</option>';
  state.producoesFermentando.forEach(p => {
    const op = document.createElement("option");
    op.value = p.lote;
    op.textContent = `${p.lote} — ${p.cerveja_nome} (${fmt(p.litros_produzidos)}L)`;
    sel.appendChild(op);
  });
}

async function prepararFormProducao() {
  prepararSelectCervejas("prodCerveja");
  prepararSelectInsumos("prodFermento","FERMENTO","Sem fermento");
  await carregarFermentosReusoBase(true);
  prepararSelectFermentosReuso("prodFermentoReuso", "Selecionar fermento reutilizável...");
  alternarTipoFermentoProducao();
  document.getElementById("prodMaltes").innerHTML = "";
  document.getElementById("prodLupulos").innerHTML = "";
  adicionarLinhaInsumo("prodMaltes","MALTE");
  adicionarLinhaInsumo("prodLupulos","LUPULO");
}

function prepararFormDryHop() {
  prepararSelectLotes("dryLote");
  document.getElementById("dryLupulos").innerHTML = "";
  adicionarLinhaInsumo("dryLupulos","LUPULO");
}

function prepararFormEnvase() {
  prepararSelectLotes("envaseLote");
  atualizarResumoEnvase();
}

function prepararFormEntradaCerveja() {
  prepararSelectCervejas("entradaCerveja");
}

function prepararFormEntradaInsumo() {
  popularEntradaInsumos();
}

function prepararSelectInsumos(id, tipo, placeholder) {
  const sel = document.getElementById(id);
  sel.innerHTML = `<option value="">${placeholder}</option>`;
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    sel.appendChild(op);
  });
}

function adicionarLinhaInsumo(containerId, tipo) {
  const container = document.getElementById(containerId);
  const linha = document.createElement("div");
  linha.className = "linhaInsumo";
  linha.dataset.tipo = tipo;

  const sel = document.createElement("select");
  sel.className = "insumoNome";
  sel.innerHTML = '<option value="">Selecionar...</option>';
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    sel.appendChild(op);
  });

  const qtd = document.createElement("input");
  qtd.className = "insumoQtd";
  qtd.type = "number";
  qtd.min = "0";
  qtd.step = "0.001";
  qtd.placeholder = tipo === "MALTE" ? "KG" : tipo === "LUPULO" ? "G" : "UN";

  const btn = document.createElement("button");
  btn.className = "btnRemove";
  btn.type = "button";
  btn.innerText = "×";
  btn.onclick = () => linha.remove();

  linha.appendChild(sel);
  linha.appendChild(qtd);
  linha.appendChild(btn);
  container.appendChild(linha);
}

function coletarLinhasInsumos(containerId, tipo) {
  const itens = [];
  document.querySelectorAll(`#${containerId} .linhaInsumo`).forEach(linha => {
    const nome = linha.querySelector(".insumoNome").value;
    const quantidade = Number(linha.querySelector(".insumoQtd").value || 0);
    if (nome && quantidade > 0) {
      const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
      itens.push({ tipo, nome, quantidade, unidade: insumo ? insumo.unidade : unidadePadrao(tipo), insumo_id: insumo ? insumo.id : null });
    }
  });
  return itens;
}

function unidadePadrao(tipo) {
  if (tipo === "MALTE") return "KG";
  if (tipo === "LUPULO") return "G";
  return "UN";
}


async function validarEstoqueInsumosSuficiente(itens) {
  const agregados = new Map();

  itens.forEach(item => {
    if (!item.nome || Number(item.quantidade || 0) <= 0) return;
    const chave = item.tipo + "|" + item.nome;
    const atual = agregados.get(chave) || {
      tipo: item.tipo,
      nome: item.nome,
      unidade: item.unidade,
      quantidade: 0
    };
    atual.quantidade += Number(item.quantidade || 0);
    agregados.set(chave, atual);
  });

  const faltas = [];

  for (const item of agregados.values()) {
    const { data, error } = await sb.from("estoque_insumos")
      .select("quantidade,unidade")
      .eq("tipo", item.tipo)
      .eq("nome", item.nome)
      .limit(1);

    if (error) throw error;

    const disponivel = data && data[0] ? Number(data[0].quantidade || 0) : 0;
    const unidade = data && data[0] ? data[0].unidade : item.unidade;

    if (disponivel < item.quantidade) {
      faltas.push({
        nome: item.nome,
        tipo: item.tipo,
        unidade: unidade,
        disponivel: disponivel,
        necessario: item.quantidade,
        falta: item.quantidade - disponivel
      });
    }
  }

  if (faltas.length) {
    const detalhes = faltas.map(f =>
      `${f.nome}: necessário ${fmt(f.necessario, 3)} ${f.unidade}, disponível ${fmt(f.disponivel, 3)} ${f.unidade}, falta ${fmt(f.falta, 3)} ${f.unidade}`
    ).join("\n");

    throw new Error("Estoque insuficiente de insumos:\n" + detalhes);
  }

  return true;
}


async function baixarInsumo(tipo, nome, quantidade, unidade, observacao, lote="", etapa="PRODUCAO") {
  if (!nome || quantidade <= 0) return;

  const { data: atualRows, error: erroBusca } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  if (erroBusca) throw erroBusca;

  const atual = atualRows && atualRows[0] ? atualRows[0] : null;
  const qtdAtual = Number(atual ? atual.quantidade : 0);

  if (qtdAtual < Number(quantidade)) {
    throw new Error(`${nome}: estoque insuficiente. Disponível ${fmt(qtdAtual, 3)} ${unidade}, necessário ${fmt(Number(quantidade), 3)} ${unidade}.`);
  }

  const novaQtd = qtdAtual - Number(quantidade);

  const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
  const payload = {
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade: novaQtd,
    atualizado_em: new Date().toISOString()
  };

  const { error } = await sb.from("estoque_insumos").upsert(payload, { onConflict:"tipo,nome" });
  if (error) throw error;

  await sb.from("movimentacoes").insert({
    tipo: etapa === "DRY_HOPPING" ? "BAIXA DRY HOPPING" : "BAIXA PRODUCAO",
    categoria: "INSUMO",
    item_nome: nome,
    quantidade: -Math.abs(Number(quantidade)),
    unidade,
    lote,
    observacao
  });
}

async function salvarProducao() {
  mostrarErro("prodErro", "");
  const lote = document.getElementById("prodLote").value.trim();
  const cerveja_nome = document.getElementById("prodCerveja").value;
  const litros_produzidos = Number(document.getElementById("prodLitros").value || 0);
  const observacao = document.getElementById("prodObs").value.trim();

  if (!lote || !cerveja_nome || litros_produzidos <= 0) {
    mostrarErro("prodErro", "Informe lote, cerveja e litros produzidos.");
    return;
  }

  const maltes = coletarLinhasInsumos("prodMaltes","MALTE");
  const lupulos = coletarLinhasInsumos("prodLupulos","LUPULO");
  const tipoFermentoProducao = document.getElementById("prodFermentoTipo").value;
  const fermentoNome = document.getElementById("prodFermento").value;
  const fermentoQtd = Number(document.getElementById("prodFermentoQtd").value || 0);
  const fermento = fermentoNome && fermentoQtd > 0 ? state.insumos.find(i => i.tipo === "FERMENTO" && i.nome === fermentoNome) : null;

  const fermentoReusoId = document.getElementById("prodFermentoReuso").value;
  const fermentoReusoQtd = Number(document.getElementById("prodFermentoReusoQtd").value || 0);
  const fermentoReuso = state.fermentosReuso.find(f => f.id === fermentoReusoId);

  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const insumosParaValidar = [...maltes, ...lupulos];

  if (tipoFermentoProducao === "ESTOQUE" && fermentoNome && fermentoQtd > 0) {
    insumosParaValidar.push({
      tipo:"FERMENTO",
      nome:fermentoNome,
      quantidade:fermentoQtd,
      unidade:fermento ? fermento.unidade : "UN",
      insumo_id: fermento ? fermento.id : null
    });
  }

  try {
    await validarEstoqueInsumosSuficiente(insumosParaValidar);

    if (tipoFermentoProducao === "REUSO") {
      if (!fermentoReusoId || fermentoReusoQtd <= 0) {
        throw new Error("Selecione o fermento reutilizável e informe a quantidade usada.");
      }
      await validarFermentoReusoSuficiente(fermentoReusoId, fermentoReusoQtd);
    }
  } catch(e) {
    mostrarErro("prodErro", e.message);
    return;
  }

  const fermentoTipoSalvar = tipoFermentoProducao === "REUSO" ? "REUSO" : (fermentoNome ? "ESTOQUE" : null);
  const fermentoNomeSalvar = tipoFermentoProducao === "REUSO" ? (fermentoReuso ? fermentoReuso.codigo : "FERMENTO REUSO") : (fermentoNome || null);

  const { data: prod, error } = await sb.from("producoes").insert({
    lote,
    cerveja_nome,
    cerveja_id: cerveja ? cerveja.id : null,
    litros_produzidos,
    observacao,
    status: "FERMENTANDO",
    fermento_tipo: fermentoTipoSalvar,
    fermento_nome: fermentoNomeSalvar,
    fermento_reuso_id: tipoFermentoProducao === "REUSO" ? fermentoReusoId : null
  }).select().single();

  if (error) {
    mostrarErro("prodErro", error.message);
    return;
  }

  try {
    const insumos = insumosParaValidar;

    for (const item of insumos) {
      await sb.from("producao_insumos").insert({
        producao_id: prod.id,
        lote,
        tipo: item.tipo,
        insumo_nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        etapa: "PRODUCAO"
      });
      await baixarInsumo(item.tipo, item.nome, item.quantidade, item.unidade, `Produção ${cerveja_nome}`, lote, "PRODUCAO");
    }

    if (tipoFermentoProducao === "REUSO") {
      await usarFermentoReusoNaProducao(fermentoReusoId, fermentoReusoQtd, lote, cerveja_nome, prod.id);
    }

    await sb.from("movimentacoes").insert({
      tipo:"PRODUCAO",
      categoria:"CERVEJA",
      item_nome: cerveja_nome,
      quantidade: litros_produzidos,
      unidade:"L",
      lote,
      observacao
    });

  } catch(e) {
    mostrarErro("prodErro", "Produção criada, mas houve erro ao baixar insumos: " + e.message);
    return;
  }

  ["prodLote","prodLitros","prodObs","prodFermentoQtd","prodFermentoReusoQtd"].forEach(id => document.getElementById(id).value = "");
  invalidar("producao","producoesFermentando","estoque","inicio");
  alert("Produção salva e insumos baixados.");
  carregarProducao(true);
  carregarInicio(true);
}

async function salvarDryHop() {
  mostrarErro("dryErro", "");
  const lote = document.getElementById("dryLote").value;
  const obs = document.getElementById("dryObs").value.trim();
  const itens = coletarLinhasInsumos("dryLupulos","LUPULO");

  if (!lote || !itens.length) {
    mostrarErro("dryErro", "Selecione o lote e pelo menos um lúpulo.");
    return;
  }

  const prod = state.producoesFermentando.find(p => p.lote === lote);
  if (!prod) {
    mostrarErro("dryErro", "Lote não encontrado.");
    return;
  }

  try {
    await validarEstoqueInsumosSuficiente(itens);
  } catch(e) {
    mostrarErro("dryErro", e.message);
    return;
  }

  try {
    for (const item of itens) {
      await sb.from("dry_hopping").insert({
        producao_id: prod.id,
        lote,
        lupulo_nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        observacao: obs
      });

      await sb.from("producao_insumos").insert({
        producao_id: prod.id,
        lote,
        tipo: "LUPULO",
        insumo_nome: item.nome,
        quantidade: item.quantidade,
        unidade: item.unidade,
        etapa: "DRY_HOPPING"
      });

      await baixarInsumo("LUPULO", item.nome, item.quantidade, item.unidade, obs || "Dry hopping", lote, "DRY_HOPPING");
    }
  } catch(e) {
    mostrarErro("dryErro", e.message);
    return;
  }

  document.getElementById("dryObs").value = "";
  invalidar("estoque","inicio");
  alert("Dry hopping registrado.");
  carregarEstoque(true);
}

function atualizarResumoEnvase() {
  const lote = document.getElementById("envaseLote")?.value;
  const prod = state.producoesFermentando.find(p => p.lote === lote);
  const litrosFull = litrosBarris(
    document.getElementById("envaseQ10")?.value,
    document.getElementById("envaseQ20")?.value,
    document.getElementById("envaseQ30")?.value,
    document.getElementById("envaseQ50")?.value
  );
  const incompleto = Number(document.getElementById("envaseIncompleto")?.value || 0);
  const total = litrosFull + incompleto;
  const produzido = prod ? Number(prod.litros_produzidos || 0) : 0;
  const perda = produzido ? Math.max(0, produzido - total) : 0;
  const excesso = produzido ? Math.max(0, total - produzido) : 0;
  const el = document.getElementById("envaseResumo");

  if (el) {
    if (excesso > 0) {
      el.classList.add("alertaErro");
      el.innerText = `ATENÇÃO: envase maior que a produção. Produzido: ${fmt(produzido,2)} L | Tentando envasar: ${fmt(total,2)} L | Excesso: ${fmt(excesso,2)} L`;
    } else {
      el.classList.remove("alertaErro");
      el.innerText = `Total envasado: ${fmt(total,2)} L | Barris completos: ${fmt(litrosFull,2)} L | Perda estimada: ${fmt(perda,2)} L`;
    }
  }
}

async function salvarEnvase() {
  mostrarErro("envaseErro", "");
  const lote = document.getElementById("envaseLote").value;
  const origem = document.getElementById("envaseOrigem").value;
  const q10 = Number(document.getElementById("envaseQ10").value || 0);
  const q20 = Number(document.getElementById("envaseQ20").value || 0);
  const q30 = Number(document.getElementById("envaseQ30").value || 0);
  const q50 = Number(document.getElementById("envaseQ50").value || 0);
  const incompleto = Number(document.getElementById("envaseIncompleto").value || 0);
  const obs = document.getElementById("envaseObs").value.trim();

  if (!lote || (somaBarris(q10,q20,q30,q50) <= 0 && incompleto <= 0)) {
    mostrarErro("envaseErro", "Selecione o lote e informe o envase.");
    return;
  }

  const prod = state.producoesFermentando.find(p => p.lote === lote);
  if (!prod) {
    mostrarErro("envaseErro", "Lote não encontrado.");
    return;
  }

  const litrosFull = litrosBarris(q10,q20,q30,q50);
  const total = litrosFull + incompleto;
  const produzido = Number(prod.litros_produzidos || 0);

  const { data: envasesAnteriores, error: envasesAnterioresErro } = await sb.from("envases")
    .select("litros_total")
    .eq("lote", lote);

  if (envasesAnterioresErro) {
    mostrarErro("envaseErro", envasesAnterioresErro.message);
    return;
  }

  const jaEnvasado = (envasesAnteriores || []).reduce((s,e) => s + Number(e.litros_total || 0), 0);
  const disponivelParaEnvase = Math.max(0, produzido - jaEnvasado);

  if (total > disponivelParaEnvase) {
    const excesso = total - disponivelParaEnvase;
    mostrarErro(
      "envaseErro",
      `Envase bloqueado: o lote tem ${fmt(produzido,2)} L produzidos, ${fmt(jaEnvasado,2)} L já envasados e só restam ${fmt(disponivelParaEnvase,2)} L disponíveis. Você tentou envasar ${fmt(total,2)} L. Excesso: ${fmt(excesso,2)} L.`
    );
    atualizarResumoEnvase();
    return;
  }

  const perda = Math.max(0, disponivelParaEnvase - total);

  const { error: envErr } = await sb.from("envases").insert({
    producao_id: prod.id,
    lote,
    cerveja_nome: prod.cerveja_nome,
    origem,
    q10, q20, q30, q50,
    litros_barris: litrosFull,
    litros_incompleto_bar: incompleto,
    litros_total: total,
    perda,
    observacao: obs
  });

  if (envErr) {
    mostrarErro("envaseErro", envErr.message);
    return;
  }

  if (litrosFull > 0) {
    const erroEstoque = await somarEstoqueCerveja(prod.cerveja_nome, origem, q10,q20,q30,q50, obs || "Envase");
    if (erroEstoque) {
      mostrarErro("envaseErro", erroEstoque.message);
      return;
    }

    if (origem === "PHENOMENA") {
      await sb.from("phenomena_entradas").insert({
        cerveja_nome: prod.cerveja_nome,
        q10,q20,q30,q50,
        litros: litrosFull,
        observacao: "Envase Phenomena: " + obs
      });
    }
  }

  await sb.from("producoes").update({ status:"ENVASADO" }).eq("id", prod.id);

  await sb.from("movimentacoes").insert({
    tipo:"ENVASE",
    categoria:"CERVEJA",
    item_nome: prod.cerveja_nome,
    quantidade: total,
    unidade:"L",
    origem,
    lote,
    observacao: obs
  });

  ["envaseQ10","envaseQ20","envaseQ30","envaseQ50","envaseIncompleto","envaseObs"].forEach(id => document.getElementById(id).value = id === "envaseIncompleto" ? "0" : "0");
  invalidar("producao","producoesFermentando","estoque","inicio");
  alert("Envase registrado.");
  carregarProducao(true);
  carregarInicio(true);
}

async function carregarEstoque(force=false) {
  if (state.loaded.estoque && !force) return;
  await carregarBaseCadastros(force);

  const [ec, ei] = await Promise.all([
    sb.from("estoque_cerveja").select("*").order("cerveja_nome"),
    sb.from("estoque_insumos").select("*").order("tipo").order("nome")
  ]);

  renderResumoEstoqueOrigem(ec.data || []);
  renderEstoqueCervejas(ec.data || []);
  renderEstoqueInsumos(ei.data || []);
  state.loaded.estoque = true;
}


function renderResumoEstoqueOrigem(rows) {
  const box = document.getElementById("resumoEstoqueOrigem");
  if (!box) return;

  const origens = ["PRODUCAO","ITAPEMA","PHENOMENA"];
  const dados = origens.map(origem => {
    const itens = rows.filter(r => r.origem === origem);
    return {
      origem,
      litros: itens.reduce((s,r) => s + Number(r.litros || 0), 0),
      barris: itens.reduce((s,r) => s + somaBarris(r.q10,r.q20,r.q30,r.q50), 0)
    };
  });

  box.innerHTML = "";
  dados.forEach(d => {
    box.insertAdjacentHTML("beforeend", `
      <div class="card">
        <span>${escapeHtml(d.origem)}</span>
        <strong>${fmt(d.litros)} L</strong>
        <div class="sub">${d.barris} barril(is)</div>
      </div>
    `);
  });
}

function renderEstoqueCervejas(rows) {
  const map = new Map();

  state.cervejas.forEach(c => map.set(c.nome, { cerveja_nome:c.nome, litros:0, origens:[] }));
  rows.forEach(r => {
    const atual = map.get(r.cerveja_nome) || { cerveja_nome:r.cerveja_nome, litros:0, origens:[] };
    atual.litros += Number(r.litros || 0);
    atual.origens.push(`${r.origem}: ${fmt(r.litros)}L`);
    map.set(r.cerveja_nome, atual);
  });

  const lista = ordenarComZeradosFinal([...map.values()], r => r.cerveja_nome, r => r.litros);
  const box = document.getElementById("estoqueCervejas");
  box.innerHTML = lista.length ? "" : '<div class="item"><span class="sub">Nenhuma cerveja cadastrada.</span></div>';

  lista.forEach(r => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(r.cerveja_nome)}</strong>
          <div class="sub">${r.origens.length ? escapeHtml(r.origens.join(" • ")) : "Sem estoque"}</div>
        </div>
        <span class="badge ${r.litros <= 0 ? "zero" : ""}">${fmt(r.litros)} L</span>
      </div>
    `);
  });
}

function renderEstoqueInsumos(rows) {
  const byKey = new Map();
  state.insumos.forEach(i => byKey.set(i.tipo + "|" + i.nome, { tipo:i.tipo, nome:i.nome, unidade:i.unidade, quantidade:0 }));
  rows.forEach(r => byKey.set(r.tipo + "|" + r.nome, r));

  const grupos = [
    ["MALTE", "🌾 Maltes"],
    ["LUPULO", "🌿 Lúpulos"],
    ["FERMENTO", "🧫 Fermentos"]
  ];

  const box = document.getElementById("estoqueInsumos");
  box.innerHTML = "";

  grupos.forEach(([tipo, titulo]) => {
    const lista = ordenarComZeradosFinal([...byKey.values()].filter(r => r.tipo === tipo), r => r.nome, r => r.quantidade);
    box.insertAdjacentHTML("beforeend", `<h3>${titulo}</h3>`);
    if (!lista.length) {
      box.insertAdjacentHTML("beforeend", '<div class="item"><span class="sub">Nenhum item cadastrado.</span></div>');
    }
    lista.forEach(r => {
      box.insertAdjacentHTML("beforeend", `
        <div class="item searchable">
          <div>
            <strong>${escapeHtml(r.nome)}</strong>
            <div class="sub">${escapeHtml(r.tipo)} • ${escapeHtml(r.unidade)}</div>
          </div>
          <span class="badge ${Number(r.quantidade || 0) <= 0 ? "zero" : ""}">${fmt(r.quantidade, 2)} ${escapeHtml(r.unidade)}</span>
        </div>
      `);
    });
  });
}

async function somarEstoqueCerveja(cerveja_nome, origem, q10,q20,q30,q50, observacao="") {
  const { data: rows, error } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .eq("origem", origem)
    .limit(1);

  if (error) return error;

  const atual = rows && rows[0] ? rows[0] : null;
  const nq10 = Number(atual?.q10 || 0) + Number(q10 || 0);
  const nq20 = Number(atual?.q20 || 0) + Number(q20 || 0);
  const nq30 = Number(atual?.q30 || 0) + Number(q30 || 0);
  const nq50 = Number(atual?.q50 || 0) + Number(q50 || 0);
  const litros = litrosBarris(nq10,nq20,nq30,nq50);
  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const payload = {
    cerveja_id: cerveja ? cerveja.id : null,
    cerveja_nome,
    origem,
    q10:nq10,
    q20:nq20,
    q30:nq30,
    q50:nq50,
    litros,
    atualizado_em: new Date().toISOString()
  };

  const up = await sb.from("estoque_cerveja").upsert(payload, { onConflict:"cerveja_nome,origem" });
  if (up.error) return up.error;

  await sb.from("movimentacoes").insert({
    tipo:"ENTRADA ESTOQUE",
    categoria:"CERVEJA",
    item_nome: cerveja_nome,
    quantidade: litrosBarris(q10,q20,q30,q50),
    unidade:"L",
    origem,
    observacao
  });

  return null;
}

async function salvarEntradaCerveja() {
  mostrarErro("entradaCervejaErro", "");
  const cerveja = document.getElementById("entradaCerveja").value;
  const origem = document.getElementById("entradaOrigem").value;
  const q10 = Number(document.getElementById("entradaQ10").value || 0);
  const q20 = Number(document.getElementById("entradaQ20").value || 0);
  const q30 = Number(document.getElementById("entradaQ30").value || 0);
  const q50 = Number(document.getElementById("entradaQ50").value || 0);
  const obs = document.getElementById("entradaObs").value.trim();

  if (!cerveja || somaBarris(q10,q20,q30,q50) <= 0) {
    mostrarErro("entradaCervejaErro", "Selecione a cerveja e informe os barris.");
    return;
  }

  const erro = await somarEstoqueCerveja(cerveja, origem, q10,q20,q30,q50, obs);
  if (erro) {
    mostrarErro("entradaCervejaErro", erro.message);
    return;
  }

  if (origem === "PHENOMENA") {
    await sb.from("phenomena_entradas").insert({
      cerveja_nome: cerveja,
      q10,q20,q30,q50,
      litros: litrosBarris(q10,q20,q30,q50),
      observacao: obs
    });
  }

  ["entradaQ10","entradaQ20","entradaQ30","entradaQ50","entradaObs"].forEach(id => document.getElementById(id).value = id === "entradaObs" ? "" : "0");
  invalidar("estoque","inicio");
  alert("Entrada de cerveja registrada.");
  carregarEstoque(true);
  carregarInicio(true);
}

function popularEntradaInsumos() {
  const tipo = document.getElementById("entradaInsumoTipo").value;
  const sel = document.getElementById("entradaInsumoNome");
  sel.innerHTML = '<option value="">Selecionar insumo...</option>';
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    op.dataset.fornecedor = i.fornecedor_padrao || "";
    sel.appendChild(op);
  });
  sel.onchange = () => {
    const op = sel.options[sel.selectedIndex];
    if (op) document.getElementById("entradaInsumoFornecedor").value = op.dataset.fornecedor || "";
  };
}

async function salvarEntradaInsumo() {
  mostrarErro("entradaInsumoErro", "");
  const tipo = document.getElementById("entradaInsumoTipo").value;
  const nome = document.getElementById("entradaInsumoNome").value;
  const quantidade = Number(document.getElementById("entradaInsumoQtd").value || 0);
  const fornecedor = document.getElementById("entradaInsumoFornecedor").value.trim();
  const valor_total = Number(document.getElementById("entradaInsumoValor").value || 0);
  const validade = document.getElementById("entradaInsumoValidade").value || null;
  const lote_fornecedor = document.getElementById("entradaInsumoLote").value.trim();
  const observacao = document.getElementById("entradaInsumoObs").value.trim();

  if (!nome || quantidade <= 0) {
    mostrarErro("entradaInsumoErro", "Selecione o insumo e informe a quantidade.");
    return;
  }

  const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
  const unidade = insumo ? insumo.unidade : unidadePadrao(tipo);

  const { data: rows } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  const atual = rows && rows[0] ? rows[0] : null;
  const novaQtd = Number(atual?.quantidade || 0) + quantidade;

  const up = await sb.from("estoque_insumos").upsert({
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade: novaQtd,
    atualizado_em: new Date().toISOString()
  }, { onConflict:"tipo,nome" });

  if (up.error) {
    mostrarErro("entradaInsumoErro", up.error.message);
    return;
  }

  await sb.from("entradas_insumos").insert({
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade,
    fornecedor,
    valor_total,
    validade,
    lote_fornecedor,
    observacao
  });

  await sb.from("movimentacoes").insert({
    tipo:"ENTRADA INSUMO",
    categoria:"INSUMO",
    item_nome:nome,
    quantidade,
    unidade,
    origem:"COMPRA",
    observacao
  });

  ["entradaInsumoQtd","entradaInsumoValor","entradaInsumoValidade","entradaInsumoLote","entradaInsumoObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("estoque","inicio");
  alert("Compra de insumo registrada.");
  carregarEstoque(true);
  carregarInicio(true);
}

function mostrarSubEstoque(tipo) {
  document.getElementById("subEstoqueCervejas").style.display = tipo === "cervejas" ? "block" : "none";
  document.getElementById("subEstoqueInsumos").style.display = tipo === "insumos" ? "block" : "none";
  document.querySelectorAll("#telaEstoque .tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll("#telaEstoque .tab")[tipo === "cervejas" ? 0 : 1].classList.add("active");
}

async function carregarSaidas(force=false) {
  if (state.loaded.saidas && !force) return;

  const { data, error } = await sb.from("saidas")
    .select("*")
    .order("criado_em", { ascending:false })
    .limit(10);

  const box = document.getElementById("listaSaidas");
  if (error) {
    box.innerHTML = '<div class="item">Erro ao carregar saídas.</div>';
    return;
  }

  box.innerHTML = (data || []).length ? "" : '<div class="item"><span class="sub">Nenhuma saída registrada.</span></div>';
  (data || []).forEach(s => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(s.cliente_nome)}</strong>
          <div class="sub">${escapeHtml(s.cerveja_nome)} • ${fmt(s.litros)} L</div>
          <div class="sub">${dataBR(s.data_saida)} • ${escapeHtml(s.codigos_barris || "")}</div>
        </div>
        <span class="badge">${fmt((s.q10||0)+(s.q20||0)+(s.q30||0)+(s.q50||0))} barris</span>
      </div>
    `);
  });
  state.loaded.saidas = true;
}

async function carregarClientes(force=false) {
  if (state.loaded.clientes && !force) return;
  await carregarBaseCadastros(force);

  const box = document.getElementById("listaClientes");
  box.innerHTML = state.clientes.length ? "" : '<div class="item"><span class="sub">Nenhum cliente cadastrado.</span></div>';

  state.clientes.forEach(c => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item searchable">
        <div>
          <strong>${escapeHtml(c.nome)}</strong>
          <div class="sub">${escapeHtml(c.estabelecimento || "-")} • ${escapeHtml(c.cidade || "-")}</div>
          <div class="sub">${escapeHtml(c.contato || "")}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="editarCliente('${c.id}')">Editar</button>
            <button class="btnTiny btnNeutral" onclick="abrirExtratoCliente('${c.id}')">Extrato</button>
            <button class="btnTiny btnDangerTiny" onclick="inativarCliente('${c.id}')">Inativar</button>
          </div>
        </div>
      </div>
    `);
  });
  state.loaded.clientes = true;
}

function novoCliente() {
  ["cliId","cliNome","cliEstabelecimento","cliCidade","cliContato","cliObs"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  toggleForm("formCliente");
}

function editarCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;

  document.getElementById("cliId").value = c.id;
  document.getElementById("cliNome").value = c.nome || "";
  document.getElementById("cliEstabelecimento").value = c.estabelecimento || "";
  document.getElementById("cliCidade").value = c.cidade || "";
  document.getElementById("cliContato").value = c.contato || "";
  document.getElementById("cliObs").value = c.observacao || "";

  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formCliente").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function inativarCliente(id) {
  const c = state.clientes.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Inativar cliente ${c.nome}? Ele não aparecerá mais nas listas.`)) return;

  const { error } = await sb.from("clientes").update({ ativo:false }).eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  invalidar("baseCadastros","clientes","inicio","saidas","retornos");
  alert("Cliente inativado.");
  carregarClientes(true);
}

function prepararFormExtratoCliente() {
  prepararSelectClientes("extratoCliente");
}

function abrirExtratoCliente(id) {
  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formExtratoCliente").style.display = "block";
  prepararFormExtratoCliente();
  document.getElementById("extratoCliente").value = id;
  carregarExtratoCliente();
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function carregarExtratoCliente() {
  const clienteId = document.getElementById("extratoCliente").value;
  const op = document.getElementById("extratoCliente").options[document.getElementById("extratoCliente").selectedIndex];
  const clienteNome = op ? (op.dataset.nome || op.textContent) : "";

  const box = document.getElementById("extratoClienteConteudo");
  if (!clienteId || !clienteNome) {
    box.innerHTML = '<div class="item"><span class="sub">Selecione um cliente.</span></div>';
    return;
  }

  const [saidas, retornos] = await Promise.all([
    sb.from("saidas").select("*").eq("cliente_id", clienteId).order("data_saida", { ascending:false }),
    sb.from("retornos").select("*").eq("cliente_id", clienteId).order("data_retorno", { ascending:false })
  ]);

  const saidaRows = saidas.data || [];
  const retornoRows = retornos.data || [];

  const litrosSaidos = saidaRows.reduce((s,r)=>s+Number(r.litros||0),0);
  const barrisSaidos = saidaRows.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0);
  const barrisRetornados = retornoRows.reduce((s,r)=>s+somaBarris(r.q10,r.q20,r.q30,r.q50),0);
  const barrisAbertos = Math.max(0, barrisSaidos - barrisRetornados);

  const eventos = [
    ...saidaRows.map(s => ({
      tipo:"SAÍDA",
      data:s.data_saida,
      titulo:s.cerveja_nome,
      detalhe:`${fmt(s.litros)} L • 10L=${s.q10||0} • 20L=${s.q20||0} • 30L=${s.q30||0} • 50L=${s.q50||0}`,
      extra:s.codigos_barris || "",
      peso: new Date((s.data_saida || "") + "T00:00:00").getTime()
    })),
    ...retornoRows.map(r => ({
      tipo:"RETORNO",
      data:r.data_retorno,
      titulo:r.cerveja_nome || "Barris",
      detalhe:`${somaBarris(r.q10,r.q20,r.q30,r.q50)} barril(is) • 10L=${r.q10||0} • 20L=${r.q20||0} • 30L=${r.q30||0} • 50L=${r.q50||0}`,
      extra:r.codigos_barris || "",
      peso: new Date((r.data_retorno || "") + "T00:00:00").getTime()
    }))
  ].sort((a,b)=>b.peso-a.peso);

  box.innerHTML = `
    <div class="gridCards">
      <div class="card"><span>Litros enviados</span><strong>${fmt(litrosSaidos)} L</strong></div>
      <div class="card"><span>Barris enviados</span><strong>${barrisSaidos}</strong></div>
      <div class="card"><span>Barris retornados</span><strong>${barrisRetornados}</strong></div>
      <div class="card"><span>Barris em aberto</span><strong>${barrisAbertos}</strong></div>
    </div>
  `;

  if (!eventos.length) {
    box.insertAdjacentHTML("beforeend", '<div class="item"><span class="sub">Nenhum movimento para este cliente.</span></div>');
    return;
  }

  eventos.forEach(e => {
    box.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(e.tipo)} — ${escapeHtml(e.titulo)}</strong>
          <div class="sub">${dataBR(e.data)} • ${escapeHtml(e.detalhe)}</div>
          <div class="sub">${escapeHtml(e.extra)}</div>
        </div>
        <span class="badge">${escapeHtml(e.tipo)}</span>
      </div>
    `);
  });
}

async function salvarCliente() {
  mostrarErro("cliErro", "");
  const clienteId = document.getElementById("cliId").value;
  const nome = document.getElementById("cliNome").value.trim();
  if (!nome) {
    mostrarErro("cliErro", "Informe o nome do cliente.");
    return;
  }

  const payload = {
    nome,
    estabelecimento: document.getElementById("cliEstabelecimento").value.trim(),
    cidade: document.getElementById("cliCidade").value.trim(),
    contato: document.getElementById("cliContato").value.trim(),
    observacao: document.getElementById("cliObs").value.trim()
  };

  const result = clienteId
    ? await sb.from("clientes").update(payload).eq("id", clienteId)
    : await sb.from("clientes").insert(payload);

  if (result.error) {
    mostrarErro("cliErro", result.error.message);
    return;
  }

  ["cliId","cliNome","cliEstabelecimento","cliCidade","cliContato","cliObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","clientes","inicio","saidas","retornos");
  alert(clienteId ? "Cliente atualizado." : "Cliente salvo.");
  carregarClientes(true);
}

async function carregarCadastros(force=false) {
  if (state.loaded.cadastros && !force) return;
  await carregarBaseCadastros(force);

  const cervejasBox = document.getElementById("listaCervejas");
  cervejasBox.innerHTML = state.cervejas.length ? "" : '<div class="item"><span class="sub">Nenhuma cerveja cadastrada.</span></div>';
  state.cervejas.forEach(c => {
    cervejasBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(c.nome)}</strong>
          <div class="sub">${escapeHtml(c.estilo || "-")} • ${escapeHtml(c.marca || "-")}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="editarCerveja('${c.id}')">Editar</button>
            <button class="btnTiny btnDangerTiny" onclick="inativarCerveja('${c.id}')">Inativar</button>
          </div>
        </div>
      </div>
    `);
  });

  const insumosBox = document.getElementById("listaInsumos");
  insumosBox.innerHTML = state.insumos.length ? "" : '<div class="item"><span class="sub">Nenhum insumo cadastrado.</span></div>';
  state.insumos.forEach(i => {
    insumosBox.insertAdjacentHTML("beforeend", `
      <div class="item">
        <div>
          <strong>${escapeHtml(i.nome)}</strong>
          <div class="sub">${escapeHtml(i.tipo)} • ${escapeHtml(i.unidade)} • mínimo ${fmt(i.estoque_minimo,2)}</div>
          <div class="rowActions">
            <button class="btnTiny btnEdit" onclick="editarInsumo('${i.id}')">Editar</button>
            <button class="btnTiny btnDangerTiny" onclick="inativarInsumo('${i.id}')">Inativar</button>
          </div>
        </div>
      </div>
    `);
  });

  state.loaded.cadastros = true;
}

function novaCerveja() {
  ["cadCervejaId","cadCervejaNome","cadCervejaEstilo","cadCervejaMarca"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  toggleForm("formCerveja");
}

function novoInsumo() {
  ["cadInsumoId","cadInsumoNome","cadInsumoFornecedor","cadInsumoMinimo"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("cadInsumoTipo").value = "MALTE";
  ajustarUnidade();
  toggleForm("formInsumo");
}

function editarCerveja(id) {
  const c = state.cervejas.find(x => x.id === id);
  if (!c) return;
  document.getElementById("cadCervejaId").value = c.id;
  document.getElementById("cadCervejaNome").value = c.nome || "";
  document.getElementById("cadCervejaEstilo").value = c.estilo || "";
  document.getElementById("cadCervejaMarca").value = c.marca || "";

  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formCerveja").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function inativarCerveja(id) {
  const c = state.cervejas.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`Inativar cerveja ${c.nome}? Ela não aparecerá mais nas listas.`)) return;

  const { error } = await sb.from("cervejas").update({ ativo:false }).eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  invalidar("baseCadastros","cadastros","estoque","producao","saidas","inicio");
  alert("Cerveja inativada.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

function editarInsumo(id) {
  const i = state.insumos.find(x => x.id === id);
  if (!i) return;
  document.getElementById("cadInsumoId").value = i.id;
  document.getElementById("cadInsumoTipo").value = i.tipo || "MALTE";
  document.getElementById("cadInsumoNome").value = i.nome || "";
  document.getElementById("cadInsumoUnidade").value = i.unidade || unidadePadrao(i.tipo || "MALTE");
  document.getElementById("cadInsumoFornecedor").value = i.fornecedor_padrao || "";
  document.getElementById("cadInsumoMinimo").value = i.estoque_minimo || 0;

  document.querySelectorAll(".formBox").forEach(f => f.style.display = "none");
  document.getElementById("formInsumo").style.display = "block";
  window.scrollTo({ top:0, behavior:"smooth" });
}

async function inativarInsumo(id) {
  const i = state.insumos.find(x => x.id === id);
  if (!i) return;
  if (!confirm(`Inativar insumo ${i.nome}? Ele não aparecerá mais nas listas.`)) return;

  const { error } = await sb.from("insumos").update({ ativo:false }).eq("id", id);
  if (error) {
    alert(error.message);
    return;
  }

  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert("Insumo inativado.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

async function salvarCerveja() {
  mostrarErro("cadCervejaErro", "");
  const cervejaId = document.getElementById("cadCervejaId").value;
  const nome = document.getElementById("cadCervejaNome").value.trim().toUpperCase();
  if (!nome) {
    mostrarErro("cadCervejaErro", "Informe o nome da cerveja.");
    return;
  }

  const payload = {
    nome,
    estilo: document.getElementById("cadCervejaEstilo").value.trim(),
    marca: document.getElementById("cadCervejaMarca").value.trim()
  };

  const result = cervejaId
    ? await sb.from("cervejas").update(payload).eq("id", cervejaId)
    : await sb.from("cervejas").insert(payload);

  if (result.error) {
    mostrarErro("cadCervejaErro", result.error.message);
    return;
  }

  ["cadCervejaId","cadCervejaNome","cadCervejaEstilo","cadCervejaMarca"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","saidas","inicio");
  alert(cervejaId ? "Cerveja atualizada." : "Cerveja salva.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

function ajustarUnidade() {
  const tipo = document.getElementById("cadInsumoTipo").value;
  document.getElementById("cadInsumoUnidade").value = unidadePadrao(tipo);
}

async function salvarInsumo() {
  mostrarErro("cadInsumoErro", "");
  const insumoId = document.getElementById("cadInsumoId").value;
  const tipo = document.getElementById("cadInsumoTipo").value;
  const nome = document.getElementById("cadInsumoNome").value.trim();
  const unidade = document.getElementById("cadInsumoUnidade").value;
  if (!nome) {
    mostrarErro("cadInsumoErro", "Informe o nome do insumo.");
    return;
  }

  const payload = {
    tipo,
    nome,
    unidade,
    fornecedor_padrao: document.getElementById("cadInsumoFornecedor").value.trim(),
    estoque_minimo: Number(document.getElementById("cadInsumoMinimo").value || 0)
  };

  const result = insumoId
    ? await sb.from("insumos").update(payload).eq("id", insumoId)
    : await sb.from("insumos").insert(payload);

  if (result.error) {
    mostrarErro("cadInsumoErro", result.error.message);
    return;
  }

  ["cadInsumoId","cadInsumoNome","cadInsumoFornecedor","cadInsumoMinimo"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert(insumoId ? "Insumo atualizado." : "Insumo salvo.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

function filtrarLista(containerId, texto) {
  const q = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  document.querySelectorAll(`#${containerId} .searchable`).forEach(el => {
    const hay = el.innerText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    el.setAttribute("hidden-by-filter", q && !hay.includes(q) ? "true" : "false");
  });
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function dataHoraBR(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleString("pt-BR", { dateStyle:"short", timeStyle:"short" });
}

function dataBR(v) {
  if (!v) return "-";
  const [a,m,d] = String(v).split("-");
  return `${d}/${m}/${a}`;
}
