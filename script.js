let diaAtual = 0;
const logBox = document.getElementById("logBox");

// Estado de cada produto
const produtos = {
  cuba: { inStock: 50, toOrder: 0, ordered: 0, received: 0, diasRestantes: 0 },
  velo: { inStock: 50, toOrder: 0, ordered: 0, received: 0, diasRestantes: 0 },
  pablo: { inStock: 50, toOrder: 0, ordered: 0, received: 0, diasRestantes: 0 },
};

// Histórico
const historico = {};

// Log
function log(mensagem, tipo = "info") {
  const p = document.createElement("div");
  p.textContent = `Dia ${diaAtual}: ${mensagem}`;
  p.style.color = tipo === "erro" ? "red" : tipo === "aviso" ? "orange" : "black";
  logBox.appendChild(p);
  logBox.scrollTop = logBox.scrollHeight;
}

// Atualiza UI
function atualizarUI() {
  for (let nome in produtos) {
    document.getElementById(nome + "ToOrder").textContent = produtos[nome].toOrder;
    document.getElementById(nome + "Ordered").textContent = produtos[nome].ordered > 0
      ? `${produtos[nome].ordered} (${produtos[nome].diasRestantes}d)`
      : 0;
    document.getElementById(nome + "Received").textContent = produtos[nome].received;
    document.getElementById(nome + "InStock").textContent = produtos[nome].inStock;
  }
  document.getElementById("diaAtual").textContent = diaAtual;
}

// Função de validação (apenas no dia 0)
function validarParametrosIniciais() {
  let valido = true;
  let erros = [];

  const restricoes = [
    { regra: (v) => v.leadTime > 0 && v.leadTime <= 365, msg: "Lead Time deve estar entre 1 e 365 dias." },
    { regra: (v) => v.demanda > 0, msg: "A Demanda tem que ser superior a 0." },
    { regra: (v) => Number.isInteger(v.pedidoQtd) && v.pedidoQtd > 0, msg: "Qtd. Pedido deve ser um número inteiro positivo." },
    { regra: (v) => v.safetyStock >= 0, msg: "Safety Stock deve ser ≥ 0." },
    { regra: (v) => v.inStockInicial > v.safetyStock, msg: "InStock inicial deve ser maior que Safety Stock." },
    { regra: (v) => v.inStockInicial <= 1000, msg: "InStock inicial deve ser ≤ 1000." }
  ];

  for (let nome in produtos) {
    const valores = {
      leadTime: parseFloat(document.getElementById(nome + "LeadTime").value),
      demanda: parseFloat(document.getElementById(nome + "Demanda").value),
      safetyStock: parseFloat(document.getElementById(nome + "SafetyStock").value),
      pedidoQtd: parseFloat(document.getElementById(nome + "PedidoQtd").value),
      inStockInicial: produtos[nome].inStock
    };

    if (Object.values(valores).some(v => isNaN(v))) {
      erros.push(`Todos os campos de ${nome} devem estar preenchidos.`);
      valido = false;
      continue;
    }

    for (let r of restricoes) {
      if (!r.regra(valores)) {
        erros.push(`${nome}: ${r.msg}`);
        valido = false;
      }
    }

    // Restrição 1: Lead Time × Demanda ≤ Safety Stock
    if (valores.leadTime * valores.demanda > valores.safetyStock) {
      erros.push(`${nome}: Safety Stock insuficiente para cobrir o Lead Time (LeadTime × Demanda ≤ Safety Stock).`);
      valido = false;
    }

    // Restrição 2: InStock Inicial - Demanda > Safety Stock
    if (valores.inStockInicial - valores.demanda <= valores.safetyStock) {
      erros.push(`${nome}: InStock inicial deve permitir 1 dia de consumo sem violar o Safety Stock.`);
      valido = false;
    }
  }

  if (!valido) {
    log("❌ Não foi possível avançar para o dia 1 porque há parâmetros que ainda não estão válidos.", "erro");
    erros.forEach(e => log(`⚠️ ${e}`, "aviso"));
  } else {
    log("✅ Todos os parâmetros validados. Início da simulação a partir do dia 1.", "info");
  }

  return valido;
}

// Bloquear/desbloquear inputs conforme o dia
function alternarInputs(estado) {
  document.querySelectorAll(".parameters input").forEach(inp => inp.disabled = !estado);
}

// Processa lógica de 1 produto
function processarProduto(nome) {
  const p = produtos[nome];

  const leadTime = parseInt(document.getElementById(nome + "LeadTime").value);
  const demanda = parseFloat(document.getElementById(nome + "Demanda").value);
  const safetyStock = parseFloat(document.getElementById(nome + "SafetyStock").value);
  const pedidoQtd = parseInt(document.getElementById(nome + "PedidoQtd").value);

  p.inStock = Math.max(0, p.inStock - demanda);

  if (p.received > 0) {
    p.inStock += p.received;
    log(`${nome} recebeu ${p.received} unidades para o stock`);
    p.received = 0;
  }

  if (p.ordered > 0) {
    p.diasRestantes--;
    if (p.diasRestantes <= 0) {
      p.received = p.ordered;
      log(`${nome} moveu ${p.ordered} unidades para Received`);
      p.ordered = 0;
    }
  }

  if (p.inStock < safetyStock && p.ordered === 0 && p.received === 0) {
    p.toOrder = pedidoQtd;
    p.ordered = p.toOrder;
    p.diasRestantes = leadTime;
    log(`${nome} fez novo pedido de ${pedidoQtd} unidades (Lead Time ${leadTime} dias)`);
    p.toOrder = 0;
  }
}

// Avançar dia
document.getElementById("nextDay").addEventListener("click", () => {
  if (diaAtual === 0) {
    log("🔎 A validar parâmetros iniciais...");
    if (!validarParametrosIniciais()) {
      return;
    }
    alternarInputs(false);
  }

  diaAtual++;
  for (let nome in produtos) processarProduto(nome);
  historico[diaAtual] = JSON.parse(JSON.stringify(produtos));
  atualizarUI();
});

// Retroceder dia
document.getElementById("prevDay").addEventListener("click", () => {
  if (diaAtual > 0) {
    diaAtual--;
    if (historico[diaAtual]) {
      produtos.cuba = { ...historico[diaAtual].cuba };
      produtos.velo = { ...historico[diaAtual].velo };
      produtos.pablo = { ...historico[diaAtual].pablo };
    }
    if (diaAtual === 0) alternarInputs(true);
    atualizarUI();
  }
});

// Inicialização
historico[0] = JSON.parse(JSON.stringify(produtos));
atualizarUI();
log("✅ Simulação iniciada no dia 0. Pode ajustar os parâmetros antes de avançar.");
