// =============================================================
//  ComunicaMFC — Bootstrap e fluxo de navegação
//
//  Estado de implementação:
//    Fase 3.A → boot e diagnóstico
//    Fase 3.B → navegação completa entre as 6 telas (este arquivo)
//
//  Carregamento via fetch — exige servir o app via HTTP local
//  durante desenvolvimento. Em produção (GitHub Pages) funciona
//  nativamente.
// =============================================================

const App = (function () {

  // === Carregamento de dados =================================

  const ARQUIVOS_DE_DADOS = [
    { chave: "passo0",     caminho: "data/passo0.json" },
    { chave: "dim1",       caminho: "data/dimensao1.json" },
    { chave: "dim2",       caminho: "data/dimensao2.json" },
    { chave: "dim3",       caminho: "data/dimensao3.json" },
    { chave: "dim4",       caminho: "data/dimensao4.json" },
    { chave: "glossario",  caminho: "data/glossario.json" },
    { chave: "fragmentos", caminho: "data/fragmentos.json" },
    { chave: "reflexao",   caminho: "data/reflexao.json" },
  ];

  const Dados = {};

  async function carregarArquivo(arquivo) {
    try {
      const resposta = await fetch(arquivo.caminho);
      if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status} ao buscar ${arquivo.caminho}`);
      }
      const conteudo = await resposta.json();
      return { chave: arquivo.chave, conteudo, erro: null };
    } catch (erro) {
      return { chave: arquivo.chave, conteudo: null, erro: erro.message };
    }
  }

  async function carregarTodos() {
    const resultados = await Promise.all(
      ARQUIVOS_DE_DADOS.map(carregarArquivo)
    );
    const erros = [];
    resultados.forEach((r) => {
      if (r.erro) erros.push(`${r.chave}: ${r.erro}`);
      else Dados[r.chave] = r.conteudo;
    });
    return { erros };
  }

  function renderizarErroBoot(erros) {
    const passo0Cont = document.getElementById("passo0-content");
    if (!passo0Cont) return;
    passo0Cont.innerHTML = `
      <div class="card">
        <div class="card-title" style="color:var(--red-100)">
          Erro de inicialização
        </div>
        <div class="card-subtitle">
          ${erros.length} arquivo(s) com falha no carregamento.
        </div>
        <pre style="background:var(--slate-900);padding:.75rem;border-radius:var(--radius-sm);
                    font-family:var(--font-mono);font-size:.78rem;color:var(--red-100);
                    white-space:pre-wrap;margin:1rem 0">${erros.join("\n")}</pre>
        <p style="color:var(--slate-400);font-size:.85rem">
          Se você abriu o arquivo via <code>file://</code>, o browser bloqueia
          <code>fetch()</code> de arquivos locais. Sirva o projeto com um servidor
          HTTP local: <code>python3 -m http.server 8000</code> e acesse
          <code>http://localhost:8000</code>.
        </p>
      </div>
    `;
  }

  // === HANDLERS — PASSO 0 =====================================

  function selecionarDominio(id_dominio) {
    State.atualizar("passo_0.dominio", id_dominio);
    Render.atualizarSelecaoDominio(id_dominio);
  }

  function atualizarComportamento(texto) {
    State.atualizar("passo_0.comportamento", texto);
    State.atualizar("sinalizacoes.modo_simplificado", !texto.trim());
  }

  function selecionarConcordancia(id_conc) {
    State.atualizar("passo_0.concordancia", id_conc);
    State.atualizar(
      "sinalizacoes.dim4_indisponivel",
      id_conc === "nao_explorado"
    );
    Render.atualizarSelecaoConcordancia(id_conc);
  }

  function avancarDoPasso0() {
    const e = State.get();
    if (!e.passo_0.dominio || !e.passo_0.concordancia) return;
    if (!e.meta.timestamp_inicio) {
      State.atualizar("meta.timestamp_inicio", new Date().toISOString());
    }
    Render.renderizarDimensao1();
    Render.selecionarSecao("sec-piramide");
    Render.atualizarProgress(2);
  }

  // === HANDLERS — PIRÂMIDE ===================================

  function alternarPiramide(perguntaId, marcado) {
    State.registrarRespostaCamada2("dim1", perguntaId, !!marcado);
    Render.atualizarChecagemPiramide(perguntaId, marcado);
  }

  function classificarPiramide() {
    const e = State.get();
    // Validação rígida (3.D v2 item 4): pelo menos uma pergunta dos
    // blocos A/B/C precisa ter sido marcada como TRUE. O caso legítimo
    // de "nenhum sinal aplica" é tratado por handler próprio
    // (classificarPiramidePorInconclusao) — botão dedicado na UI.
    const respPiramide = e.respostas_camada_2.dim1 || {};
    const algumMarcado = Object.values(respPiramide).some((v) => v === true);
    if (!algumMarcado) {
      Render.exibirErroValidacao(
        "sec-piramide",
        "Marque pelo menos um sinal observado em algum dos blocos. Se nenhum dos sinais foi observado durante a consulta, use o botão \"Nenhum sinal observado\" abaixo."
      );
      return;
    }
    Render.limparErroValidacao("sec-piramide");

    const r = Classify.calcularDimensao1(respPiramide);
    State.atualizar("dimensao_1", r.resultado);
    if (r.alerta) State.atualizar("sinalizacoes.alerta_dim1", r.alerta);
    Render.renderizarDimensao2();
    Render.selecionarSecao("sec-locus");
    Render.atualizarProgress(3);
  }

  // Caminho explícito de inconclusão da Pirâmide (Sec 5.4 do canônico).
  // Acionado por botão dedicado quando nenhum sinal foi observado durante
  // a consulta — não pode ser confundido com classificação real. Resulta
  // em "N2 provisório por inconclusão" conforme regra do calculador.
  function classificarPiramidePorInconclusao() {
    Render.limparErroValidacao("sec-piramide");
    // Estado limpo (zera quaisquer marcações residuais antes de classificar)
    State.atualizar("respostas_camada_2.dim1", {});
    State.atualizar("sinais_marcados.dim1", []);
    const r = Classify.calcularDimensao1({});
    State.atualizar("dimensao_1", r.resultado);
    if (r.alerta) State.atualizar("sinalizacoes.alerta_dim1", r.alerta);
    Render.renderizarDimensao2();
    Render.selecionarSecao("sec-locus");
    Render.atualizarProgress(3);
  }

  function voltarParaPasso0() {
    Render.selecionarSecao("sec-passo0");
    Render.atualizarProgress(1);
  }

  // === HANDLERS — LOCUS ======================================

  function alternarSinal(dim, perguntaId, polo, marcado, elemento) {
    // Recupera o texto via DOM (label irmão do checkbox).
    const span = elemento.parentElement.querySelector("span:not(.signal-check-polo)");
    const texto = span ? span.textContent.trim() : "";
    if (marcado) {
      State.marcarSinal(dim, perguntaId, polo, texto);
    } else {
      State.desmarcarSinal(dim, perguntaId, texto);
    }
    // Toggle visual do label.
    const label = elemento.closest("label.signal-check");
    if (label) label.classList.toggle("checked", marcado);
  }

  function selecionarPolo(dim, perguntaId, polo) {
    State.registrarRespostaCamada2(dim, perguntaId, polo);

    // Atualizar visualmente os botões da pergunta
    const escopo = dim === "dim2" && perguntaId === "D4"
      ? document.getElementById("locus-d4-container")
      : document.querySelector(`[data-pergunta-id="${perguntaId}"]`);
    if (escopo) {
      escopo.querySelectorAll(".tri-option").forEach((btn) => {
        btn.classList.remove("selected-A", "selected-B", "selected-C", "selected-N");
      });
      // Encontra o botão clicado e marca conforme polo
      escopo.querySelectorAll(".tri-option").forEach((btn) => {
        const onclick = btn.getAttribute("onclick") || "";
        if (onclick.includes(`'${polo}'`)) {
          // Convenção: A → selected-A, B → selected-B, C → selected-C, N → selected-N
          // Para D4 (Alianca/Fatalista/MistoExterno) usa selected-A genérico.
          const classe = ["A", "B", "C", "N"].includes(polo)
            ? `selected-${polo}`
            : "selected-A";
          btn.classList.add(classe);
        }
      });
    }

    // Defesa contra Locus residual: se a alteração afeta D1/D2/D3,
    // re-avalia se a Etapa 2 (D4) ainda é necessária. Se a Etapa 1
    // agora resolve sem D4, oculta D4 e restaura o botão original
    // imediatamente — o residente não pode "carregar" uma resposta
    // de D4 que ficou stale por mudança nas perguntas anteriores.
    if (dim === "dim2" && ["D1", "D2", "D3"].includes(perguntaId)) {
      revalidarVisibilidadeD4();
    }
  }

  // Re-avalia se D4 deve continuar visível conforme respostas atuais
  // de D1, D2, D3. Chamada reativamente após cada seleção em D1-D3.
  function revalidarVisibilidadeD4() {
    const e = State.get();
    const r1 = Classify.calcularDimensao2Etapa1(e.respostas_camada_2.dim2);

    const d4cont = document.getElementById("locus-d4-container");
    const d4Visivel = d4cont && d4cont.children.length > 0;

    if (d4Visivel && !r1.precisa_d4) {
      // D4 estava visível mas a nova configuração de D1-D3 não pede
      // mais desambiguação. Limpa state, esconde D4 e restaura botão.
      delete e.respostas_camada_2.dim2.D4;
      e.sinais_marcados.dim2 = (e.sinais_marcados.dim2 || [])
        .filter((s) => s.pergunta_id !== "D4");
      State.atualizar("dimensao_2", null);
      Render.ocultarLocusEtapa2();

      const btnPrincipal = document.querySelector('#locus-content .btn-primary');
      if (btnPrincipal) {
        btnPrincipal.textContent = "Classificar locus →";
        btnPrincipal.setAttribute("onclick", "App.classificarLocusEtapa1()");
      }
    }
  }

  function classificarLocusEtapa1() {
    const e = State.get();
    const respLocus = e.respostas_camada_2.dim2 || {};

    // Validação rígida (3.D v2 item 4): D1, D2, D3 obrigatórios.
    const faltando = ["D1", "D2", "D3"].filter((id) => !respLocus[id]);
    if (faltando.length > 0) {
      Render.exibirErroValidacao(
        "sec-locus",
        "Selecione sua leitura clínica para todas as perguntas obrigatórias antes de avançar (faltando: " + faltando.join(", ") + ")."
      );
      return;
    }
    Render.limparErroValidacao("sec-locus");

    const r = Classify.calcularDimensao2Etapa1(respLocus);

    if (r.precisa_d4) {
      // Mostra D4 e aguarda resposta — não avança ainda.
      Render.renderizarLocusEtapa2();
      // Substitui botão "Classificar" por "Avançar para Autoestima"
      // através de um pequeno hack: re-aproveita o handler.
      const btnPrincipal = document.querySelector('#locus-content .btn-primary');
      if (btnPrincipal) {
        btnPrincipal.textContent = "Avançar para Autoestima →";
        btnPrincipal.setAttribute("onclick", "App.classificarLocusEtapa2()");
      }
      // Rola para mostrar D4
      setTimeout(() => {
        const d4 = document.getElementById("locus-d4-container");
        if (d4) d4.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    // Sem necessidade de D4 — classificação direta.
    // Reset cirúrgico: o residente pode ter passado por D4 antes
    // (em uma classificação anterior que dava Externo) e estar
    // agora retornando com classificação Interno/Misto. Os dados
    // residuais de D4 precisam ser eliminados para que o state
    // não carregue resposta inconsistente para a Fase 3.C.
    if (e.respostas_camada_2.dim2.D4) {
      delete e.respostas_camada_2.dim2.D4;
    }
    e.sinais_marcados.dim2 = (e.sinais_marcados.dim2 || [])
      .filter((s) => s.pergunta_id !== "D4");

    // Restaura o botão da tela do Locus para "Classificar locus →"
    // caso uma passagem anterior o tenha trocado para "Avançar para
    // Autoestima →" (ver hack acima na rota com D4).
    const btnPrincipal = document.querySelector('#locus-content .btn-primary');
    if (btnPrincipal) {
      btnPrincipal.textContent = "Classificar locus →";
      btnPrincipal.setAttribute("onclick", "App.classificarLocusEtapa1()");
    }

    State.atualizar("dimensao_2", r.resultado);
    Render.ocultarLocusEtapa2();
    avancarParaAutoestima();
  }

  function classificarLocusEtapa2() {
    const e = State.get();

    // Defense-in-depth: re-roda Etapa 1 antes de aplicar Etapa 2.
    // Se as respostas atuais de D1-D3 não exigem mais D4, descarta
    // D4 e usa diretamente o resultado da Etapa 1. Isto protege
    // contra qualquer caminho que tenha conseguido burlar o reset
    // reativo de revalidarVisibilidadeD4().
    const r1 = Classify.calcularDimensao2Etapa1(e.respostas_camada_2.dim2);
    if (!r1.precisa_d4) {
      delete e.respostas_camada_2.dim2.D4;
      e.sinais_marcados.dim2 = (e.sinais_marcados.dim2 || [])
        .filter((s) => s.pergunta_id !== "D4");
      State.atualizar("dimensao_2", r1.resultado);
      Render.ocultarLocusEtapa2();
      const btnPrincipal = document.querySelector('#locus-content .btn-primary');
      if (btnPrincipal) {
        btnPrincipal.textContent = "Classificar locus →";
        btnPrincipal.setAttribute("onclick", "App.classificarLocusEtapa1()");
      }
      avancarParaAutoestima();
      return;
    }

    const respostaD4 = e.respostas_camada_2.dim2.D4;
    if (!respostaD4) {
      Render.exibirErroValidacao(
        "sec-locus",
        "Selecione sua leitura clínica para a pergunta D4 antes de avançar."
      );
      return;
    }
    Render.limparErroValidacao("sec-locus");
    const r = Classify.calcularDimensao2Etapa2(respostaD4);
    State.atualizar("dimensao_2", r.resultado);
    avancarParaAutoestima();
  }

  function avancarParaAutoestima() {
    Render.renderizarDimensao3();
    Render.selecionarSecao("sec-autoestima");
    Render.atualizarProgress(4);
  }

  function voltarParaPiramide() {
    Render.selecionarSecao("sec-piramide");
    Render.atualizarProgress(2);
  }

  // === HANDLERS — AUTOESTIMA =================================

  function classificarAutoestima() {
    const e = State.get();
    const respDim3 = e.respostas_camada_2.dim3 || {};

    // Validação rígida (3.D v2 item 4): E1, E2, E3 obrigatórios.
    const faltando = ["E1", "E2", "E3"].filter((id) => !respDim3[id]);
    if (faltando.length > 0) {
      Render.exibirErroValidacao(
        "sec-autoestima",
        "Selecione sua leitura clínica para todas as perguntas obrigatórias antes de avançar (faltando: " + faltando.join(", ") + ")."
      );
      return;
    }
    Render.limparErroValidacao("sec-autoestima");

    const r = Classify.calcularDimensao3(respDim3);
    State.atualizar("dimensao_3", r.resultado);
    Render.renderizarDimensao4();
    Render.selecionarSecao("sec-autoeficacia");
    Render.atualizarProgress(5);
  }

  function voltarParaLocus() {
    // Invalidação preventiva: ao voltar para o Locus, a
    // classificação previamente armazenada em dimensao_2 deixa de
    // ser canônica até que o residente confirme explicitamente
    // (clicando em "Classificar locus →" de novo). Isto evita o
    // bug de Locus residual em que uma classificação anterior
    // (Externo-Aliança, por exemplo) sobrevive a uma alteração de
    // D1-D3 que faria a etapa 2 nem disparar.
    State.atualizar("dimensao_2", null);
    // Re-renderiza para que as respostas marcadas em D1-D3 e o
    // botão "Classificar locus →" voltem ao estado neutro.
    Render.renderizarDimensao2();
    Render.selecionarSecao("sec-locus");
    Render.atualizarProgress(3);
  }

  // === HANDLERS — AUTOEFICÁCIA ==============================

  function classificarAutoeficacia() {
    const e = State.get();
    const respDim4 = e.respostas_camada_2.dim4 || {};

    // Validação rígida (3.D v2 item 4): F1, F2, F3 obrigatórios.
    // Pulada quando dim4_indisponivel está sinalizado (sit. especial 1)
    // — neste caso não há tela de captura ativa para a Dim 4.
    if (!(e.sinalizacoes || {}).dim4_indisponivel) {
      const faltando = ["F1", "F2", "F3"].filter((id) => !respDim4[id]);
      if (faltando.length > 0) {
        Render.exibirErroValidacao(
          "sec-autoeficacia",
          "Selecione sua leitura clínica para todas as perguntas obrigatórias antes de avançar (faltando: " + faltando.join(", ") + ")."
        );
        return;
      }
    }
    Render.limparErroValidacao("sec-autoeficacia");

    const r = Classify.calcularDimensao4(
      respDim4,
      e.sinalizacoes
    );
    State.atualizar("dimensao_4", r.resultado);

    // Atualiza situação especial detectada (cache no state).
    const sit = Classify.detectarSituacaoEspecial(State.get());
    State.atualizar("sinalizacoes.situacao_especial_ativa", sit);

    Render.renderizarResultadoFinal();
    Render.selecionarSecao("sec-resultado");
    Render.atualizarProgress(6);
  }

  function voltarParaAutoestima() {
    Render.selecionarSecao("sec-autoestima");
    Render.atualizarProgress(4);
  }

  function voltarParaAutoeficacia() {
    Render.selecionarSecao("sec-autoeficacia");
    Render.atualizarProgress(5);
  }

  // === REINICIAR ============================================

  function reiniciar() {
    if (!confirm("Reiniciar a classificação? Os dados da consulta atual serão perdidos.")) {
      return;
    }
    State.reset();
    Render.renderizarPasso0();
    Render.selecionarSecao("sec-passo0");
    Render.atualizarProgress(1);
  }

  // === Inicialização ========================================

  async function iniciar() {
    State.reset();
    const relatorio = await carregarTodos();

    if (relatorio.erros.length > 0) {
      console.error("[ComunicaMFC] Falhas no carregamento:", relatorio.erros);
      renderizarErroBoot(relatorio.erros);
      return;
    }

    window.Dados = Dados;
    window.App = App;

    Render.renderizarPasso0();
    Render.atualizarProgress(1);

    console.info(
      "[ComunicaMFC] Fase 3.B inicializada. Quatro dimensões prontas para captura.",
      { Dados, State: State.get() }
    );
  }

  return {
    iniciar,
    Dados,

    // Handlers Passo 0
    selecionarDominio,
    atualizarComportamento,
    selecionarConcordancia,
    avancarDoPasso0,

    // Handlers Pirâmide
    alternarPiramide,
    classificarPiramide,
    classificarPiramidePorInconclusao,
    voltarParaPasso0,

    // Handlers Locus
    alternarSinal,
    selecionarPolo,
    classificarLocusEtapa1,
    classificarLocusEtapa2,
    voltarParaPiramide,

    // Handlers Autoestima
    classificarAutoestima,
    voltarParaLocus,

    // Handlers Autoeficácia
    classificarAutoeficacia,
    voltarParaAutoestima,
    voltarParaAutoeficacia,

    // Reset
    reiniciar,
  };
})();

// Bootstrap automático.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", App.iniciar);
} else {
  App.iniciar();
}
