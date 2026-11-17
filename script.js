// ===== SONS DO JOGO =====
const Som = {
    habilitado: true,
    tocarFrequencia(freq, duracao = 150, tipo = "sine", vol = 0.15) {
        if (!this.habilitado) return;
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const ganho = ctx.createGain();
            osc.connect(ganho);
            ganho.connect(ctx.destination);
            osc.frequency.value = freq;
            osc.type = tipo;
            ganho.gain.value = vol;
            ganho.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracao / 1000);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + duracao / 1000);
        } catch (e) {}
    },
    colocarPeca() { this.tocarFrequencia(440, 120, "sine", 0.12); },
    comprar() { this.tocarFrequencia(523, 180, "triangle", 0.1); },
    passar() { this.tocarFrequencia(330, 200, "sine", 0.08); },
    vitoria() {
        [523, 659, 784, 1047].forEach((f, i) => 
            setTimeout(() => this.tocarFrequencia(f, 250, "sine", 0.18), i * 150)
        );
    },
    derrota() {
        [392, 349, 294, 220].forEach((f, i) => 
            setTimeout(() => this.tocarFrequencia(f, 300, "triangle", 0.12), i * 200)
        );
    },
    bloqueio() { this.tocarFrequencia(400, 300, "sawtooth", 0.08); }
};

let pecas = [];
let maoJogador = [];
let maoComputador = [];
let monte = [];
let mesa = [];
let pontosJogador = 0;
let pontosPC = 0;
let vez = "jogador";
let passes = 0;
let rodadaEncerrada = false;
let dificuldadePC = "medio";

let estatisticas = JSON.parse(localStorage.getItem("estatisticasDomino3D")) || {
    partidas: 0,
    vitoriasJogador: 0,
    vitoriasPC: 0
};

function salvarEstatisticas() {
    localStorage.setItem("estatisticasDomino3D", JSON.stringify(estatisticas));
}

function criarJogo() {
    pecas = [];
    for (let i = 0; i <= 6; i++) {
        for (let j = i; j <= 6; j++) {
            pecas.push([i, j]);
        }
    }
    pecas.sort(() => Math.random() - 0.5);
    maoJogador = pecas.slice(0, 7);
    maoComputador = pecas.slice(7, 14);
    monte = pecas.slice(14);
}

function encontrarEncaixe(peca) {
    if (mesa.length === 0) return "direita";
    let esquerda = mesa[0][0];
    let direita = mesa[mesa.length - 1][1];
    if (peca[0] === direita || peca[1] === direita) return "direita";
    if (peca[1] === esquerda || peca[0] === esquerda) return "esquerda";
    return null;
}

function colocarPeca(peca, lado) {
    if (mesa.length === 0 || lado === "direita") {
        if (mesa.length > 0 && peca[1] === mesa[mesa.length - 1][1]) {
            mesa.push([peca[1], peca[0]]);
        } else {
            mesa.push(peca);
        }
    } else {
        if (peca[0] === mesa[0][0]) {
            mesa.unshift([peca[1], peca[0]]);
        } else {
            mesa.unshift(peca);
        }
    }
    passes = 0;
}

function criarBolinhas(numero) {
    let posicoes = {
        0: [], 1: [5], 2: [1, 9], 3: [1, 5, 9],
        4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9]
    };
    let html = '<div class="bolinhas">';
    for (let i = 1; i <= 9; i++) {
        html += posicoes[numero].includes(i)
            ? '<span class="bolinha"></span>'
            : '<span></span>';
    }
    html += '</div>';
    return html;
}

function criarPeca(peca, clicavel, indice) {
    let elemento = document.createElement("div");
    elemento.className = "peca";
    elemento.innerHTML = `
        <div class="lado">${criarBolinhas(peca[0])}</div>
        <div class="divisoria"></div>
        <div class="lado">${criarBolinhas(peca[1])}</div>
    `;
    if (clicavel) elemento.onclick = () => jogarPeca(indice);
    return elemento;
}

