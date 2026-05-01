// =============================================================
//  ComunicaMFC — Funções de renderização
//
//  Estado de implementação:
//    Fase 3.A → ESQUELETO
//    Fase 3.B → CAPTURA (este arquivo, atual)
//    Fase 3.D → APRESENTAÇÃO (Resultado, Glossário, Reflexão)
//
//  Cada função desta camada toca o DOM. Funções recebem dados de
//  Dados (window.Dados) e do State (window.State).
// =============================================================

const Render = (function () {

  // =========================================================
  //  HELPERS GENÉRICOS
  // =========================================================

  function escapar(texto) {
    if (texto == null) return "";
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function selecionarSecao(id) {
    document.querySelectorAll(".section").forEach((s) => {
      s.classList.remove("visible");
    });
    const alvo = document.getElementById(id);
    if (alvo) {
      alvo.classList.add("visible");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function atualizarProgress(passo) {
    // 1..6 — passa fase visualmente; preenche linhas anteriores
    for (let i = 1; i <= 6; i++) {
      const dot = document.getElementById(`pstep-${i}`);
      if (!dot) continue;
      dot.classList.toggle("active", i === passo);
      dot.classList.toggle("completed", i < passo);
    }
    for (let i = 1; i <= 5; i++) {
      const line = document.getElementById(`pline-${i}${i + 1}`);
      if (!line) continue;
      line.style.setProperty("--fill", i < passo ? "100%" : "0%");
    }
  }

  // Retorna o rótulo de um domínio (do passo0.json) por id.
  // Por padrão devolve em minúsculas para uso mid-frase nas
  // perguntas da Dim 4 ("...realizar a [DOMÍNIO]?"); passe
  // paraSentenca=false para preservar a capitalização original
  // em cabeçalhos (ex.: "Domínio: Adesão a regime terapêutico").
  function rotuloDominio(id_dominio, paraSentenca) {
    const dados = window.Dados.passo0;
    if (!dados || !dados.campos.dominio.opcoes) return id_dominio;
    const opc = dados.campos.dominio.opcoes.find((o) => o.id === id_dominio);
    if (!opc) return id_dominio;
    return paraSentenca === false ? opc.rotulo : opc.rotulo.toLowerCase();
  }

  // Retorna o rótulo de uma concordância (do passo0.json) por id.
  // Sempre devolve com a capitalização original do JSON.
  function rotuloConcordancia(id_conc) {
    const dados = window.Dados.passo0;
    if (!dados || !dados.campos.concordancia.opcoes) return id_conc;
    const opc = dados.campos.concordancia.opcoes.find((o) => o.id === id_conc);
    return opc ? opc.rotulo : id_conc;
  }

  // Exibe banner de erro de validação inline acima do botão de avançar.
  // Adicionado em 3.D v2 conforme item 4 do feedback (validação rígida
  // da Camada 2). Container deve existir no DOM com id="validacao-erro"
  // dentro da seção ativa. Se não existir, cria-se dinamicamente.
  function exibirErroValidacao(secaoId, mensagem) {
    const sec = document.getElementById(secaoId);
    if (!sec) return;
    let container = sec.querySelector(".validacao-erro");
    if (!container) {
      container = document.createElement("div");
      container.className = "validacao-erro alert alert-warning";
      container.style.cssText = "margin-top:1rem;padding:.75rem 1rem;" +
        "background:rgba(217,119,6,.15);border:1px solid var(--amber-400);" +
        "border-radius:var(--radius-sm);color:var(--amber-400);" +
        "font-size:.88rem;line-height:1.5";
      const cardEl = sec.querySelector(".card");
      const btnsEl = cardEl ? cardEl.querySelector("div[style*='justify-content:space-between']") : null;
      if (btnsEl && btnsEl.parentNode) {
        btnsEl.parentNode.insertBefore(container, btnsEl);
      } else if (cardEl) {
        cardEl.appendChild(container);
      }
    }
    container.textContent = mensagem;
    if (typeof container.scrollIntoView === "function") {
      container.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function limparErroValidacao(secaoId) {
    const sec = document.getElementById(secaoId);
    if (!sec) return;
    const container = sec.querySelector(".validacao-erro");
    if (container && container.parentNode) container.parentNode.removeChild(container);
  }

  // Mini-glossário inline da dimensão. Aparece como <details> abaixo
  // do título de cada dimensão na captura — colapsado por padrão para
  // não poluir; expandido quando o residente quiser saber o que aquele
  // construto significa antes de classificar. Texto vem do campo
  // 'mini_glossario_inline' do JSON da dimensão (adicionado em 3.D v2
  // conforme item 7 do feedback de uso real).
  function _miniGlossarioInline(dadosDim) {
    const texto = (dadosDim || {}).mini_glossario_inline;
    if (!texto) return "";
    return `
      <details style="margin:.5rem 0 1.25rem 0;font-size:.82rem">
        <summary style="cursor:pointer;color:var(--slate-400);
                        font-family:var(--font-mono);font-size:.7rem;
                        letter-spacing:.1em;text-transform:uppercase;
                        list-style:none;display:inline-flex;align-items:center;gap:.4rem">
          <span style="color:var(--amber-400)">ⓘ</span>
          O que esta dimensão classifica
        </summary>
        <div style="margin-top:.5rem;padding:.7rem .9rem;
                    background:var(--slate-900);border-left:2px solid var(--amber-400);
                    border-radius:var(--radius-sm);color:var(--slate-200);
                    line-height:1.6">
          ${escapar(texto)}
        </div>
      </details>
    `;
  }

  // =========================================================
  //  PASSO 0 — IDENTIFICAÇÃO DO COMPORTAMENTO-ALVO
  // =========================================================

  function renderizarPasso0() {
    const dados = window.Dados.passo0;
    const estado = window.State.get();

    const dominioOpts = dados.campos.dominio.opcoes.map((opc) => `
      <button type="button"
              class="opt-grande${estado.passo_0.dominio === opc.id ? " selected" : ""}"
              data-dominio="${escapar(opc.id)}"
              onclick="App.selecionarDominio('${escapar(opc.id)}')">
        <div class="opt-grande-titulo">${escapar(opc.rotulo)}</div>
        <div class="opt-grande-detalhe">${escapar(opc.exemplos)}</div>
      </button>
    `).join("");

    const concordanciaOpts = dados.campos.concordancia.opcoes.map((opc) => `
      <button type="button"
              class="opt-grande${estado.passo_0.concordancia === opc.id ? " selected" : ""}"
              data-concordancia="${escapar(opc.id)}"
              onclick="App.selecionarConcordancia('${escapar(opc.id)}')">
        <div class="opt-grande-titulo">${escapar(opc.rotulo)}</div>
        <div class="opt-grande-detalhe">${escapar(opc.definicao)}</div>
      </button>
    `).join("");

    document.getElementById("passo0-content").innerHTML = `
      <div class="card">
        <div class="card-title">
          Identificação do comportamento-alvo
          <span class="badge">Passo 0</span>
        </div>
        <div class="card-subtitle">
          ${escapar(dados.descricao)}
        </div>

        <div class="bloco-rotulo">Domínio do objetivo terapêutico</div>
        <div class="bloco-subtitulo">
          Preenchimento obrigatório.
        </div>
        ${dominioOpts}

        <div class="bloco-rotulo">Comportamento descrito (opcional)</div>
        <div class="bloco-subtitulo">
          ${escapar(dados.campos.comportamento.ajuda)}
        </div>
        <textarea class="textarea-livre"
                  id="passo0-comportamento"
                  placeholder="${escapar(dados.campos.comportamento.placeholder)}"
                  oninput="App.atualizarComportamento(this.value)">${escapar(estado.passo_0.comportamento)}</textarea>

        <div class="bloco-rotulo">${escapar(dados.campos.concordancia.rotulo)}</div>
        <div class="bloco-subtitulo">
          ${escapar(dados.campos.concordancia.ajuda || "Selecione conforme a reação observada na consulta.")} Preenchimento obrigatório.
        </div>
        ${concordanciaOpts}

        <div style="margin-top:1.5rem;display:flex;justify-content:flex-end">
          <button class="btn btn-primary"
                  id="btn-avancar-passo0"
                  onclick="App.avancarDoPasso0()"
                  ${(!estado.passo_0.dominio || !estado.passo_0.concordancia) ? "disabled" : ""}>
            Avançar para Pirâmide →
          </button>
        </div>
      </div>
    `;

    // Habilitar/desabilitar botão dinamicamente conforme campos.
    atualizarBotaoAvancarPasso0();
  }

  function atualizarBotaoAvancarPasso0() {
    const estado = window.State.get();
    const btn = document.getElementById("btn-avancar-passo0");
    if (!btn) return;
    const ok = !!estado.passo_0.dominio && !!estado.passo_0.concordancia;
    btn.disabled = !ok;
  }

  function atualizarSelecaoDominio(id_dominio) {
    document.querySelectorAll('[data-dominio]').forEach((el) => {
      el.classList.toggle("selected", el.dataset.dominio === id_dominio);
    });
    atualizarBotaoAvancarPasso0();
  }

  function atualizarSelecaoConcordancia(id_conc) {
    document.querySelectorAll('[data-concordancia]').forEach((el) => {
      el.classList.toggle("selected", el.dataset.concordancia === id_conc);
    });
    atualizarBotaoAvancarPasso0();
  }

  // =========================================================
  //  HELPER COMPARTILHADO — RENDERIZAÇÃO DE PERGUNTA TRIFURCADA
  //  (com Camada 1 sinais + Camada 2 botões)
  // =========================================================

  function renderizarPerguntaTrifurcada(pergunta, dim, opcoes) {
    opcoes = opcoes || {};
    const incluir_polo_n = opcoes.incluir_polo_n || false;
    const substituir_dominio = opcoes.substituir_dominio || null;

    let texto_pergunta = pergunta.pergunta_sintese;
    if (substituir_dominio) {
      texto_pergunta = texto_pergunta.replace(/\[DOMÍNIO\]/g, substituir_dominio);
    }

    const estado = window.State.get();
    const respostaAtual = estado.respostas_camada_2[dim][pergunta.id];
    const sinaisMarcados = (estado.sinais_marcados[dim] || [])
      .filter((s) => s.pergunta_id === pergunta.id);

    const sinaisHtml = pergunta.sinais.map((s, i) => {
      const id_sinal = `sinal-${dim}-${pergunta.id}-${i}`;
      const marcado = sinaisMarcados.some((sm) => sm.texto === s.texto);
      return `
        <label class="signal-check${marcado ? " checked" : ""}"
               for="${id_sinal}">
          <input type="checkbox"
                 id="${id_sinal}"
                 ${marcado ? "checked" : ""}
                 onchange="App.alternarSinal('${dim}', '${pergunta.id}', '${escapar(s.polo)}', this.checked, this)">
          <span>${escapar(s.texto)}</span>
          <span class="signal-check-polo">${escapar(s.polo)}</span>
        </label>
      `;
    }).join("");

    // Botões trifurcados — montagem genérica a partir do objeto polos
    const polosArr = Object.entries(pergunta.polos);
    const polosHtml = polosArr.map(([polo_id, polo_def]) => {
      const selecionado = respostaAtual === polo_id;
      return `
        <button type="button"
                class="tri-option ${selecionado ? "selected-" + polo_id.charAt(0) : ""}"
                data-pergunta="${escapar(pergunta.id)}"
                data-polo="${escapar(polo_id)}"
                onclick="App.selecionarPolo('${dim}', '${escapar(pergunta.id)}', '${escapar(polo_id)}')">
          ${escapar(polo_def.rotulo)}
        </button>
      `;
    }).join("");

    return `
      <div class="pergunta-bloco" data-pergunta-id="${escapar(pergunta.id)}">
        <span class="pergunta-id">${escapar(pergunta.id)}</span>
        <div class="pergunta-texto">${escapar(texto_pergunta)}</div>

        <div class="pergunta-sinais-rotulo">Sinais clínicos observados (opcional)</div>
        ${sinaisHtml}

        <div class="pergunta-sinais-rotulo" style="margin-top:1rem">Sua leitura clínica</div>
        <div class="tri-options">${polosHtml}</div>
      </div>
    `;
  }

  // =========================================================
  //  DIMENSÃO 1 — PIRÂMIDE
  //  Estrutura especial: 3 blocos com perguntas binárias (sim/não)
  // =========================================================

  function renderizarDimensao1() {
    const dados = window.Dados.dim1;
    const estado = window.State.get();
    const respostas = estado.respostas_camada_2.dim1;

    const renderizarPerguntaBinaria = (p, bloco_id) => {
      const id_chk = `dim1-${p.id}`;
      const marcado = !!respostas[p.id];
      const sinais = p.sinais.map((s) =>
        `<div style="font-size:.78rem;color:var(--slate-400);margin-left:1.6rem;line-height:1.45">${escapar(s)}</div>`
      ).join("");
      return `
        <div class="pergunta-bloco">
          <label class="signal-check${marcado ? " checked" : ""}"
                 for="${id_chk}"
                 style="font-size:.92rem;font-family:var(--font-serif);color:var(--slate-100)">
            <input type="checkbox"
                   id="${id_chk}"
                   ${marcado ? "checked" : ""}
                   onchange="App.alternarPiramide('${escapar(p.id)}', this.checked)">
            <span><strong style="color:var(--amber-400);font-family:var(--font-mono);font-size:.78rem">${escapar(p.id)} —</strong> ${escapar(p.pergunta)}</span>
          </label>
          <div style="margin-top:.5rem">${sinais}</div>
        </div>
      `;
    };

    const blocosHtml = dados.blocos.map((bloco) => `
      <div class="bloco-rotulo">Bloco ${bloco.id} — ${escapar(bloco.nome)}</div>
      <div class="bloco-subtitulo">${escapar(bloco.objetivo)}</div>
      ${bloco.perguntas.map((p) => renderizarPerguntaBinaria(p, bloco.id)).join("")}
    `).join("");

    document.getElementById("piramide-content").innerHTML = `
      <div class="card">
        <div class="card-title">
          Pirâmide da Mudança
          <span class="badge">Dimensão 1 · Receptividade</span>
        </div>
        <div class="card-subtitle">
          Árvore de decisão hierárquica em três blocos. A primeira confirmação
          define o nível. Marque os sinais observados durante a consulta.
        </div>
        <div class="card-quote">
          "Não temos um teste diagnóstico para distinguir entre os dois perfis,
          e é o fracasso contínuo que nos fará qualificar um paciente como
          resistente." — Borrell Carrió (2012, p. 158)
        </div>
        ${_miniGlossarioInline(dados)}

        ${blocosHtml}

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap;align-items:center">
          <button class="btn btn-ghost" onclick="App.voltarParaPasso0()">← Voltar</button>
          <div style="display:flex;gap:.5rem;flex-wrap:wrap">
            <button class="btn btn-ghost"
                    onclick="App.classificarPiramidePorInconclusao()"
                    title="Use quando nenhum dos sinais listados foi observado durante a consulta. Resulta em classificação provisória.">
              Nenhum sinal observado
            </button>
            <button class="btn btn-primary" onclick="App.classificarPiramide()">
              Classificar nível →
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function atualizarChecagemPiramide(perguntaId, marcado) {
    const chk = document.getElementById(`dim1-${perguntaId}`);
    if (!chk) return;
    const label = chk.closest("label.signal-check");
    if (label) label.classList.toggle("checked", marcado);
  }

  // =========================================================
  //  DIMENSÃO 2 — LOCUS DE CONTROLE (Etapa 1)
  // =========================================================

  function renderizarDimensao2() {
    const dados = window.Dados.dim2;
    const perguntasHtml = dados.etapa1.perguntas
      .map((p) => renderizarPerguntaTrifurcada(p, "dim2"))
      .join("");

    document.getElementById("locus-content").innerHTML = `
      <div class="card">
        <div class="card-title">
          Locus de Controle
          <span class="badge">Dimensão 2 · Atribuição de agência</span>
        </div>
        <div class="card-subtitle">
          A quem ou ao quê o paciente atribui a agência sobre sua condição.
          Para cada pergunta, marque os sinais observados (opcional) e escolha
          a leitura clínica mais próxima do que se viu na consulta.
        </div>
        ${_miniGlossarioInline(dados)}

        ${perguntasHtml}

        <div id="locus-d4-container"></div>

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;gap:.75rem">
          <button class="btn btn-ghost" onclick="App.voltarParaPiramide()">← Voltar</button>
          <button class="btn btn-primary" onclick="App.classificarLocusEtapa1()">
            Classificar locus →
          </button>
        </div>
      </div>
    `;
  }

  function renderizarLocusEtapa2() {
    const dados = window.Dados.dim2;
    const p = dados.etapa2.pergunta;
    const estado = window.State.get();
    const respostaD4 = estado.respostas_camada_2.dim2.D4;

    // Sinais combinados (Aliança + Fatalista) com filtragem por polo.
    const todosSinais = [
      ...p.sinais_alianca.map((s) => ({ ...s, polo: "Alianca" })),
      ...p.sinais_fatalista.map((s) => ({ ...s, polo: "Fatalista" })),
    ];

    const sinaisMarcados = (estado.sinais_marcados.dim2 || [])
      .filter((s) => s.pergunta_id === "D4");

    const sinaisHtml = todosSinais.map((s, i) => {
      const id_sinal = `sinal-dim2-D4-${i}`;
      const marcado = sinaisMarcados.some((sm) => sm.texto === s.texto);
      return `
        <label class="signal-check${marcado ? " checked" : ""}" for="${id_sinal}">
          <input type="checkbox"
                 id="${id_sinal}"
                 ${marcado ? "checked" : ""}
                 onchange="App.alternarSinal('dim2', 'D4', '${escapar(s.polo)}', this.checked, this)">
          <span>${escapar(s.texto)}</span>
          <span class="signal-check-polo">${escapar(s.polo)}</span>
        </label>
      `;
    }).join("");

    const polosHtml = Object.entries(p.polos).map(([polo_id, polo_def]) => {
      const selecionado = respostaD4 === polo_id;
      return `
        <button type="button"
                class="tri-option${selecionado ? " selected-A" : ""}"
                onclick="App.selecionarPolo('dim2', 'D4', '${escapar(polo_id)}')">
          ${escapar(polo_def.rotulo)}
        </button>
      `;
    }).join("");

    document.getElementById("locus-d4-container").innerHTML = `
      <div class="revelar-d4">
        <div style="font-family:var(--font-mono);font-size:.7rem;
                    letter-spacing:.12em;text-transform:uppercase;
                    color:var(--amber-400);margin-bottom:.35rem">
          Etapa 2 — Desambiguação Aliança / Fatalista
        </div>
        <div class="pergunta-texto" style="margin-top:.25rem">
          <strong style="color:var(--amber-400);font-family:var(--font-mono);font-size:.78rem">D4 —</strong>
          ${escapar(p.pergunta_sintese)}
        </div>

        <div class="pergunta-sinais-rotulo">Sinais clínicos observados (opcional)</div>
        ${sinaisHtml}

        <div class="pergunta-sinais-rotulo" style="margin-top:1rem">Sua leitura clínica</div>
        <div class="tri-options">${polosHtml}</div>
      </div>
    `;
  }

  function ocultarLocusEtapa2() {
    const c = document.getElementById("locus-d4-container");
    if (c) c.innerHTML = "";
  }

  // =========================================================
  //  DIMENSÃO 3 — AUTOESTIMA
  // =========================================================

  function renderizarDimensao3() {
    const dados = window.Dados.dim3;
    const perguntasHtml = dados.perguntas
      .map((p) => renderizarPerguntaTrifurcada(p, "dim3"))
      .join("");

    document.getElementById("autoestima-content").innerHTML = `
      <div class="card">
        <div class="card-title">
          Autoestima
          <span class="badge">Dimensão 3 · Bateria da vontade</span>
        </div>
        <div class="card-subtitle">
          Energia psicológica disponível ao paciente para mobilizar qualquer
          esforço de mudança. Pré-condição estrutural para a estratégia
          comunicacional.
        </div>
        <div class="card-quote">
          "Sem autoestima não vale a pena viver, porque a boa vida está
          fundamentada na dignidade." — Borrell Carrió (2012, p. 161)
        </div>
        ${_miniGlossarioInline(dados)}

        ${perguntasHtml}

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;gap:.75rem">
          <button class="btn btn-ghost" onclick="App.voltarParaLocus()">← Voltar</button>
          <button class="btn btn-primary" onclick="App.classificarAutoestima()">
            Classificar autoestima →
          </button>
        </div>
      </div>
    `;
  }

  // =========================================================
  //  DIMENSÃO 4 — AUTOEFICÁCIA
  // =========================================================

  function renderizarDimensao4() {
    const dados = window.Dados.dim4;
    const estado = window.State.get();

    // Caso especial: alvo não explorado → tela explicativa, sem perguntas.
    if (estado.sinalizacoes.dim4_indisponivel) {
      document.getElementById("autoeficacia-content").innerHTML = `
        <div class="card">
          <div class="card-title">
            Autoeficácia tarefa-específica
            <span class="badge">Dimensão 4 · Indisponível</span>
          </div>
          <div class="card-subtitle">
            Esta etapa foi automaticamente sinalizada como indisponível.
          </div>

          <div class="alert alert-info" style="margin-top:1rem">
            <span>
              <strong>Autoeficácia indisponível.</strong>
              O objetivo terapêutico não foi explorado em consulta — os dados
              necessários para a classificação tarefa-específica não foram
              gerados pela consulta atual. A informação será convertida em
              pauta pedagógica direta no módulo de Reflexão.
            </span>
          </div>

          <div style="margin-top:1.5rem;display:flex;justify-content:space-between;gap:.75rem">
            <button class="btn btn-ghost" onclick="App.voltarParaAutoestima()">← Voltar</button>
            <button class="btn btn-primary" onclick="App.classificarAutoeficacia()">
              Avançar para resultado →
            </button>
          </div>
        </div>
      `;
      return;
    }

    // Caso normal: 3 perguntas com [DOMÍNIO] substituído.
    const dominio_str = rotuloDominio(estado.passo_0.dominio);

    const perguntasHtml = dados.perguntas
      .map((p) => renderizarPerguntaTrifurcada(p, "dim4", {
        substituir_dominio: dominio_str,
      })).join("");

    // Quadro lateral do Comportamento — quando preenchido.
    const comportamentoHtml = (estado.passo_0.comportamento || "").trim()
      ? `<div class="comportamento-lateral">
           <div class="comportamento-lateral-rotulo">Comportamento descrito pelo residente</div>
           <div class="comportamento-lateral-texto">"${escapar(estado.passo_0.comportamento)}"</div>
         </div>`
      : "";

    document.getElementById("autoeficacia-content").innerHTML = `
      <div class="card">
        <div class="card-title">
          Autoeficácia tarefa-específica
          <span class="badge">Dimensão 4 · Crença na própria capacidade</span>
        </div>
        <div class="card-subtitle">
          Crença do paciente na sua capacidade de executar o objetivo
          terapêutico do Passo 0. Construto tarefa-específico em fidelidade
          a Bandura (1997).
        </div>
        ${_miniGlossarioInline(dados)}

        ${comportamentoHtml}

        ${perguntasHtml}

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;gap:.75rem">
          <button class="btn btn-ghost" onclick="App.voltarParaAutoestima()">← Voltar</button>
          <button class="btn btn-primary" onclick="App.classificarAutoeficacia()">
            Classificar autoeficácia →
          </button>
        </div>
      </div>
    `;
  }

  // =========================================================
  //  RESULTADO — placeholder Fase 3.B
  //  Substituído pela apresentação completa na Fase 3.D
  // =========================================================

  // =========================================================
  //  RESULTADO FINAL — Fase 3.D
  //
  //  Consome o objeto retornado por Classify.compor(state, Dados)
  //  e renderiza a tela final com todos os blocos: Perfil,
  //  Pré-condição (se houver), Estratégia, Próxima consulta (se
  //  houver), A evitar (se houver), Alertas, Sugestão de abertura,
  //  Glossário e Reflexão.
  //
  //  Este é o ponto onde a saída do motor (objeto estruturado)
  //  encontra o DOM (HTML estilizado).
  // =========================================================

  // Renderiza um único bloco do motor como card secundário.
  // Recebe { id, titulo, texto, citacao_final? } e produz HTML.
  function _htmlBlocoMotor(bloco) {
    if (!bloco) return "";
    const tituloHtml = bloco.titulo
      ? `<div class="bloco-rotulo">${escapar(bloco.titulo)}</div>`
      : "";
    const citacaoHtml = bloco.citacao_final
      ? `<div style="font-size:.78rem;color:var(--slate-400);font-style:italic;margin-top:.5rem">${escapar(bloco.citacao_final)}</div>`
      : "";
    return `
      ${tituloHtml}
      <div style="font-size:.95rem;line-height:1.65;color:var(--slate-100);margin-bottom:1rem">
        ${escapar(bloco.texto)}
      </div>
      ${citacaoHtml}
    `;
  }

  // Renderiza o Bloco 1 — Perfil classificado em formato dl.
  // Decisão deliberada (L8 da Fase 3.C): tabela <dl> em vez de
  // bullets. Mais legível em tela e em PDF; alinhamento consistente.
  function _htmlBlocoPerfil(estado, dados, perfil) {
    const dim1Nome = perfil.dim1
      ? (dados.dim1.niveis[perfil.dim1] || {}).nomenclatura_completa || perfil.dim1
      : "(não classificado)";
    const dim2Nome = perfil.dim2
      ? (dados.dim2.polos[perfil.dim2] || {}).nomenclatura_completa || perfil.dim2
      : "(não classificado)";
    const dim3Nome = perfil.dim3
      ? (dados.dim3.polos[perfil.dim3] || {}).nomenclatura_completa || perfil.dim3
      : "(não classificado)";
    const dim4Nome = perfil.dim4
      ? (dados.dim4.polos[perfil.dim4] || {}).nomenclatura_completa || perfil.dim4
      : "(não classificado)";
    const dominioStr = rotuloDominio(perfil.dominio, false);
    const concordanciaStr = rotuloConcordancia(perfil.concordancia);

    return `
      <div class="bloco-rotulo">Perfil classificado</div>
      <dl class="perfil-resumo">
        <dt>Domínio</dt>      <dd>${escapar(dominioStr)}</dd>
        <dt>Concordância</dt> <dd>${escapar(concordanciaStr || "—")}</dd>
        <dt>Pirâmide</dt>     <dd>${escapar(dim1Nome)}</dd>
        <dt>Locus</dt>        <dd>${escapar(dim2Nome)}</dd>
        <dt>Autoestima</dt>   <dd>${escapar(dim3Nome)}</dd>
        <dt>Autoeficácia</dt> <dd>${escapar(dim4Nome)}</dd>
      </dl>
    `;
  }

  // Renderiza o quadro lateral do Comportamento ou a linha
  // discreta de modo simplificado.
  function _htmlComportamentoOuModoSimplificado(estado, resultado) {
    const comp = (estado.passo_0.comportamento || "").trim();
    if (comp) {
      return `
        <div class="comportamento-lateral">
          <div class="comportamento-lateral-rotulo">Comportamento descrito pelo residente</div>
          <div class="comportamento-lateral-texto">"${escapar(comp)}"</div>
        </div>
      `;
    }
    // Linha discreta — texto canônico aprovado na Fase 3.A.
    // Não há motivo de duplicar com o rodapé do motor; só mostra
    // se o motor não previu (defesa).
    return "";
  }

  // Renderiza o Bloco 6 (Glossário) extraindo apenas as técnicas
  // mencionadas pelo motor compositivo (via marcação em fragmentos,
  // não regex — Ponto 3 aprovado na Fase 3.A).
  function _htmlGlossario(tecnicas, dados) {
    if (!tecnicas || tecnicas.length === 0) return "";

    // Achata o índice de técnicas: percorre todas as modalidades
    // do glossario.json e cria mapa id → entrada.
    const indice = {};
    const modalidades = (dados.glossario || {}).modalidades || {};
    for (const modKey of Object.keys(modalidades)) {
      const mod = modalidades[modKey];
      (mod.tecnicas || []).forEach((t) => { indice[t.id] = t; });
    }

    // Resolve cada técnica usada e renderiza como item expansível.
    // NOTA: a 'indicação' (campo t.indicacao) NÃO é mais renderizada
    // — decisão de 3.D v2 conforme item 1 do feedback de uso real:
    // o campo é contraintuitivo porque a ferramenta já fez o trabalho
    // de indicar a técnica. Texto preservado no glossario.json para
    // futura reutilização (ex.: tela de "modo aprendizagem"), mas
    // ausente da renderização do Bloco 6.
    const itens = tecnicas.map((id) => {
      const t = indice[id];
      if (!t) return ""; // técnica desconhecida — silenciosamente ignora
      const referenciaHtml = t.referencia
        ? `<div style="font-size:.74rem;color:var(--slate-500);margin-top:.4rem;font-style:italic">${escapar(t.referencia)}</div>`
        : "";
      return `
        <details style="background:var(--slate-900);border:1px solid var(--slate-800);
                        border-radius:var(--radius-sm);padding:.75rem 1rem;margin:.5rem 0">
          <summary style="cursor:pointer;color:var(--slate-100);font-weight:600;font-size:.92rem">
            ${escapar(t.nome)}
          </summary>
          <div style="font-size:.88rem;line-height:1.6;color:var(--slate-200);margin-top:.5rem">
            ${escapar(t.definicao)}
          </div>
          ${referenciaHtml}
        </details>
      `;
    }).join("");

    return `
      <div class="bloco-rotulo">Glossário das técnicas mencionadas</div>
      <div style="font-size:.82rem;color:var(--slate-400);margin-bottom:.5rem">
        Apenas as técnicas mencionadas no resultado desta consulta. Clique para expandir.
      </div>
      ${itens}
    `;
  }

  // Renderiza bloco <details> "Sinais clínicos registrados" — auditoria
  // pelo preceptor das justificativas marcadas durante a captura.
  // Adicionado em 3.D v2 conforme item 3 do feedback de uso real.
  // Agrupado por dimensão e dentro da dimensão por pergunta-síntese.
  // Colapsado por padrão para não poluir a leitura padrão.
  function _htmlSinaisRegistrados(estado, dados) {
    // Coleta sinais de todas as 4 dimensões + Pirâmide.
    // Estrutura final: { rotuloDimensao: { rotuloPergunta: [textos...] } }
    const grupos = {};

    // Helper: insere um sinal no grupo apropriado.
    function inserir(rotuloDim, perguntaId, rotuloPergunta, textoSinal) {
      if (!grupos[rotuloDim]) grupos[rotuloDim] = {};
      const chavePergunta = `${perguntaId} — ${rotuloPergunta}`;
      if (!grupos[rotuloDim][chavePergunta]) grupos[rotuloDim][chavePergunta] = [];
      grupos[rotuloDim][chavePergunta].push(textoSinal);
    }

    // Dim 1 — Pirâmide. Sinais não são marcados via sinais_marcados;
    // são as próprias respostas binárias dos blocos A/B/C marcadas como true.
    const respPiramide = (estado.respostas_camada_2 || {}).dim1 || {};
    const blocosPiramide = (dados.dim1 || {}).blocos || [];
    blocosPiramide.forEach((bloco) => {
      (bloco.perguntas || []).forEach((p) => {
        if (respPiramide[p.id] === true) {
          inserir("Pirâmide da Mudança",
                  p.id,
                  p.rotulo_curto || p.pergunta,
                  "Sim — " + (p.pergunta));
        }
      });
    });

    // Dims 2, 3, 4 — sinais marcados.
    const dimensoes = [
      { chave: "dim2", rotulo: "Locus de Controle", json: dados.dim2 },
      { chave: "dim3", rotulo: "Autoestima",         json: dados.dim3 },
      { chave: "dim4", rotulo: "Autoeficácia",       json: dados.dim4 },
    ];

    // Index pergunta_id → rotulo curto, varrendo as estruturas de cada JSON.
    function indexarPerguntas(jsonDim) {
      const idx = {};
      (jsonDim.perguntas || []).forEach((p) => {
        idx[p.id] = p.pergunta_sintese || p.pergunta || p.id;
      });
      // Locus tem etapa1.perguntas e etapa2.pergunta
      if (jsonDim.etapa1) {
        (jsonDim.etapa1.perguntas || []).forEach((p) => {
          idx[p.id] = p.pergunta_sintese || p.pergunta || p.id;
        });
      }
      if (jsonDim.etapa2 && jsonDim.etapa2.pergunta) {
        const p = jsonDim.etapa2.pergunta;
        idx[p.id] = p.pergunta_sintese || p.pergunta || p.id;
      }
      return idx;
    }

    dimensoes.forEach(({ chave, rotulo, json }) => {
      const sinais = ((estado.sinais_marcados || {})[chave]) || [];
      if (sinais.length === 0) return;
      const idx = indexarPerguntas(json || {});
      sinais.forEach((s) => {
        inserir(rotulo, s.pergunta_id, idx[s.pergunta_id] || s.pergunta_id, s.texto);
      });
    });

    // Se nada foi registrado, omite o bloco silenciosamente.
    if (Object.keys(grupos).length === 0) return "";

    // Renderiza grupos.
    const gruposHtml = Object.keys(grupos).map((rotuloDim) => {
      const perguntas = grupos[rotuloDim];
      const perguntasHtml = Object.keys(perguntas).map((chavePerg) => {
        const textos = perguntas[chavePerg];
        const itensTexto = textos.map((t) =>
          `<li style="margin:.2rem 0">${escapar(t)}</li>`
        ).join("");
        return `
          <div style="margin:.6rem 0 .8rem 0">
            <div style="font-family:var(--font-mono);font-size:.7rem;
                        color:var(--slate-400);letter-spacing:.05em;margin-bottom:.25rem">
              ${escapar(chavePerg)}
            </div>
            <ul style="margin:0;padding-left:1.2rem;color:var(--slate-200);
                       font-size:.85rem;line-height:1.5">
              ${itensTexto}
            </ul>
          </div>
        `;
      }).join("");
      return `
        <div style="margin:.75rem 0 1rem 0">
          <div style="font-family:var(--font-mono);font-size:.72rem;
                      letter-spacing:.1em;text-transform:uppercase;
                      color:var(--amber-400);margin-bottom:.4rem">
            ${escapar(rotuloDim)}
          </div>
          ${perguntasHtml}
        </div>
      `;
    }).join("");

    return `
      <details style="margin:1rem 0;padding:.75rem 1rem;
                      background:var(--slate-900);border:1px solid var(--slate-800);
                      border-radius:var(--radius-sm)">
        <summary style="cursor:pointer;color:var(--slate-100);font-weight:600;font-size:.92rem">
          Sinais clínicos registrados
          <span style="font-weight:400;color:var(--slate-400);font-size:.82rem">
            — para auditoria preceptor-residente
          </span>
        </summary>
        <div style="margin-top:.5rem">
          ${gruposHtml}
        </div>
      </details>
    `;
  }

  // Renderiza o Bloco 7 (Reflexão para preceptoria).
  function _htmlReflexao(reflexao) {
    if (!reflexao) return "";

    // Camadas fixas (A, B, C) — sempre presentes.
    const camadasFixasHtml = (reflexao.camadas_fixas || []).map((camada) => `
      <div style="margin-top:1rem">
        <div style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.1em;
                    text-transform:uppercase;color:var(--amber-400);margin-bottom:.4rem">
          Camada ${escapar(camada.id)} — ${escapar(camada.nome)}
        </div>
        <ul style="margin:0;padding-left:1.2rem;color:var(--slate-200);
                   font-size:.9rem;line-height:1.65">
          ${camada.perguntas.map((p) => `<li style="margin:.4rem 0">${escapar(p)}</li>`).join("")}
        </ul>
      </div>
    `).join("");

    // Camada variável — D1: omitir se vazia E sem exceção.
    let variavelHtml = "";
    if (!reflexao.omitir_camada_variavel && reflexao.camada_variavel.perguntas.length > 0) {
      variavelHtml = `
        <div style="margin-top:1.25rem">
          <div style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.1em;
                      text-transform:uppercase;color:var(--amber-400);margin-bottom:.4rem">
            ${escapar(reflexao.camada_variavel.titulo)}
          </div>
          <ul style="margin:0;padding-left:1.2rem;color:var(--slate-200);
                     font-size:.9rem;line-height:1.65">
            ${reflexao.camada_variavel.perguntas.map((p) =>
              `<li style="margin:.4rem 0">${escapar(p.pergunta)}</li>`
            ).join("")}
          </ul>
        </div>
      `;
    }

    // Perguntas por exceção — Sec 11.4
    let excecaoHtml = "";
    if (reflexao.perguntas_por_excecao && reflexao.perguntas_por_excecao.length > 0) {
      excecaoHtml = `
        <div style="margin-top:1.25rem">
          <div style="font-family:var(--font-mono);font-size:.7rem;letter-spacing:.1em;
                      text-transform:uppercase;color:var(--amber-400);margin-bottom:.4rem">
            Dirigidas pela situação especial
          </div>
          <ul style="margin:0;padding-left:1.2rem;color:var(--slate-200);
                     font-size:.9rem;line-height:1.65">
            ${reflexao.perguntas_por_excecao.map((p) =>
              `<li style="margin:.4rem 0">${escapar(p.pergunta)}</li>`
            ).join("")}
          </ul>
        </div>
      `;
    }

    return `
      <div class="bloco-rotulo">Reflexão para preceptoria</div>
      <div style="font-size:.82rem;color:var(--slate-400);margin-bottom:.75rem;line-height:1.5">
        Perguntas para a sessão de preceptoria, organizadas em camadas.
        As três camadas fixas examinam o raciocínio, a conduta e a ética
        da consulta. Quando aplicável, perguntas específicas do caso ou
        dirigidas por situação especial são acrescentadas.
      </div>
      ${camadasFixasHtml}
      ${variavelHtml}
      ${excecaoHtml}
    `;
  }

  function renderizarResultadoFinal() {
    const estado = window.State.get();
    const dados = window.Dados;

    // Chama o motor compositivo (Fase 3.C).
    const resultado = window.Classify.compor(estado, dados);
    // Chama o selector da Reflexão (Fase 3.D.1).
    const reflexao = window.Classify.selecionarReflexao(estado, dados);

    // Constrói o HTML em ordem dos blocos retornados pelo motor.
    const blocosMotorHtml = resultado.blocos
      .map((b) => _htmlBlocoMotor(b))
      .join("");

    // Quadro lateral do Comportamento (sempre que preenchido).
    const comportamentoHtml = _htmlComportamentoOuModoSimplificado(estado, resultado);

    // Bloco de auditoria — sinais clínicos registrados durante a captura.
    // Colapsado por padrão; pensado para revisão preceptor-residente.
    // Adicionado em 3.D v2 (item 3 do feedback de uso real).
    const sinaisRegistradosHtml = _htmlSinaisRegistrados(estado, dados);

    // Glossário a partir da lista de técnicas que o motor entregou.
    const glossarioHtml = _htmlGlossario(resultado.tecnicas_para_glossario, dados);

    // Reflexão.
    const reflexaoHtml = _htmlReflexao(reflexao);

    document.getElementById("resultado-content").innerHTML = `
      <div class="card">
        <div class="card-title">Resultado da Lógica de Recomendação Comunicacional</div>
        <div class="card-subtitle">
          Orientação estruturada para a próxima consulta com este paciente,
          composta pelas quatro dimensões classificadas. A leitura sequencial
          dos blocos acompanha a hierarquia da Lógica de Recomendação.
        </div>

        ${_htmlBlocoPerfil(estado, dados, resultado.perfil)}

        ${comportamentoHtml}

        ${blocosMotorHtml}

        ${sinaisRegistradosHtml}

        ${glossarioHtml}

        ${reflexaoHtml}

        <div class="divider"></div>

        <div style="margin-top:1.5rem;display:flex;justify-content:space-between;gap:.75rem;flex-wrap:wrap">
          <button class="btn btn-ghost" onclick="App.voltarParaAutoeficacia()">← Voltar</button>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-ghost" onclick="window.print()" title="Imprimir ou salvar como PDF">
              ⎙ Imprimir / PDF
            </button>
            <button class="btn btn-primary" onclick="App.reiniciar()">
              Reiniciar com novo paciente
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Mantém função antiga como alias para compatibilidade transitória
  // (qualquer código que ainda chame renderizarResultadoPlaceholder
  // será redirecionado para a renderização final).
  function renderizarResultadoPlaceholder() {
    return renderizarResultadoFinal();
  }

  return {
    escapar,
    selecionarSecao,
    atualizarProgress,
    renderizarPasso0,
    atualizarSelecaoDominio,
    atualizarSelecaoConcordancia,
    atualizarBotaoAvancarPasso0,
    renderizarDimensao1,
    atualizarChecagemPiramide,
    renderizarDimensao2,
    renderizarLocusEtapa2,
    ocultarLocusEtapa2,
    renderizarDimensao3,
    renderizarDimensao4,
    renderizarResultadoPlaceholder,
    renderizarResultadoFinal,
    exibirErroValidacao,
    limparErroValidacao,
  };
})();

window.Render = Render;
