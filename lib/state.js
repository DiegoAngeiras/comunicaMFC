// =============================================================
//  ComunicaMFC — State global
//  Estrutura conforme Seção 3.3 do canônico v1.3.
//  Esquema serializável (preparado para futura camada de
//  persistência sem refatoração).
// =============================================================

const State = (function () {
  // Estado inicial — todas as classificações nulas; sinais vazios.
  function criarEstadoInicial() {
    return {
      // Metadados — habilitam futuro registro longitudinal sem
      // mudar o esquema agora.
      meta: {
        versao_canonico: "1.3",
        timestamp_inicio: null,
        timestamp_atualizacao: null,
      },

      // Passo 0 — identificação do comportamento-alvo.
      passo_0: {
        dominio: null,           // id do domínio (passo0.json)
        comportamento: "",       // texto livre, opcional
        concordancia: null,      // "sim" | "parcial" | "nao" | "nao_explorado"
        alvos_secundarios: [],   // strings livres
      },

      // Quatro dimensões classificatórias.
      dimensao_1: null,          // "N1" | "N2" | "N3" (com sufixo "_provisorio" se inconcluso)
      dimensao_2: null,          // "Interno" | "Misto" | "Externo-Aliança" | "Externo-Fatalista" | "Externo-misto"
      dimensao_3: null,          // "Preservada" | "Parcial" | "Comprometida"
      dimensao_4: null,          // "Alta" | "Moderada" | "Baixa" | "Indisponível"

      // Sinais marcados pelo residente, organizados por dimensão.
      // Cada entrada: { dimensao, pergunta_id, polo, texto }
      sinais_marcados: {
        dim1: [],
        dim2: [],
        dim3: [],
        dim4: [],
      },

      // Respostas das perguntas-síntese (Camada 2).
      // Para a Pirâmide, registra as confirmações por bloco/pergunta.
      // Para as demais, registra o polo escolhido por pergunta.
      respostas_camada_2: {
        dim1: {},   // { A1: true|false, A2: ..., B1: ..., C1: ... }
        dim2: {},   // { D1: "A"|"B"|"C", D2: ..., D3: ..., D4: "Alianca"|"Fatalista"|"MistoExterno" }
        dim3: {},   // { E1: "A"|"B"|"C", E2: ..., E3: ... }
        dim4: {},   // { F1: "A"|"B"|"C", F2: "A"|"B"|"C"|"N", F3: "A"|"B"|"C" }
      },

      // Sinalizações derivadas do Passo 0 e da classificação.
      // Calculadas pelo motor; aqui só existem como cache.
      sinalizacoes: {
        dim4_indisponivel: false,
        situacao_especial_ativa: null,  // 1 | 2 | 3 | 4 | null
        modo_simplificado: false,       // true quando comportamento livre vazio
      },
    };
  }

  // Instância única (sessão única, sem persistência por enquanto).
  let _estado = criarEstadoInicial();

  // === API pública ============================================

  function get() {
    return _estado;
  }

  function reset() {
    _estado = criarEstadoInicial();
    _estado.meta.timestamp_inicio = new Date().toISOString();
    _estado.meta.timestamp_atualizacao = _estado.meta.timestamp_inicio;
    return _estado;
  }

  function atualizar(caminho, valor) {
    // Atualiza um caminho aninhado tipo "passo_0.dominio".
    const partes = caminho.split(".");
    let alvo = _estado;
    for (let i = 0; i < partes.length - 1; i++) {
      if (alvo[partes[i]] === undefined) {
        throw new Error(`Caminho inválido no state: ${caminho}`);
      }
      alvo = alvo[partes[i]];
    }
    alvo[partes[partes.length - 1]] = valor;
    _estado.meta.timestamp_atualizacao = new Date().toISOString();
    return _estado;
  }

  function marcarSinal(dim, pergunta_id, polo, texto) {
    if (!_estado.sinais_marcados[dim]) {
      throw new Error(`Dimensão inválida: ${dim}`);
    }
    _estado.sinais_marcados[dim].push({
      pergunta_id,
      polo,
      texto,
      timestamp: new Date().toISOString(),
    });
    return _estado;
  }

  function desmarcarSinal(dim, pergunta_id, texto) {
    if (!_estado.sinais_marcados[dim]) return _estado;
    _estado.sinais_marcados[dim] = _estado.sinais_marcados[dim].filter(
      (s) => !(s.pergunta_id === pergunta_id && s.texto === texto)
    );
    return _estado;
  }

  function registrarRespostaCamada2(dim, pergunta_id, valor) {
    if (!_estado.respostas_camada_2[dim]) {
      throw new Error(`Dimensão inválida: ${dim}`);
    }
    _estado.respostas_camada_2[dim][pergunta_id] = valor;
    _estado.meta.timestamp_atualizacao = new Date().toISOString();
    return _estado;
  }

  function serializar() {
    return JSON.stringify(_estado, null, 2);
  }

  function carregar(jsonString) {
    _estado = JSON.parse(jsonString);
    return _estado;
  }

  return {
    get,
    reset,
    atualizar,
    marcarSinal,
    desmarcarSinal,
    registrarRespostaCamada2,
    serializar,
    carregar,
  };
})();

// Exposição global (sem ES modules para preservar compatibilidade
// com `file://` durante o desenvolvimento).
window.State = State;