function mostrarPecas() {
    let mao = document.getElementById("minhas-pecas");
    mao.innerHTML = "";
    maoJogador.forEach((peca, i) => {
        mao.appendChild(criarPeca(peca, vez === "jogador" && !rodadaEncerrada, i));
    });
    document.getElementById("pecas-pc").innerText = maoComputador.length;
    document.getElementById("btn-comprar").disabled =
        vez !== "jogador" || rodadaEncerrada || monte.length === 0 ||
        maoJogador.some(p => encontrarEncaixe(p) !== null);
    document.getElementById("btn-passar").disabled =
        vez !== "jogador" || rodadaEncerrada || monte.length > 0 ||
        maoJogador.some(p => encontrarEncaixe(p) !== null);
}

function mostrarMesa() {
    let tabuleiro = document.getElementById("tabuleiro");
    tabuleiro.innerHTML = "";
    if (mesa.length === 0) {
        tabuleiro.innerHTML = '<p style="color:#e7dfc5">Mesa vazia — jogue a primeira peça!</p>';
        return;
    }
    const PECAS_POR_LINHA = 9;
    const ESPACO_ENTRE_PECAS = -6;
    const LARGURA_PECA = 105;
    let linhas = [];
    let linhaAtual = [];
    mesa.forEach((peca, indice) => {
        const elemento = criarPeca(peca, false);
        if (peca[0] === peca[1]) {
            elemento.classList.add("vertical");
        }
        linhaAtual.push(elemento);
        if ((indice + 1) % PECAS_POR_LINHA === 0 && indice !== mesa.length - 1) {
            linhas.push(linhaAtual);
            linhaAtual = [];
        }
    });
    if (linhaAtual.length > 0) {
        linhas.push(linhaAtual);
    }
    linhas.forEach((linha, indiceLinha) => {
        const linhaDiv = document.createElement("div");
        linhaDiv.className = "linha-mesa";
        if (indiceLinha === 0) {
            linhaDiv.style.justifyContent = "flex-start";
            linhaDiv.style.marginLeft = "0";
        } else {
            const pecasVazias = PECAS_POR_LINHA - linha.length;
            const deslocamento = pecasVazias * (LARGURA_PECA + ESPACO_ENTRE_PECAS);
            linhaDiv.style.marginLeft = `${deslocamento}px`;
            linhaDiv.style.justifyContent = "flex-start";
        }
        linha.forEach((elemento) => {
            if (elemento.classList.contains("vertical")) {
                elemento.style.margin = `0 ${ESPACO_ENTRE_PECAS}px`;
            }
            linhaDiv.appendChild(elemento);
        });
        tabuleiro.appendChild(linhaDiv);
    });
}

function atualizarPlacar() {
    document.getElementById("pontos-jogador").innerText = pontosJogador;
    document.getElementById("pontos-pc-total").innerText = pontosPC;
}

function mensagem(texto) {
    document.getElementById("mensagem").innerText = texto;
}

function atualizarTela() {
    mostrarPecas();
    mostrarMesa();
    atualizarPlacar();
}

function jogarPeca(indice) {
    if (vez !== "jogador" || rodadaEncerrada) return;
    let peca = maoJogador[indice];
    let lado = encontrarEncaixe(peca);
    if (lado === null) {
        mensagem("Essa peça não encaixa!");
        return;
    }
    colocarPeca(peca, lado);
    Som.colocarPeca();
    maoJogador.splice(indice, 1);
    atualizarTela();
    if (maoJogador.length === 0) {
        finalizarRodada("jogador");
        return;
    }
    vez = "computador";
    mensagem("Vez do computador...");
    setTimeout(jogadaComputador, 1000);
}

function comprarPeca() {
    if (vez !== "jogador" || rodadaEncerrada) return;
    if (maoJogador.some(p => encontrarEncaixe(p) !== null)) {
        mensagem("Você já tem uma peça que pode jogar!");
        return;
    }
    if (monte.length === 0) {
        mensagem("Não existem mais peças para comprar!");
        return;
    }
    maoJogador.push(monte.pop());
    mensagem("Você comprou uma peça. Verifique sua mão!");
    Som.comprar();
    atualizarTela();
}

