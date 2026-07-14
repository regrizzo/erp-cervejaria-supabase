
const SUPABASE_URL = "https://bwmkdalsupuzrsxdlrcm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3bWtkYWxzdXB1enJzeGRscmNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODY2MDYsImV4cCI6MjA5OTU2MjYwNn0.OJuCLFtIr5K9noT-w2jp0mW_SctmIMmv5mtfbSEc6ZE";
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const state = {
  loaded: {},
  cervejas: [],
  insumos: [],
  clientes: [],
  producoesFermentando: []
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
    clientes: "telaClientes",
    cadastros: "telaCadastros"
  };

  document.getElementById(mapa[nome]).classList.add("active");

  const btns = document.querySelectorAll(".bottomNav button");
  if (nome === "inicio") btns[0].classList.add("active");
  if (nome === "producao") btns[1].classList.add("active");
  if (nome === "estoque") btns[2].classList.add("active");
  if (nome === "saidas") btns[3].classList.add("active");
  if (["mais","clientes","cadastros"].includes(nome)) btns[4].classList.add("active");

  if (nome === "inicio") carregarInicio();
  if (nome === "producao") carregarProducao();
  if (nome === "estoque") carregarEstoque();
  if (nome === "saidas") carregarSaidas();
  if (nome === "clientes") carregarClientes();
  if (nome === "cadastros") carregarCadastros();
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

  const [estoque, producoes, clientes, insumos] = await Promise.all([
    sb.from("estoque_cerveja").select("litros"),
    sb.from("producoes").select("id,status").eq("status","FERMENTANDO"),
    sb.from("clientes").select("id", { count:"exact", head:true }),
    sb.from("estoque_insumos").select("tipo,quantidade")
  ]);

  const litros = (estoque.data || []).reduce((s,r) => s + Number(r.litros || 0), 0);
  const malte = (insumos.data || []).filter(i => i.tipo === "MALTE").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const lupulo = (insumos.data || []).filter(i => i.tipo === "LUPULO").reduce((s,r) => s + Number(r.quantidade || 0), 0);
  const fermento = (insumos.data || []).filter(i => i.tipo === "FERMENTO").reduce((s,r) => s + Number(r.quantidade || 0), 0);

  document.getElementById("cardEstoqueCerveja").innerText = fmt(litros) + " L";
  document.getElementById("cardFermentando").innerText = (producoes.data || []).length;
  document.getElementById("cardClientes").innerText = clientes.count || 0;
  document.getElementById("cardMalte").innerText = fmt(malte, 1) + " KG";
  document.getElementById("cardLupulo").innerText = fmt(lupulo, 1) + " G";
  document.getElementById("cardFermento").innerText = fmt(fermento, 1) + " UN";
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

function prepararFormProducao() {
  prepararSelectCervejas("prodCerveja");
  prepararSelectInsumos("prodFermento","FERMENTO","Sem fermento");
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
  const fermentoNome = document.getElementById("prodFermento").value;
  const fermentoQtd = Number(document.getElementById("prodFermentoQtd").value || 0);
  const fermento = fermentoNome && fermentoQtd > 0 ? state.insumos.find(i => i.tipo === "FERMENTO" && i.nome === fermentoNome) : null;

  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const insumosParaValidar = [...maltes, ...lupulos];
  if (fermentoNome && fermentoQtd > 0) insumosParaValidar.push({
    tipo:"FERMENTO",
    nome:fermentoNome,
    quantidade:fermentoQtd,
    unidade:fermento ? fermento.unidade : "UN",
    insumo_id: fermento ? fermento.id : null
  });

  try {
    await validarEstoqueInsumosSuficiente(insumosParaValidar);
  } catch(e) {
    mostrarErro("prodErro", e.message);
    return;
  }

  const { data: prod, error } = await sb.from("producoes").insert({
    lote,
    cerveja_nome,
    cerveja_id: cerveja ? cerveja.id : null,
    litros_produzidos,
    observacao,
    status: "FERMENTANDO",
    fermento_tipo: fermentoNome ? "ESTOQUE" : null,
    fermento_nome: fermentoNome || null
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

  ["prodLote","prodLitros","prodObs","prodFermentoQtd"].forEach(id => document.getElementById(id).value = "");
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
  const el = document.getElementById("envaseResumo");
  if (el) el.innerText = `Total envasado: ${fmt(total,2)} L | Barris completos: ${fmt(litrosFull,2)} L | Perda estimada: ${fmt(perda,2)} L`;
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
  const perda = Math.max(0, Number(prod.litros_produzidos || 0) - total);

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

  renderEstoqueCervejas(ec.data || []);
  renderEstoqueInsumos(ei.data || []);
  state.loaded.estoque = true;
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
        </div>
      </div>
    `);
  });
  state.loaded.clientes = true;
}

async function salvarCliente() {
  mostrarErro("cliErro", "");
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

  const { error } = await sb.from("clientes").insert(payload);
  if (error) {
    mostrarErro("cliErro", error.message);
    return;
  }

  ["cliNome","cliEstabelecimento","cliCidade","cliContato","cliObs"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","clientes","inicio","saidas");
  alert("Cliente salvo.");
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
        </div>
      </div>
    `);
  });

  state.loaded.cadastros = true;
}

