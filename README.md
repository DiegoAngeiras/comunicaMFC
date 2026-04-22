# ComunicaMFC 💬

**Ferramenta pedagógica para o ensino da comunicação clínica na preceptoria de Medicina de Família e Comunidade (MFC).**

**[Acesse o aplicativo web aqui](https://diegoangeiras.github.io/comunicaMFC/)**

---

## Sobre o Projeto

O **ComunicaMFC** é um aplicativo web interativo desenvolvido como produto técnico do Trabalho de Conclusão de Curso (TCC) para o **Programa de Pós-Graduação em Preceptoria em Saúde do Hospital Moinhos de Vento**.

A comunicação clínica é uma competência central na prática da MFC, essencial para a aliança terapêutica e adesão ao tratamento. No entanto, seu ensino na residência médica frequentemente carece de sistematização, sendo tratado como uma "arte" subjetiva. 

Este projeto visa preencher essa lacuna, transformando o ensino da comunicação em um processo estruturado, reflexivo e auditável. O aplicativo funciona como um **guia de raciocínio clínico-relacional**, auxiliando médicos residentes (sob supervisão de preceptores) a diagnosticar o perfil comunicacional do paciente e escolher estratégias de influência interpessoal de forma intencional e ética.

## Base Teórica

O sistema de classificação é inteiramente fundamentado no **Modelo de Influência Interpessoal** descrito por **Francisco Borrell Carrió** em sua obra *Entrevista Clínica* (2012). 

> **Nota Epistemológica:** O ComunicaMFC não é um instrumento psicométrico de pontuação. Ele opera como uma árvore de decisão baseada em observação clínica e síntese interpretativa. 

O algoritmo avalia três dimensões fundamentais do paciente:
1. **Pirâmide da Mudança:** Nível de receptividade à persuasão (Nível 1, 2 ou 3).
2. **Locus de Controle:** Percepção de agência sobre a própria saúde (Interno, Misto ou Externo).
3. **Autoestima:** Energia psíquica disponível para a mudança (Preservada, Parcial ou Comprometida).

## Como Funciona

O aplicativo é estruturado em três módulos sequenciais que acompanham o fluxo de raciocínio do residente durante e após a consulta:

### Módulo 1: Diagnóstico Relacional
Através de perguntas e checklists de sinais clínicos observáveis, o residente classifica o paciente nas três dimensões teóricas. O resultado é um perfil combinado (Ex: *N2 · LC-Externo · AE-Comprometida*). As escolhas ficam registradas, tornando o raciocínio do residente visível para o preceptor.

### Módulo 2: Estratégias de Comunicação
Com base no perfil gerado, o sistema sugere um plano de ação comunicacional estratificado:
* Estratégia Prioritária (P1)
* Estratégia Secundária (P2)
* Modulações e ajustes na abordagem
* **O que evitar:** Abordagens que podem acionar resistências ou ser contraproducentes para aquele perfil específico.

### Módulo 3: Reflexão para Preceptoria
O diferencial pedagógico da ferramenta. O sistema gera um roteiro de debriefing para ser discutido entre residente e preceptor após a consulta. As perguntas abordam o diagnóstico relacional, a conduta adotada e a dimensão ética da influência, incluindo perguntas dinâmicas específicas para o perfil do paciente atendido.

## Tecnologias Utilizadas
* **HTML5, CSS3 e JavaScript (Vanilla):** Desenvolvido como uma *Single Page Application* (SPA) leve, responsiva e focada na usabilidade em ambiente ambulatorial (acessível via celular, tablet ou desktop).
* **Sem dependências externas:** O processamento do algoritmo ocorre 100% no navegador do usuário, garantindo rapidez e privacidade (nenhum dado de paciente é armazenado).

## Autoria e Créditos

* **Autor:** Diego Angeiras
* **Referência Principal:** BORRELL CARRIÓ, F. *Entrevista Clínica: Habilidades de Comunicação para Profissionais da Saúde*. Porto Alegre: Artmed, 2012.

---