function passarVez() {
    if (vez !== "jogador" || rodadaEncerrada) return;
    if (monte.length > 0 || maoJogador.some(p => encontrarEncaixe(p) !== null)) {
        mensagem("Você ainda pode comprar ou jogar!");
        return;
    }
    passes++;
    vez = "computador";
    mensagem("Você passou a vez!");
    Som.passar();
    atualizarTela();
    setTimeout(jogadaComputador, 1000);
}

function escolherJogadaComputador() {
    let jogadas = [];
    maoComputador.forEach((peca, i) => {
        let lado = encontrarEncaixe(peca);
        if (lado !== null) jogadas.push({ indice: i, peca, lado });
    });
    if (jogadas.length === 0) return -1;
    if (dificuldadePC === "facil") {
        return jogadas[Math.floor(Math.random() * jogadas.length)].indice;
    }
    if (dificuldadePC === "medio") {
        jogadas.sort((a, b) => (b.peca[0] + b.peca[1]) - (a.peca[0] + a.peca[1]));
        return jogadas[0].indice;
    }
    if (dificuldadePC === "dificil") {
        jogadas.sort((a, b) => {
            function estrategia(j) {
                let livre;
                if (mesa.length === 0) livre = j.peca[1];
                else if (j.lado === "direita") {
                    let ponta = mesa[mesa.length - 1][1];
                    livre = j.peca[0] === ponta ? j.peca[1] : j.peca[0];
                } else {
                    let ponta = mesa[0][0];
                    livre = j.peca[1] === ponta ? j.peca[0] : j.peca[1];
                }
                return maoComputador.filter((o, i) => i !== j.indice && (o[0] === livre || o[1] === livre)).length;
            }
            return estrategia(b) - estrategia(a);
        });
        return jogadas[0].indice;
    }
    return jogadas[0].indice;
}

function jogadaComputador() {
    if (rodadaEncerrada) return;
    let indice = escolherJogadaComputador();
    while (indice === -1 && monte.length > 0) {
        maoComputador.push(monte.pop());
        indice = escolherJogadaComputador();
    }
    if (indice === -1) {
        passes++;
        if (passes >= 2 && monte.length === 0) {
            finalizarRodada("bloqueio");
            return;
        }
        vez = "jogador";
        mensagem("Computador passou! Sua vez.");
        atualizarTela();
        return;
    }
    let peca = maoComputador[indice];
    colocarPeca(peca, encontrarEncaixe(peca));
    Som.colocarPeca();
    maoComputador.splice(indice, 1);
    atualizarTela();
    if (maoComputador.length === 0) {
        finalizarRodada("computador");
        return;
    }
    vez = "jogador";
    mensagem("Sua vez de jogar!");
    atualizarTela();
}

function somarPontos(mao) {
    return mao.reduce((total, peca) => total + peca[0] + peca[1], 0);
}

function finalizarRodada(resultado) {
    rodadaEncerrada = true;
    estatisticas.partidas++;
    if (resultado === "jogador") {
        estatisticas.vitoriasJogador++;
        let pontos = somarPontos(maoComputador);
        pontosJogador += pontos;
        mensagem("🎉 Você venceu! Ganhou " + pontos + " pontos!");
        Som.vitoria();
    } else if (resultado === "computador") {
        estatisticas.vitoriasPC++;
        let pontos = somarPontos(maoJogador);
        pontosPC += pontos;
        mensagem("😞 Computador venceu! Ganhou " + pontos + " pontos!");
        Som.derrota();
    } else {
        let pJogador = somarPontos(maoJogador);
        let pPC = somarPontos(maoComputador);
        if (pJogador < pPC) {
            pontosJogador += pPC - pJogador;
            mensagem("🔒 Bloqueado! Você venceu com menos pontos!");
        } else if (pPC < pJogador) {
            pontosPC += pJogador - pPC;
            mensagem("🔒 Bloqueado! Computador venceu!");
        } else {
            mensagem("🔒 Bloqueado! Empate!");
        }
        Som.bloqueio();
    }
    setTimeout(() => {
        let botaoNova = document.createElement("button");
        botaoNova.textContent = "🔄 Nova Partida";
        botaoNova.style.marginTop = "15px";
        botaoNova.style.padding = "12px 25px";
        botaoNova.style.background = "#f5d77a";
        botaoNova.style.color = "#222";
        botaoNova.style.border = "none";
        botaoNova.style.borderRadius = "8px";
        botaoNova.style.fontWeight = "bold";
        botaoNova.style.cursor = "pointer";
        botaoNova.onclick = () => {
            document.getElementById("tela-inicial").style.display = "flex";
            botaoNova.remove();
        };
        document.querySelector(".centro").appendChild(botaoNova);
    }, 800);
    salvarEstatisticas();
    atualizarTela();
}

