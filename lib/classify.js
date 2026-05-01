// =============================================================
//  ComunicaMFC — Motor de classificação e composição
//
//  Estado de implementação:
//    Fase 3.A → ESQUELETO
//    Fase 3.B → CALCULADORES DAS DIMENSÕES
//    Fase 3.C → MOTOR COMPOSITIVO (este arquivo, atual)
//    Fase 3.D → renderização das saídas (ainda em render.js)
// =============================================================

const Classify = (function () {

  // === HELPERS ================================================

  function contarPolos(respostas, ids) {
    const contagem = { A: 0, B: 0, C: 0, N: 0 };
    const polos_efetivos = [];
    ids.forEach((id) => {
      const polo = respostas[id];
      if (polo && contagem[polo] !== undefined) {
        contagem[polo]++;
        if (polo !== "N") polos_efetivos.push(polo);
      }
    });
    return { contagem, polos_efetivos };
  }

  // === CALCULADORES (Fase 3.B — preservados) ==================

  function calcularDimensao1(respostas) {
    respostas = respostas || {};
    const A1 = !!respostas.A1, A2 = !!respostas.A2;
    const A3 = !!respostas.A3, A4 = !!respostas.A4;

    if (A3 && (A1 || A2 || A4)) {
      return { resultado: "N3", confirmado: true };
    }
    const suspeita_n3 = !A3 && (A1 || A2 || A4);

    const B1 = !!respostas.B1, B2 = !!respostas.B2;
    const B3 = !!respostas.B3, B4 = !!respostas.B4;
    const contagemB = [B1, B2, B3, B4].filter(Boolean).length;

    if (contagemB >= 2) {
      const ret = { resultado: "N2", confirmado: true };
      if (suspeita_n3) {
        ret.alerta = "Suspeita de Nível 3 detectada no Bloco A " +
          "(critério parcial). A classificação atual em Nível 2 deve " +
          "ser revisada se persistirem sinais de resistência em " +
          "consultas futuras.";
      }
      return ret;
    }

    const C1 = !!respostas.C1, C2 = !!respostas.C2, C3 = !!respostas.C3;
    const contagemC = [C1, C2, C3].filter(Boolean).length;

    if (contagemC >= 2) {
      const ret = { resultado: "N1", confirmado: true };
      if (suspeita_n3) {
        ret.alerta = "Suspeita de Nível 3 detectada no Bloco A " +
          "(critério parcial). A classificação atual em Nível 1 deve " +
          "ser revisada se persistirem sinais de resistência em " +
          "consultas futuras.";
      }
      return ret;
    }

    return {
      resultado: "N2",
      confirmado: false,
      provisorio: true,
      alerta: "Classificação provisória: nenhum dos três blocos " +
        "atingiu critério de confirmação. Nível 2 adotado por " +
        "máxima cautela — ambivalência é o estado mais comum em APS. " +
        "Sinalize para revisão na próxima consulta.",
    };
  }

  function calcularDimensao2Etapa1(respostas) {
    respostas = respostas || {};
    const { contagem } = contarPolos(respostas, ["D1", "D2", "D3"]);

    if (contagem.A >= 2) return { resultado: "Interno", precisa_d4: false };
    if (contagem.B >= 2) return { resultado: "Misto", precisa_d4: false };
    if (contagem.C >= 2) return { resultado: "Externo", precisa_d4: true };

    const a = contagem.A, b = contagem.B, c = contagem.C, n = contagem.N;
    if (a === 1 && b === 1 && c === 1) return { resultado: "Misto", precisa_d4: false };
    if (a === 1 && c === 1 && n === 1) return { resultado: "Misto", precisa_d4: false };
    if (b === 1 && c === 1 && n === 1) return { resultado: "Externo", precisa_d4: true, rota_especial: true };
    if (a === 1 && b === 1 && n === 1) return { resultado: "Misto", precisa_d4: false };

    const max = Math.max(a, b, c);
    if (max === 0) return { resultado: "indeterminado", precisa_d4: false };
    if (a === max && a > b && a > c) return { resultado: "Interno", precisa_d4: false };
    if (c === max && c > a && c > b) return { resultado: "Externo", precisa_d4: true };
    return { resultado: "Misto", precisa_d4: false };
  }

  function calcularDimensao2Etapa2(respostaD4) {
    if (respostaD4 === "Alianca") return { resultado: "Externo-Aliança" };
    if (respostaD4 === "Fatalista") return { resultado: "Externo-Fatalista" };
    if (respostaD4 === "MistoExterno") return { resultado: "Externo-misto" };
    return { resultado: "Externo-misto", erro: "resposta D4 ausente ou inválida" };
  }

  function calcularDimensao3(respostas) {
    respostas = respostas || {};
    const { contagem } = contarPolos(respostas, ["E1", "E2", "E3"]);
    if (contagem.A >= 2) return { resultado: "Preservada" };
    if (contagem.C >= 2) return { resultado: "Comprometida" };
    if (contagem.B >= 2) return { resultado: "Parcial" };
    if (contagem.A + contagem.B + contagem.C >= 2) return { resultado: "Parcial" };
    return { resultado: "indeterminado",
             erro: "Respostas insuficientes para classificar Autoestima." };
  }

  function calcularDimensao4(respostas, sinalizacoes) {
    sinalizacoes = sinalizacoes || {};
    if (sinalizacoes.dim4_indisponivel) {
      return { resultado: "Indisponível",
               motivo: "alvo não explorado em consulta" };
    }
    respostas = respostas || {};
    const { contagem } = contarPolos(respostas, ["F1", "F2", "F3"]);

    if (respostas.F2 === "N") {
      const c2 = { A: 0, B: 0, C: 0 };
      ["F1", "F3"].forEach((id) => {
        const p = respostas[id];
        if (p && c2[p] !== undefined) c2[p]++;
      });
      if (c2.A === 2) return { resultado: "Alta", f2_na: true };
      if (c2.C === 2) return { resultado: "Baixa", f2_na: true };
      if (c2.B >= 1) return { resultado: "Moderada", f2_na: true };
      if (c2.A === 1 && c2.C === 1) return { resultado: "Moderada", f2_na: true };
      return { resultado: "indeterminado", f2_na: true,
               erro: "Respostas insuficientes para classificar Autoeficácia." };
    }

    if (contagem.A >= 2) return { resultado: "Alta" };
    if (contagem.C >= 2) return { resultado: "Baixa" };
    if (contagem.B >= 2) return { resultado: "Moderada" };
    if (contagem.A + contagem.B + contagem.C >= 2) return { resultado: "Moderada" };
    return { resultado: "indeterminado",
             erro: "Respostas insuficientes para classificar Autoeficácia." };
  }

  // =========================================================
  //  DETECÇÃO DE SITUAÇÕES ESPECIAIS — Sec 9.6 (completa)
  // =========================================================

  function detectarSituacaoEspecial(state) {
    if (!state) return null;
    if (state.passo_0 && state.passo_0.concordancia === "nao_explorado") return 1;
    if (state.dimensao_3 === "Comprometida" && state.dimensao_1 !== "N3") return 2;
    if (state.passo_0 && state.passo_0.concordancia === "nao") return 3;
    if (state.dimensao_2 === "Externo-misto" &&
        (state.dimensao_3 === "Parcial" || state.dimensao_4 === "Moderada")) return 4;
    return null;
  }

  // =========================================================
  //  MOTOR COMPOSITIVO — Sec 9.2-9.6 do canônico v1.3
  //
  //  Função principal: compor(state, dados) → resultado_estruturado
  //
  //  resultado_estruturado tem a forma:
  //    {
  //      blocos: [ { id, titulo, texto, tecnicas_mencionadas }, ... ],
  //      ordem: [ ...ids dos blocos na ordem extraída da L7... ],
  //      tecnicas_para_glossario: [ ...ids do glossario, deduplicados... ],
  //      situacao_especial: 1|2|3|4|null,
  //      modo_simplificado: bool,
  //      perfil: { dim1, dim2, dim3, dim4, com nomenclatura completa }
  //    }
  //
  //  O motor não toca DOM; quem renderiza é Render (Fase 3.D).
  // =========================================================

  // ---- Helpers internos ao motor --------------------------

  // Dado o array de fragmentos do JSON, devolve só os dicts (filtra
  // os comentários string que organizam o arquivo).
  function _fragmentosReais(dadosFragmentos) {
    return (dadosFragmentos.fragmentos || [])
      .filter((f) => typeof f === "object" && f !== null);
  }

  // Verifica se um fragmento se aplica ao state.
  function _aplicavel(fragmento, state) {
    const cond = fragmento.aplicavel_quando || {};
    const sit = state._situacao_especial; // cacheado

    // dim1, dim2, dim3, dim4: igualdade exata
    for (const k of ["dim1", "dim2", "dim3", "dim4"]) {
      if (cond[k] !== undefined && state["dimensao_" + k.slice(3)] !== cond[k]) return false;
    }
    // dim1_negado, dim2_negado, etc.: dimensao não pode ser o valor
    for (const k of ["dim1_negado", "dim2_negado", "dim3_negado", "dim4_negado"]) {
      if (cond[k] !== undefined &&
          state["dimensao_" + k.slice(3, 4)] === cond[k]) return false;
    }
    // concordancia: igualdade exata
    if (cond.concordancia !== undefined &&
        (state.passo_0 || {}).concordancia !== cond.concordancia) return false;
    // situacao_especial: igualdade exata
    if (cond.situacao_especial !== undefined &&
        sit !== cond.situacao_especial) return false;
    // situacao_especial_negada: array de números — sit não pode estar dentro
    if (cond.situacao_especial_negada !== undefined &&
        Array.isArray(cond.situacao_especial_negada) &&
        cond.situacao_especial_negada.includes(sit)) return false;
    // comportamento_vazio
    if (cond.comportamento_vazio !== undefined) {
      const vazio = !((state.passo_0 || {}).comportamento || "").trim();
      if (cond.comportamento_vazio !== vazio) return false;
    }
    return true;
  }

  // Encontra o fragmento aplicável de uma categoria (ou null).
  function _frag(categoria, dadosFragmentos, state) {
    return _fragmentosReais(dadosFragmentos).find(
      (f) => f.categoria === categoria && _aplicavel(f, state)
    ) || null;
  }

  // Encontra todos os fragmentos aplicáveis de uma categoria.
  function _frags(categoria, dadosFragmentos, state) {
    return _fragmentosReais(dadosFragmentos).filter(
      (f) => f.categoria === categoria && _aplicavel(f, state)
    );
  }

  // Substituição de placeholders.
  // Recebe texto + map { PLACEHOLDER: valor }.
  function _substituir(texto, mapa) {
    if (!texto) return texto;
    let resultado = texto;
    for (const [chave, valor] of Object.entries(mapa)) {
      const re = new RegExp("\\[" + chave + "\\]", "g");
      resultado = resultado.replace(re, valor);
    }
    return resultado;
  }

  // Retorna o rótulo do domínio em minúsculas (uso mid-frase).
  function _dominioMidFrase(state, dados) {
    const id = (state.passo_0 || {}).dominio;
    if (!id) return "[domínio]";
    const opc = ((dados.passo0 || {}).campos || {}).dominio
      ? dados.passo0.campos.dominio.opcoes.find((o) => o.id === id) : null;
    return opc ? opc.rotulo.toLowerCase() : id;
  }

  // Retorna "a [domínio]" gramaticalmente, com artigo definido lowercase.
  // Para os 4 domínios canônicos, todos são femininos no português ("a mudança",
  // "a adesão", "a decisão", "outro/a"). Default: "a".
  function _dominioComArtigo(state, dados) {
    const lower = _dominioMidFrase(state, dados);
    return "a " + lower;
  }

  // Resolve placeholders [LOCUS_DESCRITIVO] e [ESTRATEGIA_BASE_NOME]
  // para o template do "Próxima consulta" da L5.
  //
  // Reformulado em 3.D v2: os antigos [NIVEL_NOMEADO] e [LOCUS_NOMEADO]
  // produziam jargão interno do CLIPP na saída ao residente
  // (ex.: "executar persuasão motivacional do Nível 2 com modulação
  // Misto"). A substituição por descritivos clínicos vem da tabela
  // _LOCUS_DESCRITIVO_TABELA carregada do fragmentos.json — fonte
  // única da verdade. Editor que precisar reformular descritivo de um
  // polo edita o JSON, não código.
  function _resolverPlaceholdersTemplate(state, dados) {
    const tabela = (dados.fragmentos || {})._LOCUS_DESCRITIVO_TABELA || {};
    const locusDescritivo = tabela[state.dimensao_2] || "";

    const repBase = _frag("repertorio_base", dados.fragmentos, state);
    const estrategiaBaseNome = repBase ? repBase.estrategia_base_nome : "estratégia-base";

    return {
      LOCUS_DESCRITIVO: locusDescritivo,
      ESTRATEGIA_BASE_NOME: estrategiaBaseNome,
    };
  }

  // === Etapas hierárquicas (Sec 9.2-9.5 do canônico) =======

  // 9.2 — seleção de repertório a partir da Pirâmide.
  function selecionarRepertorio(state, dados) {
    return _frag("repertorio_base", dados.fragmentos, state);
  }

  // 9.3 — pré-condição a partir da Autoestima.
  function aplicarPrecondicao(state, dados) {
    return _frag("precondicao", dados.fragmentos, state);
  }

  // 9.4 — modulação de voz/âncoras a partir do Locus.
  function modularVozEAncoras(state, dados) {
    return _frag("modulacao_locus", dados.fragmentos, state);
  }

  // 9.5 — calibração da ambição a partir da Autoeficácia.
  function calibrarAmbicaoPlano(state, dados) {
    return _frag("calibracao_autoeficacia", dados.fragmentos, state);
  }

  // ---- Composição do Bloco 3 (Estratégia prioritária) ------

  function _comporBloco3(state, dados, mapaPlaceholders) {
    const sit = state._situacao_especial;

    // Sit 1: estratégia substitutiva (sit1_estrategia_entregue)
    if (sit === 1) {
      const frag = _frag("situacao_especial_1", dados.fragmentos, state);
      // Só pega o que tem titulo "Estratégia prioritária"
      const fragsSit1 = _frags("situacao_especial_1", dados.fragmentos, state);
      const fragEstrat = fragsSit1.find((f) => f.id === "sit1_estrategia_entregue");
      if (!fragEstrat) return null;
      return {
        id: "bloco_3",
        titulo: fragEstrat.titulo_bloco,
        texto: _substituir(fragEstrat.texto, mapaPlaceholders),
        tecnicas_mencionadas: fragEstrat.tecnicas_mencionadas || [],
      };
    }

    // Sit 2: estratégia substitutiva (estrategia_restauracao_autoestima)
    if (sit === 2) {
      const frag = _frag("estrategia_substitutiva", dados.fragmentos, state);
      if (!frag) return null;
      return {
        id: "bloco_3",
        titulo: frag.titulo_bloco,
        texto: _substituir(frag.texto, mapaPlaceholders),
        tecnicas_mencionadas: frag.tecnicas_mencionadas || [],
      };
    }

    // Caso normal: composição de [Repertório] + [Modulação Locus] +
    // [Calibração Autoeficácia] + [Fechamento padrão]
    const repertorio = selecionarRepertorio(state, dados);
    const modulacao = modularVozEAncoras(state, dados);
    const calibracao = calibrarAmbicaoPlano(state, dados);
    const fechamento = _frag("fechamento_bloco_3", dados.fragmentos, state);

    if (!repertorio || !modulacao) return null;

    const partes = [];
    const tecnicas = [];

    // Sentença 1: repertório + modulação ("...indicado é X, ancorados em Y.")
    partes.push(repertorio.texto + " " + modulacao.texto);
    tecnicas.push(...(repertorio.tecnicas_mencionadas || []));
    tecnicas.push(...(modulacao.tecnicas_mencionadas || []));

    // Sentença 2: calibração de Autoeficácia (independente)
    if (calibracao) {
      partes.push(calibracao.texto);
      tecnicas.push(...(calibracao.tecnicas_mencionadas || []));
    }

    // Sentença 3: fechamento padrão
    if (fechamento) {
      partes.push(_substituir(fechamento.texto, mapaPlaceholders));
    }

    return {
      id: "bloco_3",
      titulo: "Estratégia prioritária",
      texto: partes.join(" "),
      tecnicas_mencionadas: tecnicas,
    };
  }

  // ---- Composição do Bloco "A evitar" (composição tripla L6) ----

  function _comporBlocoAEvitar(state, dados, mapaPlaceholders) {
    const sit = state._situacao_especial;

    // Sit 1: A evitar é OMITIDO (Obs 1 aprovada)
    if (sit === 1) return null;

    // Sit 2: usa o fragmento dedicado verbatim (a_evitar_completo)
    if (sit === 2) {
      const frag = _frag("a_evitar_completo", dados.fragmentos, state);
      if (!frag) return null;
      return {
        id: "a_evitar",
        titulo: frag.titulo_bloco,
        texto: _substituir(frag.texto, mapaPlaceholders),
        tecnicas_mencionadas: frag.tecnicas_mencionadas || [],
      };
    }

    // Caso normal: composição tripla
    // (vetação por Nível) + (contra-modulação Locus) + (contra-cal. Autoeficácia)
    const vet = _frag("evitar_vetacao_nivel", dados.fragmentos, state);
    const cml = _frag("evitar_contramod_locus", dados.fragmentos, state);
    const cca = _frag("evitar_contracal_autoeficacia", dados.fragmentos, state);

    const partes = [];
    const tecnicas = [];

    if (vet) {
      partes.push(vet.texto);
      tecnicas.push(...(vet.tecnicas_mencionadas || []));
    }
    if (cml) {
      partes.push(cml.texto);
      tecnicas.push(...(cml.tecnicas_mencionadas || []));
    }
    if (cca) {
      partes.push(cca.texto);
      tecnicas.push(...(cca.tecnicas_mencionadas || []));
    }

    if (partes.length === 0) return null;

    // Capitaliza a primeira letra da junção e termina em ponto.
    let textoFinal = partes.join("; ");
    textoFinal = textoFinal.charAt(0).toUpperCase() + textoFinal.slice(1) + ".";

    return {
      id: "a_evitar",
      titulo: "A evitar",
      texto: textoFinal,
      tecnicas_mencionadas: tecnicas,
    };
  }

  // ---- compor() — função principal ------------------------

  function compor(state, dados) {
    // Cache da situação especial no state local (não persiste).
    const stateAumentado = Object.assign({}, state, {
      _situacao_especial: detectarSituacaoEspecial(state),
    });
    const sit = stateAumentado._situacao_especial;

    // Mapa de placeholders comuns
    const mapaPlaceholders = Object.assign(
      {
        DOMINIO_MIDFRASE: _dominioMidFrase(state, dados),
        DOMINIO_COM_ARTIGO: _dominioComArtigo(state, dados),
      },
      _resolverPlaceholdersTemplate(state, dados)
    );

    const blocos = [];
    const tecnicasSet = new Set();

    // Helper para registrar bloco e técnicas
    const registrar = (bloco) => {
      if (!bloco) return;
      blocos.push(bloco);
      (bloco.tecnicas_mencionadas || []).forEach((t) => tecnicasSet.add(t));
    };

    // BLOCO 2 — Pré-condição (condicional)
    const precond = aplicarPrecondicao(stateAumentado, dados);
    if (precond && precond.ativa_bloco_2) {
      registrar({
        id: "precondicao",
        titulo: precond.titulo_bloco,
        texto: _substituir(precond.texto, mapaPlaceholders),
        tecnicas_mencionadas: precond.tecnicas_mencionadas || [],
      });
    }

    // BLOCO 3 — Estratégia prioritária (sempre presente)
    registrar(_comporBloco3(stateAumentado, dados, mapaPlaceholders));

    // BLOCO 4 — Próxima consulta (condicional, sit 1 ou sit 2)
    if (sit === 2) {
      const px = _frag("proxima_consulta", dados.fragmentos, stateAumentado);
      if (px) {
        registrar({
          id: "proxima_consulta",
          titulo: px.titulo_bloco,
          texto: _substituir(px.texto, mapaPlaceholders),
          tecnicas_mencionadas: px.tecnicas_mencionadas || [],
        });
      }
    }

    // BLOCO 5 — A evitar (condicional, omitido em sit 1)
    registrar(_comporBlocoAEvitar(stateAumentado, dados, mapaPlaceholders));

    // BLOCO 6 — Alertas (sit 3 prioritário, alerta concordância parcial,
    // alerta pedagógico de sit 1 — em ordem)
    if (sit === 3) {
      const f = _frag("situacao_especial_3", dados.fragmentos, stateAumentado);
      if (f) {
        registrar({
          id: "alerta_sit3",
          titulo: f.titulo_bloco,
          texto: _substituir(f.texto, mapaPlaceholders),
          tecnicas_mencionadas: [],
        });
      }
    }
    if (sit === 4) {
      const f = _frag("situacao_especial_4", dados.fragmentos, stateAumentado);
      if (f) {
        registrar({
          id: "alerta_sit4",
          titulo: f.titulo_bloco,
          texto: _substituir(f.texto, mapaPlaceholders),
          tecnicas_mencionadas: [],
        });
      }
    }
    // Alerta de concordância parcial — pode coexistir com qualquer perfil
    if ((stateAumentado.passo_0 || {}).concordancia === "parcial") {
      const f = _frag("alerta_modulacao", dados.fragmentos, stateAumentado);
      if (f) {
        registrar({
          id: "alerta_concordancia_parcial",
          titulo: f.titulo_bloco,
          texto: _substituir(f.texto, mapaPlaceholders),
          tecnicas_mencionadas: [],
        });
      }
    }

    // BLOCO 7 — Sugestão de abertura (sit 1)
    if (sit === 1) {
      const fragsSit1 = _frags("situacao_especial_1", dados.fragmentos, stateAumentado);

      const fragSugestao = fragsSit1.find((f) => f.id === "sit1_sugestao_abertura");
      if (fragSugestao) {
        registrar({
          id: "sugestao_abertura",
          titulo: fragSugestao.titulo_bloco,
          texto: _substituir(fragSugestao.texto, mapaPlaceholders),
          tecnicas_mencionadas: [],
        });
      }

      // Alerta pedagógico vem na sequência (com citação de rodapé)
      const fragAlerta = fragsSit1.find((f) => f.id === "sit1_alerta_pedagogico");
      if (fragAlerta) {
        registrar({
          id: "alerta_pedagogico_sit1",
          titulo: fragAlerta.titulo_bloco,
          texto: _substituir(fragAlerta.texto, mapaPlaceholders),
          citacao_final: fragAlerta.citacao_final,
          tecnicas_mencionadas: [],
        });
      }

      // Reflexão dirigida (sit 1)
      const fragRefl = fragsSit1.find((f) => f.id === "sit1_reflexao_dirigida");
      if (fragRefl) {
        registrar({
          id: "reflexao_dirigida_sit1",
          titulo: fragRefl.titulo_bloco,
          texto: _substituir(fragRefl.texto, mapaPlaceholders),
          tecnicas_mencionadas: [],
        });
      }
    }

    // RODAPÉ — modo simplificado (linha discreta ao final)
    const modoSimpl = !((state.passo_0 || {}).comportamento || "").trim();
    if (modoSimpl) {
      const f = _frag("rodape_resultado", dados.fragmentos, stateAumentado);
      if (f) {
        registrar({
          id: "rodape_modo_simplificado",
          titulo: null,
          texto: f.texto,
          tecnicas_mencionadas: [],
        });
      }
    }

    return {
      blocos: blocos,
      tecnicas_para_glossario: Array.from(tecnicasSet),
      situacao_especial: sit,
      modo_simplificado: modoSimpl,
      perfil: {
        dominio: (state.passo_0 || {}).dominio,
        comportamento: (state.passo_0 || {}).comportamento || "",
        concordancia: (state.passo_0 || {}).concordancia,
        dim1: state.dimensao_1,
        dim2: state.dimensao_2,
        dim3: state.dimensao_3,
        dim4: state.dimensao_4,
      },
    };
  }

  // =========================================================
  //  SELECTOR DA REFLEXÃO — Sec 11.3-11.4 do canônico v1.3
  //
  //  Função pura: dado um state classificado e os dados do
  //  reflexao.json, devolve as três partes da Reflexão para
  //  preceptoria que serão renderizadas no Bloco 7.
  //
  //  Decisões D1-D2 do handler aplicadas:
  //
  //  D1 (omissão da camada variável quando nada casa).
  //  Se nenhuma regra da camada variável casar e nenhuma situação
  //  especial dispara perguntas por exceção, a Reflexão renderiza
  //  só as três camadas fixas A/B/C. Esta omissão é deliberada
  //  e está documentada no campo 'descricao' do reflexao.json
  //  e neste comentário — futuros mantenedores não devem
  //  interpretá-la como bug.
  //
  //  D2 (limite de 3 perguntas + ordem de especificidade).
  //  Quando múltiplas regras casam, suas perguntas entram numa
  //  fila ordenada por especificidade — combinação multidimen-
  //  sional vem antes de sub-orientação de dimensão; sub-orien-
  //  tação vem antes de pré-condição estrutural; pré-condição
  //  vem antes de categoria ampla. Pré-condição estrutural
  //  (Autoestima Comprometida) ficou abaixo da sub-orientação
  //  porque já tem reforço próprio via situação especial nº 2 —
  //  duplicar é redundante. Atingido o limite de 3 perguntas
  //  individuais (não 3 regras), o restante é silenciosamente
  //  descartado, sem nota meta visível.
  // =========================================================

  function selecionarReflexao(state, dados) {
    const reflexao = dados.reflexao || {};
    const sit = detectarSituacaoEspecial(state);

    const camadasFixas = reflexao.camadas_fixas || [];

    // Camada variável — aplica todas as regras que casam, ordena
    // por especificidade, achata em fila de perguntas, trunca em 3.
    const regrasVar = ((reflexao.camada_variavel || {}).regras) || [];
    const regrasCasadas = regrasVar.filter((r) => _regraCasa(r.condicao, state));
    regrasCasadas.sort((a, b) =>
      (a.ordem_especificidade || 999) - (b.ordem_especificidade || 999)
    );
    const filaPerguntas = [];
    regrasCasadas.forEach((r) => {
      (r.perguntas || []).forEach((p) =>
        filaPerguntas.push({ pergunta: p, regra_id: r.id })
      );
    });
    const limite = (reflexao.camada_variavel || {}).limite_perguntas || 3;
    const perguntasVariavel = filaPerguntas.slice(0, limite);

    // Perguntas dirigidas pelas situações especiais (Sec 11.4)
    const regrasExc = ((reflexao.perguntas_por_excecao || {}).regras) || [];
    const perguntasExcecao = regrasExc
      .filter((r) => r.situacao_especial === sit)
      .map((r) => ({ pergunta: r.pergunta, rotulo: r.rotulo }));

    // Decisão D1: se camada variável VAZIA e nenhuma exceção,
    // omitir a seção variável inteira. Camadas fixas seguem
    // sempre presentes.
    const tituloVariavel = (reflexao.camada_variavel || {}).titulo || "Específicas deste caso";

    return {
      camadas_fixas: camadasFixas,
      camada_variavel: {
        titulo: tituloVariavel,
        perguntas: perguntasVariavel,
        truncado: filaPerguntas.length > limite,
      },
      perguntas_por_excecao: perguntasExcecao,
      omitir_camada_variavel: perguntasVariavel.length === 0 && perguntasExcecao.length === 0,
    };
  }

  // Helper: testa se a condição de uma regra casa o state.
  // Cada chave da condição faz um match exato com state.dimensao_*.
  function _regraCasa(cond, state) {
    if (!cond) return true;
    if (cond.dim1 !== undefined && state.dimensao_1 !== cond.dim1) return false;
    if (cond.dim2 !== undefined && state.dimensao_2 !== cond.dim2) return false;
    if (cond.dim3 !== undefined && state.dimensao_3 !== cond.dim3) return false;
    if (cond.dim4 !== undefined && state.dimensao_4 !== cond.dim4) return false;
    return true;
  }

  // === EXPORTS ================================================
  return {
    contarPolos,
    calcularDimensao1,
    calcularDimensao2Etapa1,
    calcularDimensao2Etapa2,
    calcularDimensao3,
    calcularDimensao4,
    detectarSituacaoEspecial,
    selecionarRepertorio,
    aplicarPrecondicao,
    modularVozEAncoras,
    calibrarAmbicaoPlano,
    compor,
    selecionarReflexao,
  };
})();

if (typeof window !== "undefined") window.Classify = Classify;
if (typeof module !== "undefined" && module.exports) module.exports = Classify;