async function salvarCerveja() {
  mostrarErro("cadCervejaErro", "");
  const nome = document.getElementById("cadCervejaNome").value.trim().toUpperCase();
  if (!nome) {
    mostrarErro("cadCervejaErro", "Informe o nome da cerveja.");
    return;
  }

  const { error } = await sb.from("cervejas").insert({
    nome,
    estilo: document.getElementById("cadCervejaEstilo").value.trim(),
    marca: document.getElementById("cadCervejaMarca").value.trim()
  });

  if (error) {
    mostrarErro("cadCervejaErro", error.message);
    return;
  }

  ["cadCervejaNome","cadCervejaEstilo","cadCervejaMarca"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert("Cerveja salva.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}

function ajustarUnidade() {
  const tipo = document.getElementById("cadInsumoTipo").value;
  document.getElementById("cadInsumoUnidade").value = unidadePadrao(tipo);
}

async function salvarInsumo() {
  mostrarErro("cadInsumoErro", "");
  const tipo = document.getElementById("cadInsumoTipo").value;
  const nome = document.getElementById("cadInsumoNome").value.trim();
  const unidade = document.getElementById("cadInsumoUnidade").value;
  if (!nome) {
    mostrarErro("cadInsumoErro", "Informe o nome do insumo.");
    return;
  }

  const { error } = await sb.from("insumos").insert({
    tipo,
    nome,
    unidade,
    fornecedor_padrao: document.getElementById("cadInsumoFornecedor").value.trim(),
    estoque_minimo: Number(document.getElementById("cadInsumoMinimo").value || 0)
  });

  if (error) {
    mostrarErro("cadInsumoErro", error.message);
    return;
  }

  ["cadInsumoNome","cadInsumoFornecedor","cadInsumoMinimo"].forEach(id => document.getElementById(id).value = "");
  invalidar("baseCadastros","cadastros","estoque","producao","inicio");
  alert("Insumo salvo.");
  await carregarBaseCadastros(true);
  carregarCadastros(true);
}


function prepararFormAjusteCerveja() {
  prepararSelectCervejas("ajusteCerveja");
}

function prepararFormAjusteInsumo() {
  popularAjusteInsumos();
}

function popularAjusteInsumos() {
  const tipo = document.getElementById("ajusteInsumoTipo").value;
  const sel = document.getElementById("ajusteInsumoNome");
  sel.innerHTML = '<option value="">Selecionar insumo...</option>';
  state.insumos.filter(i => i.tipo === tipo).forEach(i => {
    const op = document.createElement("option");
    op.value = i.nome;
    op.textContent = `${i.nome} (${i.unidade})`;
    op.dataset.unidade = i.unidade;
    sel.appendChild(op);
  });
}

async function salvarAjusteCerveja() {
  mostrarErro("ajusteCervejaErro", "");
  const cerveja_nome = document.getElementById("ajusteCerveja").value;
  const origem = document.getElementById("ajusteCervejaOrigem").value;
  const q10 = Number(document.getElementById("ajusteCervQ10").value || 0);
  const q20 = Number(document.getElementById("ajusteCervQ20").value || 0);
  const q30 = Number(document.getElementById("ajusteCervQ30").value || 0);
  const q50 = Number(document.getElementById("ajusteCervQ50").value || 0);
  const motivo = document.getElementById("ajusteCervejaMotivo").value.trim();
  const responsavel = document.getElementById("ajusteCervejaResp").value.trim();

  if (!cerveja_nome) {
    mostrarErro("ajusteCervejaErro", "Selecione a cerveja.");
    return;
  }

  const { data: rows, error: buscaErro } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .eq("origem", origem)
    .limit(1);

  if (buscaErro) {
    mostrarErro("ajusteCervejaErro", buscaErro.message);
    return;
  }

  const atual = rows && rows[0] ? rows[0] : null;
  const litrosAnterior = Number(atual?.litros || 0);
  const litrosNovo = litrosBarris(q10,q20,q30,q50);
  const cerveja = state.cervejas.find(c => c.nome === cerveja_nome);

  const { error } = await sb.from("estoque_cerveja").upsert({
    cerveja_id: cerveja ? cerveja.id : null,
    cerveja_nome,
    origem,
    q10, q20, q30, q50,
    litros: litrosNovo,
    atualizado_em: new Date().toISOString()
  }, { onConflict:"cerveja_nome,origem" });

  if (error) {
    mostrarErro("ajusteCervejaErro", error.message);
    return;
  }

  await sb.from("ajustes_estoque").insert({
    categoria:"CERVEJA",
    item_nome: cerveja_nome,
    tipo_ou_origem: origem,
    quantidade_anterior: litrosAnterior,
    quantidade_nova: litrosNovo,
    diferenca: litrosNovo - litrosAnterior,
    motivo,
    responsavel
  });

  await sb.from("movimentacoes").insert({
    tipo:"AJUSTE ESTOQUE",
    categoria:"CERVEJA",
    item_nome: cerveja_nome,
    quantidade: litrosNovo - litrosAnterior,
    unidade:"L",
    origem,
    observacao: motivo,
    responsavel
  });

  ["ajusteCervQ10","ajusteCervQ20","ajusteCervQ30","ajusteCervQ50"].forEach(id => document.getElementById(id).value = "0");
  ["ajusteCervejaMotivo","ajusteCervejaResp"].forEach(id => document.getElementById(id).value = "");
  invalidar("estoque","inicio");
  alert("Ajuste de cerveja salvo.");
  carregarEstoque(true);
  carregarInicio(true);
}

async function salvarAjusteInsumo() {
  mostrarErro("ajusteInsumoErro", "");
  const tipo = document.getElementById("ajusteInsumoTipo").value;
  const nome = document.getElementById("ajusteInsumoNome").value;
  const quantidadeNova = Number(document.getElementById("ajusteInsumoQtd").value || 0);
  const motivo = document.getElementById("ajusteInsumoMotivo").value.trim();
  const responsavel = document.getElementById("ajusteInsumoResp").value.trim();

  if (!nome) {
    mostrarErro("ajusteInsumoErro", "Selecione o insumo.");
    return;
  }

  const insumo = state.insumos.find(i => i.tipo === tipo && i.nome === nome);
  const unidade = insumo ? insumo.unidade : unidadePadrao(tipo);

  const { data: rows, error: buscaErro } = await sb.from("estoque_insumos")
    .select("*")
    .eq("tipo", tipo)
    .eq("nome", nome)
    .limit(1);

  if (buscaErro) {
    mostrarErro("ajusteInsumoErro", buscaErro.message);
    return;
  }

  const atual = rows && rows[0] ? rows[0] : null;
  const quantidadeAnterior = Number(atual?.quantidade || 0);

  const { error } = await sb.from("estoque_insumos").upsert({
    insumo_id: insumo ? insumo.id : null,
    tipo,
    nome,
    unidade,
    quantidade: quantidadeNova,
    atualizado_em: new Date().toISOString()
  }, { onConflict:"tipo,nome" });

  if (error) {
    mostrarErro("ajusteInsumoErro", error.message);
    return;
  }

  await sb.from("ajustes_estoque").insert({
    categoria:"INSUMO",
    item_nome: nome,
    tipo_ou_origem: tipo,
    quantidade_anterior: quantidadeAnterior,
    quantidade_nova: quantidadeNova,
    diferenca: quantidadeNova - quantidadeAnterior,
    motivo,
    responsavel
  });

  await sb.from("movimentacoes").insert({
    tipo:"AJUSTE ESTOQUE",
    categoria:"INSUMO",
    item_nome: nome,
    quantidade: quantidadeNova - quantidadeAnterior,
    unidade,
    observacao: motivo,
    responsavel
  });

  ["ajusteInsumoQtd","ajusteInsumoMotivo","ajusteInsumoResp"].forEach(id => document.getElementById(id).value = "");
  invalidar("estoque","inicio");
  alert("Ajuste de insumo salvo.");
  carregarEstoque(true);
  carregarInicio(true);
}

async function prepararFormSaida() {
  await carregarBaseCadastros();
  prepararSelectClientes("saidaCliente");
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();
}

function prepararSelectClientes(id) {
  const sel = document.getElementById(id);
  sel.innerHTML = '<option value="">Selecionar cliente...</option>';
  state.clientes.forEach(c => {
    const op = document.createElement("option");
    op.value = c.id;
    op.textContent = c.estabelecimento ? `${c.nome} — ${c.estabelecimento}` : c.nome;
    op.dataset.nome = c.nome;
    sel.appendChild(op);
  });
}

function adicionarItemSaida() {
  const container = document.getElementById("saidaItens");
  const idx = container.querySelectorAll(".saidaItem").length + 1;

  const div = document.createElement("div");
  div.className = "saidaItem";
  div.innerHTML = `
    <div class="saidaItemHeader">
      <strong>Item ${idx}</strong>
      <button type="button" class="smallDanger" onclick="this.closest('.saidaItem').remove()">Remover</button>
    </div>

    <label>Cerveja</label>
    <select class="saidaItemCerveja"></select>

    <div class="linha2">
      <div><label>Barris 10L</label><input class="saidaItemQ10" type="number" min="0" value="0"></div>
      <div><label>Barris 20L</label><input class="saidaItemQ20" type="number" min="0" value="0"></div>
    </div>
    <div class="linha2">
      <div><label>Barris 30L</label><input class="saidaItemQ30" type="number" min="0" value="0"></div>
      <div><label>Barris 50L</label><input class="saidaItemQ50" type="number" min="0" value="0"></div>
    </div>

    <label>Códigos dos barris</label>
    <input class="saidaItemCodigos" placeholder="Ex: BR30-01, BR50-03 ou SEM ETIQUETA">
  `;

  container.appendChild(div);

  const sel = div.querySelector(".saidaItemCerveja");
  sel.innerHTML = '<option value="">Selecionar cerveja...</option>';
  state.cervejas.forEach(c => {
    const op = document.createElement("option");
    op.value = c.nome;
    op.textContent = c.nome;
    sel.appendChild(op);
  });
}

function coletarItensSaida() {
  const itens = [];
  document.querySelectorAll("#saidaItens .saidaItem").forEach(div => {
    const cerveja_nome = div.querySelector(".saidaItemCerveja").value;
    const q10 = Number(div.querySelector(".saidaItemQ10").value || 0);
    const q20 = Number(div.querySelector(".saidaItemQ20").value || 0);
    const q30 = Number(div.querySelector(".saidaItemQ30").value || 0);
    const q50 = Number(div.querySelector(".saidaItemQ50").value || 0);
    const codigos = div.querySelector(".saidaItemCodigos").value.trim();

    if (cerveja_nome && somaBarris(q10,q20,q30,q50) > 0) {
      itens.push({ cerveja_nome, q10, q20, q30, q50, codigos_barris: codigos });
    }
  });
  return itens;
}

async function simularBaixaCerveja(cerveja_nome, q10, q20, q30, q50) {
  const { data, error } = await sb.from("estoque_cerveja")
    .select("*")
    .eq("cerveja_nome", cerveja_nome)
    .in("origem", ["PRODUCAO","ITAPEMA","PHENOMENA"]);

  if (error) throw error;

  const ordem = ["PRODUCAO","ITAPEMA","PHENOMENA"];
  const rows = ordem.map(origem => (data || []).find(r => r.origem === origem) || {
    cerveja_nome,
    origem,
    q10:0, q20:0, q30:0, q50:0,
    litros:0
  });

  const pedidos = [
    ["q10", q10, 10, "10L"],
    ["q20", q20, 20, "20L"],
    ["q30", q30, 30, "30L"],
    ["q50", q50, 50, "50L"]
  ];

  const updates = new Map();
  const baixas = [];
  const faltas = [];

  rows.forEach(r => updates.set(r.origem, { ...r }));

  for (const [campo, qtdPedida, litrosPorBarril, label] of pedidos) {
    let restante = Number(qtdPedida || 0);
    if (restante <= 0) continue;

    for (const origem of ordem) {
      if (restante <= 0) break;
      const u = updates.get(origem);
      const disponivel = Number(u[campo] || 0);
      const usar = Math.min(disponivel, restante);
      if (usar > 0) {
        u[campo] = disponivel - usar;
        restante -= usar;

        baixas.push({
          origem,
          campo,
          label,
          quantidade: usar,
          litros: usar * litrosPorBarril
        });
      }
    }

    if (restante > 0) {
      const disponivelTotal = rows.reduce((s,r) => s + Number(r[campo] || 0), 0);
      faltas.push(`${cerveja_nome} ${label}: solicitado ${qtdPedida}, disponível ${disponivelTotal}, falta ${restante}`);
    }
  }

  if (faltas.length) {
    throw new Error("Estoque insuficiente:\n" + faltas.join("\n"));
  }

  const updatesArr = [...updates.values()].map(u => ({
    ...u,
    litros: litrosBarris(u.q10,u.q20,u.q30,u.q50),
    atualizado_em: new Date().toISOString()
  }));

  const resumoPorOrigem = {};
  baixas.forEach(b => resumoPorOrigem[b.origem] = (resumoPorOrigem[b.origem] || 0) + b.litros);

  return { updates: updatesArr, baixas, resumoPorOrigem };
}

async function salvarSaidaMultipla() {
  mostrarErro("saidaErro", "");
  await carregarBaseCadastros();

  const clienteId = document.getElementById("saidaCliente").value;
  const clienteOp = document.getElementById("saidaCliente").options[document.getElementById("saidaCliente").selectedIndex];
  const cliente_nome = clienteOp ? (clienteOp.dataset.nome || clienteOp.textContent) : "";
  const responsavel = document.getElementById("saidaResponsavel").value.trim();
  const observacao = document.getElementById("saidaObs").value.trim();
  const itens = coletarItensSaida();

  if (!clienteId || !cliente_nome) {
    mostrarErro("saidaErro", "Selecione o cliente.");
    return;
  }

  if (!itens.length) {
    mostrarErro("saidaErro", "Adicione pelo menos uma cerveja com quantidade.");
    return;
  }

  const simulacoes = [];
  try {
    for (const item of itens) {
      const sim = await simularBaixaCerveja(item.cerveja_nome, item.q10, item.q20, item.q30, item.q50);
      simulacoes.push({ item, sim });
    }
  } catch(e) {
    mostrarErro("saidaErro", e.message);
    return;
  }

  let resumo = `Cliente: ${cliente_nome}\n\n`;
  simulacoes.forEach(({ item, sim }) => {
    resumo += `${item.cerveja_nome} — ${fmt(litrosBarris(item.q10,item.q20,item.q30,item.q50))} L\n`;
    resumo += `Barris: 10L=${item.q10}, 20L=${item.q20}, 30L=${item.q30}, 50L=${item.q50}\n`;
    resumo += `Baixa automática: ${Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" • ")}\n`;
    if (item.codigos_barris) resumo += `Códigos: ${item.codigos_barris}\n`;
    resumo += "\n";
  });
  resumo += "Confirmar saída?";

  if (!confirm(resumo)) return;

  const grupo_saida = crypto.randomUUID();

  try {
    for (const { item, sim } of simulacoes) {
      for (const u of sim.updates) {
        const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);
        await sb.from("estoque_cerveja").upsert({
          cerveja_id: cerveja ? cerveja.id : null,
          cerveja_nome: item.cerveja_nome,
          origem: u.origem,
          q10: Number(u.q10 || 0),
          q20: Number(u.q20 || 0),
          q30: Number(u.q30 || 0),
          q50: Number(u.q50 || 0),
          litros: Number(u.litros || 0),
          atualizado_em: new Date().toISOString()
        }, { onConflict:"cerveja_nome,origem" });
      }

      const litros = litrosBarris(item.q10,item.q20,item.q30,item.q50);
      const origem_baixada = Object.entries(sim.resumoPorOrigem).map(([o,l]) => `${o}: ${fmt(l)}L`).join(" | ");
      const cerveja = state.cervejas.find(c => c.nome === item.cerveja_nome);

      const { error: saidaErro } = await sb.from("saidas").insert({
        grupo_saida,
        cliente_id: clienteId,
        cliente_nome,
        cerveja_id: cerveja ? cerveja.id : null,
        cerveja_nome: item.cerveja_nome,
        q10:item.q10,
        q20:item.q20,
        q30:item.q30,
        q50:item.q50,
        litros,
        codigos_barris: item.codigos_barris,
        origem_baixada,
        responsavel,
        observacao
      });

      if (saidaErro) throw saidaErro;

      await sb.from("movimentacoes").insert({
        tipo:"SAIDA ESTOQUE",
        categoria:"CERVEJA",
        item_nome: item.cerveja_nome,
        quantidade: -Math.abs(litros),
        unidade:"L",
        destino: cliente_nome,
        cliente_nome,
        observacao: `${origem_baixada}${observacao ? " — " + observacao : ""}`,
        responsavel
      });
    }
  } catch(e) {
    mostrarErro("saidaErro", "Erro ao salvar saída: " + e.message);
    return;
  }

  document.getElementById("saidaResponsavel").value = "";
  document.getElementById("saidaObs").value = "";
  document.getElementById("saidaItens").innerHTML = "";
  adicionarItemSaida();
  invalidar("saidas","estoque","inicio");
  alert("Saída registrada com baixa automática do estoque.");
  carregarSaidas(true);
  carregarInicio(true);
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

function dataBR(v) {
  if (!v) return "-";
  const [a,m,d] = String(v).split("-");
  return `${d}/${m}/${a}`;
}