function iniciarNovaPartida() {
    dificuldadePC = document.getElementById("dificuldade").value;
    mesa = [];
    passes = 0;
    rodadaEncerrada = false;
    vez = "jogador";
    criarJogo();
    carregarPontos();
    document.getElementById("tela-inicial").style.display = "none";
    atualizarTela();
    mensagem("Sua vez! Escolha uma peça para começar 🎯");
}

function mostrarRegras() {
    alert(
        "📜 REGRAS DO DOMINÓ\n\n" +
        "1. Cada jogador recebe 7 peças.\n" +
        "2. Combine números iguais nas pontas da mesa.\n" +
        "3. Se não tiver jogada, compre uma peça do monte.\n" +
        "4. Se não puder jogar e não houver peças, passe a vez.\n" +
        "5. Quem terminar as peças primeiro vence!"
    );
}

function alternarSom() {
    Som.habilitado = !Som.habilitado;
    const btn = document.getElementById("btn-som");
    btn.textContent = Som.habilitado ? "🔊 Som" : "🔇 Mudo";
}

document.addEventListener('click', function iniciarAudio() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        ctx.resume();
    } catch (e) {}
}, { once: true });

function carregarPontos() {
    const salvos = localStorage.getItem("pontosDomino3D");
    if (salvos) {
        const dados = JSON.parse(salvos);
        pontosJogador = dados.jogador || 0;
        pontosPC = dados.computador || 0;
        atualizarPlacar();
    } else {
        pontosJogador = 0;
        pontosPC = 0;
    }
}

function salvarPontos() {
    localStorage.setItem("pontosDomino3D", JSON.stringify({
        jogador: pontosJogador,
        computador: pontosPC
    }));
    mensagem("💾 Pontos salvos com sucesso!");
}

function zerarPontos() {
    if (confirm("Tem certeza que quer ZERAR o placar? Essa ação não pode ser desfeita!")) {
        pontosJogador = 0;
        pontosPC = 0;
        localStorage.removeItem("pontosDomino3D");
        atualizarPlacar();
        mensagem("🔄 Placar zerado!");
    }
}

// ===== CONFIGURAÇÕES — COR DA MESA =====
const corPadrao = "#07512f";

function carregarCorMesa() {
    const corSalva = localStorage.getItem("corMesaDomino") || corPadrao;
    aplicarCorMesa(corSalva);
}

function aplicarCorMesa(cor) {
    const mesaElemento = document.querySelector(".mesa");
    if (mesaElemento) {
        mesaElemento.style.backgroundColor = cor;
    }
}

function mudarCorMesa(cor) {
    aplicarCorMesa(cor);
    localStorage.setItem("corMesaDomino", cor);
    mensagem("🎨 Cor da mesa alterada!");
}

function abrirConfiguracoes() {
    const aba = document.getElementById("aba-configuracoes");
    if (aba) aba.style.display = "block";
}

function fecharConfiguracoes() {
    const aba = document.getElementById("aba-configuracoes");
    if (aba) aba.style.display = "none";
}

//
