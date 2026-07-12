/* 30 perguntas mais frequentes sobre TDAH, respondidas pelo agente especializado
   do projeto com base nas 5 obras-fonte reprocessadas (_extracted/resumo_profundo_*.md).
   Cada item cita a fonte específica (obra + capítulo/seção/passo), nunca "síntese
   clínica geral" — regra permanente do projeto. Curadoria das perguntas feita a
   partir de pesquisa web sobre as dúvidas mais buscadas/comuns sobre TDAH. */

var FAQ_ITEMS = [
  {
    q: "O que é TDAH, afinal?",
    a: "<p>O TDAH (Transtorno de Déficit de Atenção/Hiperatividade) é definido pela Cartilha ABP como um transtorno da autorregulação — não simplesmente \"falta de atenção\" — que compromete a capacidade da pessoa de controlar deliberadamente pensamentos, emoções e comportamentos por força de vontade, gerando prejuízos de curto e longo prazo.</p><p>No modelo teórico central de Barkley, o núcleo do problema não é a atenção em si, mas um déficit primário de <strong>inibição comportamental</strong>, que compromete quatro funções executivas — memória de trabalho não-verbal (\"olho da mente\"), memória de trabalho verbal (\"voz da mente\"), autocontrole emocional (\"coração da mente\") e planejamento (\"playground da mente\") — gerando o que ele chama de \"miopia do tempo\": a pessoa sabe o que fazer, mas não consegue trazer esse conhecimento para agir no momento certo.</p><p>É um transtorno do neurodesenvolvimento com forte base genética (herdabilidade de 70-80%), sem biomarcador ou exame de imagem que sozinho confirme o diagnóstico — este é sempre clínico.</p>",
    source: "Cartilha ABP (seção 1); Manual Barkley (Cap. 7); \"Vencendo o TDAH Adulto\" (Passo 2); IACAPAP (seções Etiologia e Diagnóstico)"
  },
  {
    q: "TDAH é \"falta de disciplina\" ou preguiça?",
    a: "<p>Não. A Cartilha ABP dedica uma seção a desmontar esse mito explicitamente: atribui a dificuldade ao desequilíbrio de dopamina e noradrenalina que afeta a motivação para tarefas de baixo interesse.</p><p>O modelo de Barkley explica: o problema central não é \"não saber o que fazer\" (déficit de conhecimento), mas \"não fazer o que já se sabe, no momento em que isso importa\" (déficit de desempenho). A pessoa tem inteligência e conhecimento intactos, mas desconectados do comportamento no momento certo, por falta da maquinaria executiva que traz consequências futuras para o presente.</p><p>Por ser um transtorno neurobiológico hereditário, também não é \"falta de disciplina dos pais\" — embora o ambiente influencie o manejo dos sintomas.</p>",
    source: "Cartilha ABP (seção 7, \"Mitos desmontados\"); \"Vencendo o TDAH Adulto\" (Passo 2)"
  },
  {
    q: "Quais são os sintomas principais do TDAH?",
    a: "<p>O DSM-5-TR lista 18 sintomas — 9 de desatenção (erros por descuido, dificuldade de manter foco, parecer não escutar, não terminar tarefas, desorganização, evitar esforço mental prolongado, perder objetos, distração fácil, esquecimento cotidiano) e 9 de hiperatividade-impulsividade (remexer mãos/pés, levantar-se quando deveria ficar sentado, inquietação motora, \"estar com o motor ligado\", falar demais, precipitação de respostas, dificuldade de esperar a vez, interromper os outros).</p><p>Ao longo da vida, a hiperatividade-impulsividade tende a declinar mais que a desatenção, que permanece mais estável. Em adultos, Barkley destaca cinco áreas do cotidiano mais afetadas: gestão de tempo/planejamento, auto-organização/memória operacional, autodisciplina, automotivação e autoativação/concentração.</p>",
    source: "Cartilha ABP (seção 1, Quadro 1); IACAPAP (Tabela D.1.1); \"Vencendo o TDAH Adulto\" (Passo 2)"
  },
  {
    q: "Como é feito o diagnóstico de TDAH? Existe exame de sangue ou de imagem?",
    a: "<p>Não existe exame de sangue, imagem cerebral ou EEG que diagnostique TDAH. O diagnóstico é <strong>clínico</strong>, feito por entrevista que avalia sintomas, contexto e prejuízo funcional.</p><p>Os critérios do DSM-5 exigem: pelo menos 6 de 9 sintomas de desatenção e/ou hiperatividade (5 de 9 para 17 anos ou mais); início antes dos 12 anos; duração mínima de 6 meses; presença em 2 ou mais ambientes; prejuízo funcional claro; e exclusão de outras explicações. Escalas de avaliação ajudam a organizar a coleta de informação, mas não substituem o julgamento clínico.</p><p>35 a 65% das pessoas com TDAH passam bem em testes computadorizados de atenção — um resultado \"normal\" nesses testes não descarta o diagnóstico.</p>",
    source: "IACAPAP (Tabelas D.1.3-D.1.4); Cartilha ABP (seção 2); \"Vencendo o TDAH Adulto\" (Passo 1)"
  },
  {
    q: "TDAH em adultos é diferente de TDAH em crianças?",
    a: "<p>Sim. Na pré-escola predomina o comportamento \"furacão\"; na fase escolar, desorganização e quebra de regras; na adolescência, planejamento fraco e riscos; na vida adulta, esquecimento de compromissos, falta de antecipação, inquietação subjetiva (não mais hiperatividade motora visível), decisões precipitadas e impaciência.</p><p>Os sintomas hiperativos/impulsivos diminuem mais com o desenvolvimento do que os de desatenção. O próprio ponto de corte diagnóstico muda: pesquisas mostram que em adultos 4 dos 9 sintomas já indicam prejuízo atípico (contra 6 de 9 desenhado para crianças).</p>",
    source: "IACAPAP (Tabela D.1.2); Manual Barkley (Cap. 6); \"Vencendo o TDAH Adulto\" (Passo 1)"
  },
  {
    q: "Por que tanta gente só descobre que tem TDAH depois dos 30, 40 anos?",
    a: "<p>A hiperatividade motora, mais visível na infância, diminui com a idade, enquanto a desatenção e os déficits executivos — mais discretos e mais fáceis de compensar em ambientes estruturados — permanecem, tornando o quadro menos óbvio.</p><p>É comum que os sintomas de um adulto só sejam percebidos depois que um filho é diagnosticado, dada a herdabilidade alta (75-90%). Além disso, até poucas décadas atrás o TDAH era visto como condição exclusivamente infantil — uma visão hoje descartada, mas que ainda atrasa diagnósticos.</p><p>Exigências crescentes de autogestão (faculdade, emprego, finanças, parentalidade) expõem déficits antes compensados por estrutura externa dos pais/escola.</p>",
    source: "IACAPAP (seções \"Apresentação Clínica\" e \"Curso e Prognóstico\"); Cartilha ABP (seções 4 e 6); \"Vencendo o TDAH Adulto\" (Passo 2)"
  },
  {
    q: "TDAH é genético? Passa de pai/mãe para filho?",
    a: "<p>Sim — é um dos transtornos psiquiátricos com maior carga genética conhecida. Herdabilidade entre 70% e 90% (estudos de gêmeos), com parentes de primeiro grau tendo risco 5 a 10 vezes maior. Não há \"gene único do TDAH\": múltiplos genes de efeito pequeno, cada um contribuindo um pouco.</p><p>Se um dos pais tem TDAH, 40 a 57% dos filhos biológicos também terão o transtorno — risco cerca de 8 vezes maior.</p><p>Fatores ambientais (chumbo, tabagismo materno, prematuridade) têm influência mínima comparada à genética — a associação entre tabagismo materno e TDAH, por exemplo, desaparece ao ajustar para histórico familiar de TDAH.</p>",
    source: "IACAPAP (seção \"Etiologia\"); Cartilha ABP (seção 4); \"Vencendo o TDAH Adulto\" (Passo 2)"
  },
  {
    q: "Existem \"tipos\" de TDAH (subtipos)?",
    a: "<p>Sim, o DSM-5 reconhece três apresentações: predominantemente desatenta, predominantemente hiperativa-impulsiva, e combinada. Mas esses subtipos não são muito estáveis ao longo do tempo — uma criança pode migrar de um para outro conforme a idade avança.</p><p>O tipo combinado representa cerca de 65% ou mais dos casos clínicos. O predominantemente hiperativo costuma ser um estágio inicial que evolui para combinado em 3 a 5 anos (até 90% dos casos). No predominantemente desatento, 30-50% pode, na verdade, ter algo distinto chamado \"tempo cognitivo lento\" — ainda pouco compreendido e não reconhecido como diagnóstico formal.</p>",
    source: "Cartilha ABP (seções 1 e 3); IACAPAP (seção \"Apresentação Clínica\"); \"Vencendo o TDAH Adulto\" (Passo 1)"
  },
  {
    q: "Por que pessoas com TDAH esquecem tanto as coisas?",
    a: "<p>Não é um problema de força de vontade nem de memória de longo prazo — é um déficit nas funções executivas ligadas à memória de trabalho. A memória de trabalho não-verbal (\"olho da mente\") e verbal (\"voz da mente\") retêm informações por tempo insuficiente para serem usadas no momento certo.</p><p>Barkley chama isso de \"miopia do tempo\": a pessoa tem o conhecimento intacto, mas desconectado do desempenho quando importa. Por isso a estratégia recomendada não é \"tentar lembrar mais\", e sim <strong>externalizar</strong> a informação — cadernos de bolso, lembretes visuais no ambiente, alarmes e listas.</p>",
    source: "\"Vencendo o TDAH Adulto\" (Passo 2 e Passo 4, Regra 4); Manual Barkley (Cap. 3)"
  },
  {
    q: "TDAH e ansiedade andam juntos? Como diferenciar um do outro?",
    a: "<p>Sim, a comorbidade é frequente: 25-35% em amostras clínicas segundo o Manual Barkley, chegando a 17-52% em adultos. Quanto mais tempo o TDAH passa sem tratamento, maior a chance de desenvolver ansiedade reativa ao histórico de fracasso — além de haver risco genético parcialmente compartilhado.</p><p>A diferenciação está na natureza da desatenção: no TDAH, a distração vem de desvio impulsivo por estímulos externos ou tédio da tarefa. Na ansiedade, vem de preocupação/ruminação — pensamentos intrusivos internos — e costuma estar presente em todas as situações, não só em tarefas chatas. TDAH geralmente precede e é crônico; ansiedade costuma ser mais episódica ou reativa a gatilhos.</p>",
    source: "Manual Barkley (Cap. 4 e Cap. 10, caso \"Vanessa\"); \"Vencendo o TDAH Adulto\" (Passo 5); IACAPAP (seção \"Diagnóstico Diferencial\")"
  },
  {
    q: "TDAH pode causar depressão?",
    a: "<p>Existe associação forte, mas não uma relação de causa direta simples. A comorbidade média com Depressão Maior é de 25-30%, e o risco de depressão em adultos com TDAH é mais de 3 vezes maior que na população geral. Crianças com TDAH têm 5 vezes mais chance de depressão.</p><p>A explicação mais plausível combina dois mecanismos: histórico repetido de fracasso, rejeição social e autoestima rebaixada (consequência funcional do TDAH não tratado) e risco genético parcialmente compartilhado — não uma causalidade única.</p>",
    source: "Manual Barkley (Cap. 4); \"Vencendo o TDAH Adulto\" (Passo 5); IACAPAP (seção \"Comorbidades\")"
  },
  {
    q: "O que é \"hiperfoco\" e por que acontece?",
    a: "<p>As obras-fonte do projeto não usam o termo \"hiperfoco\" diretamente, mas o fenômeno é documentado: crianças com TDAH conseguem manter foco por longos períodos em atividades de alto interesse, mesmo com grande dificuldade em tarefas de baixo interesse.</p><p>Isso se conecta a um modelo sobre dificuldade de regular o nível de engajamento quando a recompensa não é imediata. Quando a tarefa é intensamente estimulante, o sistema de recompensa fica plenamente ativado e a atenção pode ficar difícil de \"desligar\" — o inverso do problema usual de iniciar tarefas chatas.</p><p><em>Nota: esta é uma extrapolação razoável a partir do que as fontes documentam sobre variação de atenção conforme motivação, não uma citação direta de um conceito chamado \"hiperfoco\".</em></p>",
    source: "IACAPAP (seção \"Apresentação Clínica\" e modelo de Sonuga-Barke, seção \"Dados Neuropsicológicos\")"
  },
  {
    q: "Por que é tão difícil começar tarefas chatas/repetitivas com TDAH?",
    a: "<p>É um problema documentado de persistência do esforço reduzida em condições de baixo ou nenhum reforço imediato — não \"insensibilidade\" ao reforço, mas dificuldade genuína de manter esforço sem recompensa contínua e próxima no tempo.</p><p>Uma das funções executivas mais ligadas a isso é o \"coração da mente\" (autocontrole emocional): a mesma fragilidade que causa explosões emocionais dificulta gerar entusiasmo interno sem recompensa imediata. A estratégia prática recomendada é antecipar deliberadamente a emoção de sucesso e fragmentar a tarefa em blocos pequenos com recompensas a cada etapa.</p>",
    source: "Manual Barkley (Cap. 3); IACAPAP (modelo de Sonuga-Barke); \"Vencendo o TDAH Adulto\" (Passo 2, Passo 4 Regras 5 e 6)"
  },
  {
    q: "TDAH afeta o sono?",
    a: "<p>Sim, mas de forma complexa. Há mais dificuldades subjetivas relatadas pelos pais (dificuldade para adormecer em até 56% das crianças com TDAH vs. 23% em controles), mas sem alterações objetivas claras em exames de sono — os problemas de sono podem ser mais atribuíveis a comorbidades (ansiedade, depressão) do que ao TDAH isoladamente.</p><p>O sono deve sempre ser avaliado à parte, porque pode ser causa, consequência ou comorbidade do TDAH — sono ruim não tratado pode, por si só, produzir sintomas que mimetizam ou agravam o quadro.</p>",
    source: "Manual Barkley (Cap. 3, item \"Sono\"); IACAPAP (seções \"Comorbidades\" e \"Diagnóstico Diferencial\")"
  },
  {
    q: "Existe relação entre TDAH e alergias/coceira/condições atópicas?",
    a: "<p>As cinco obras-fonte do projeto não cobrem esse tema de forma substantiva — só uma menção genérica a \"alergias\" como comorbidade a rastrear no exame pediátrico, e uma frase breve do IACAPAP sobre \"condições atópicas\" sem detalhamento.</p><p><em>O restante desta resposta não vem das fontes do projeto — é conhecimento científico geral, complementar e não verificado pela base local.</em> A literatura mais ampla investiga: neuroinflamação e ativação imune compartilhada (citocinas afetando circuitos dopaminérgicos); sono prejudicado por coceira/desconforto atópico como mediador indireto; fatores de risco pré-natais compartilhados; e hipóteses preliminares sobre o eixo intestino-pele-cérebro. Nada disso estabelece causalidade — é correlação em debate ativo na pesquisa.</p>",
    source: "Manual Barkley (Cap. 8, menção genérica); IACAPAP (seção \"Comorbidades\", menção breve) — restante é conhecimento geral fora das fontes do projeto"
  },
  {
    q: "TDAH afeta relacionamentos e vida amorosa?",
    a: "<p>Sim, de forma substancial. Adultos com TDAH relatam relacionamentos de moderados a ruins com frequência 4 a 5 vezes maior, e qualidade conjugal mais que duas vezes pior que a população geral.</p><p>Três funções executivas pesam mais: regulação emocional fraca (explosões desgastam o vínculo), autoconsciência limitada (dificuldade de perceber em tempo real o efeito do próprio comportamento) e leitura de \"roteiros sociais\". Isso gera má interpretação sistemática: distração é lida como desinteresse, impulsividade como grosseria — quando são déficits executivos, não intenção.</p><p>50-70% das crianças com TDAH já não têm amigos íntimos entre a 2ª/3ª série. Tratamento medicamentoso e aplicação ativa das 8 Regras nas interações íntimas tendem a melhorar a qualidade do relacionamento.</p>",
    source: "\"Vencendo o TDAH Adulto\" (Passo 5, seção \"Relacionamentos\")"
  },
  {
    q: "O tratamento do TDAH é só remédio?",
    a: "<p>Não. O tratamento é descrito como necessariamente multimodal, combinando medicação com terapia comportamental (crianças) ou TCC (adultos) — a combinação produz os melhores resultados. Em crianças pequenas leve/moderado, começa-se por psicoeducação e treinamento parental antes de considerar medicação.</p><p>O estudo MTA mostrou vantagem estatística da medicação sobre o tratamento comportamental isolado nos sintomas centrais, mas o tratamento combinado leva vantagem em desfechos secundários (habilidades sociais, satisfação dos pais) e permite doses menores de remédio. Em adultos, a medicação tem papel mais central, mas terapia complementar pode ajudar com relacionamentos e hábitos acumulados.</p>",
    source: "Cartilha ABP (seção 9); IACAPAP (Tabela D.1.8); Manual Barkley (Cap. 20); \"Vencendo o TDAH Adulto\" (Passo 3)"
  },
  {
    q: "Como funciona o metilfenidato (Ritalina/Concerta) no cérebro?",
    a: "<p>O metilfenidato bloqueia a recaptação pré-sináptica de dopamina e noradrenalina, aumentando a disponibilidade desses neurotransmissores nas regiões executivas do cérebro. A dopamina está ligada a planejamento e processamento de recompensa; a noradrenalina modula excitação e atenção — funções tipicamente deficitárias no TDAH.</p><p>A Ritalina de liberação imediata age em 20-60 minutos, com duração de 3-6h; o Concerta usa liberação prolongada ao longo do dia, com duração de 10-14h. O medicamento corrige o desequilíbrio, não apenas \"mascara\" os sintomas.</p>",
    source: "Manual Barkley (Cap. 17); IACAPAP (seção \"Neurobiologia\" e Tabela D.1.5); \"Vencendo o TDAH Adulto\" (Passo 3)"
  },
  {
    q: "Remédio para TDAH vicia?",
    a: "<p>Usado de forma correta e prescrita, não. Mais de 16 estudos longitudinais não encontraram associação entre uso oral prescrito de estimulantes e maior risco de abuso de substâncias posterior — a via oral libera dopamina de forma gradual, bem diferente do abuso por via intranasal/intravenosa (picos rápidos), que é o mecanismo do vício.</p><p>Uma metanálise mostrou risco de abuso de substâncias reduzido em quase 2 vezes em quem foi tratado com estimulante na infância, comparado a quem não foi tratado. Isso não elimina o risco de uso indevido do medicamento em si (desvio, venda) — famílias com histórico de abuso de substâncias devem conversar com o médico sobre formulações de longa ação, com menor potencial de abuso.</p>",
    source: "\"Vencendo o TDAH Adulto\" (Passo 3); Manual Barkley (Cap. 17 e 22); Cartilha ABP (seção 7, \"Mitos desmontados\")"
  },
  {
    q: "Quais os efeitos colaterais mais comuns da medicação?",
    a: "<p>Para estimulantes: insônia, perda de apetite, perda de peso, dores de cabeça, náusea, ansiedade, irritabilidade e tiques motores — geralmente leves, dose-dependentes e transitórios, manejáveis por ajuste de dose. Estimulantes podem reduzir a altura adulta final em até 4cm, efeito reversível após suspensão, por isso é feito monitoramento periódico de peso/altura.</p><p>Para atomoxetina (não estimulante): náusea, boca seca, tontura, sonolência, redução da libido, com risco raro de dano hepático. Grandes estudos não mostraram associação relevante entre estimulantes e morte súbita cardíaca. Qualquer efeito persistente deve ser reportado ao médico prescritor.</p>",
    source: "Manual Barkley (Cap. 17 e 18); IACAPAP (Tabelas D.1.7 e D.1.8); \"Vencendo o TDAH Adulto\" (Passo 3)"
  },
  {
    q: "Dá para tratar TDAH sem remédio?",
    a: "<p>Depende da gravidade e da idade. Treinamento comportamental parental é primeira linha para crianças menores com sintomas leves, mas seu benefício mais consistente está na qualidade da parentalidade e em comorbidades, não necessariamente nos sintomas centrais do TDAH.</p><p>O estudo MTA mostrou que o tratamento comportamental isolado foi estatisticamente inferior à medicação nos sintomas centrais. Em adultos, não há evidência robusta de que terapia sozinha (sem medicação) seja eficaz para o núcleo dos sintomas, embora ajude a lidar com consequências acumuladas. A decisão de tratar com ou sem remédio é sempre uma conversa a ter com o médico responsável.</p>",
    source: "IACAPAP (Tabela D.1.8); Manual Barkley (Caps. 12, 13, 14, 15 e 20); \"Vencendo o TDAH Adulto\" (Passo 3)"
  },
  {
    q: "Terapia ajuda no TDAH? Que tipo de terapia é indicada?",
    a: "<p>Sim, mas com papel diferente da medicação — não ataca diretamente os sintomas centrais, e sim as consequências e habilidades ao redor deles. Para crianças: treinamento dos pais em manejo comportamental, aconselhamento a professores e treino de habilidades sociais.</p><p>Para adultos, a Terapia Cognitivo-Comportamental (TCC) é a modalidade com melhor suporte, com ganhos em organização, gestão do tempo e regulação emocional. Terapia breve também é recomendada especificamente para processar as reações emocionais ao diagnóstico (negação, alívio, tristeza, raiva pelo tempo perdido) — reações descritas como normais e passageiras.</p>",
    source: "Cartilha ABP (seção 9); Manual Barkley (Caps. 12-16); IACAPAP (Tabela D.1.8); \"Vencendo o TDAH Adulto\" (Passo 2 e Passo 4)"
  },
  {
    q: "Existe \"cura\" para o TDAH?",
    a: "<p>Não. Nenhuma das fontes usa o termo \"cura\" — todas tratam o TDAH como condição neurobiológica de base genética (herdabilidade de 70-90%) que se maneja, não se cura.</p><p>Aos 25 anos, 15% dos casos de infância ainda preenchem todos os critérios diagnósticos completos, até 65% têm sintomas residuais com algum prejuízo, e 20% não apresentam mais sintomas nem prejuízo — remissão completa acontece numa minoria, e mesmo assim não é reversão da condição de base, é compensação/maturação.</p><p>Barkley usa a analogia da rampa para cadeira de rodas: buscar adaptações (medicação, rotinas externalizadas) não é \"cura\" nem desculpa, é o equivalente funcional de uma rampa — o trabalho de \"subir\" ainda é da pessoa, mas com as ferramentas certas se torna administrável.</p>",
    source: "IACAPAP (seções \"Etiologia\" e \"Curso e Prognóstico\"); Cartilha ABP (seções 4 e 7); \"Vencendo o TDAH Adulto\" (Passo 2)"
  },
  {
    q: "Por quanto tempo precisa tomar remédio para TDAH?",
    a: "<p>Não há prazo fixo definido — não existem diretrizes baseadas em evidência sobre quando parar. A boa prática é reavaliação periódica (anual, por exemplo) da necessidade de continuar; muitos pacientes se beneficiam de continuar até a idade adulta, já que o TDAH costuma ter curso crônico.</p><p>Para adultos, o uso contínuo (7 dias por semana, o ano todo, incluindo fins de semana e férias) costuma ser recomendado, já que os prejuízos afetam todas as áreas da vida, não só trabalho/estudo. Em crianças, a prática de \"férias da medicação\" nos fins de semana é debatida, sem benefício claro comprovado sobre altura final. A decisão de suspender é sempre feita com o médico responsável.</p>",
    source: "IACAPAP (seção \"Questões Clínicas Especiais\"); \"Vencendo o TDAH Adulto\" (Passo 3); Manual Barkley (Cap. 17)"
  },
  {
    q: "Por que rotina e listas ajudam tanto quem tem TDAH?",
    a: "<p>O déficit nas funções executivas (memória de trabalho não-verbal e verbal) dificulta manter regras, prazos e planos \"vivos\" na cabeça — não por falta de saber o que fazer, mas porque a informação não fica disponível no momento de agir.</p><p>A solução é a <strong>externalização</strong>: tirar a informação de dentro da mente e colocá-la fisicamente no ambiente, no ponto exato onde será usada — listas, alarmes, cadernos de bolso. Rotina reduz ainda a quantidade de decisões a cada momento, porque o comportamento passa a ser guiado por hábito/contexto em vez de depender da autorregulação interna, que é o recurso mais escasso.</p>",
    source: "Manual Barkley (Cap. 7); \"Vencendo o TDAH Adulto\" (Passo 4, Regra 4)"
  },
  {
    q: "Pessoas com TDAH podem ter sucesso profissional?",
    a: "<p>Sim, plenamente. O ponto central não é capacidade, e sim adequação entre o tipo de trabalho/ambiente e o perfil de funcionamento executivo. Certos tipos de carreira tendem a ser mais compatíveis (estrutura clara, retorno imediato, variedade, urgência que dispensa planejamento longo), mas isso são tendências, não regras — qualquer carreira pode funcionar com o suporte certo.</p><p>Suportes eficazes incluem: supervisor solidário, ambiente físico adaptado (escritório privado em vez de open space), horários fixos para checar e-mail, mentor para check-ins curtos e medicação bem ajustada. Não há relação entre TDAH e menor inteligência.</p>",
    source: "\"Vencendo o TDAH Adulto\" (Passo 5, seção \"Trabalho\")"
  },
  {
    q: "TDAH é \"modinha\"/está sendo diagnosticado demais hoje em dia?",
    a: "<p>A prevalência de TDAH não aumentou nas últimas décadas nem varia significativamente entre culturas ou épocas — o que mudou foi o maior reconhecimento profissional e social, levando mais pessoas a buscar avaliação. Relatos clínicos compatíveis existem desde 1775, o que derruba a ideia de \"transtorno das telas\".</p><p>Isso não significa ausência de risco de sobre-diagnóstico individual: a popularidade do TDAH adulto trouxe mitos sem base científica e pressão social por diagnóstico. Um estudo citado mostrou a taxa de confirmação diagnóstica caindo de 85% para 50% dos encaminhados ao longo do tempo, atribuída a maior rigor na avaliação — não a menos casos reais.</p>",
    source: "IACAPAP (seção \"Epidemiologia\"); Cartilha ABP (seção \"Mitos desmontados\"); Manual Barkley (Cap. 11)"
  },
  {
    q: "Como lidar com procrastinação crônica no TDAH?",
    a: "<p>A procrastinação é consequência direta da \"miopia temporal\": tarefas com prazo distante não geram urgência real até estarem quase vencidas. A estratégia específica de Barkley é a Regra 6 — \"Decomponha o futuro\": fragmentar o projeto em blocos pequenos (30-60 minutos), tornar-se responsável perante alguém que cobra cada mini-etapa, e recompensar-se imediatamente a cada cota concluída.</p><p>Complementarmente, visualizar ativamente a emoção de sucesso ao concluir (não o medo do fracasso) funciona como combustível motivacional, junto com lembretes físicos no ambiente para reduzir a dependência de \"lembrar\" sozinho de retomar o trabalho.</p>",
    source: "\"Vencendo o TDAH Adulto\" (Passo 4, Regras 5 e 6; conceito de miopia temporal no Passo 2); Manual Barkley (Cap. 7)"
  },
  {
    q: "TDAH tem relação com inteligência (é sinal de menos inteligência)?",
    a: "<p>Não há ligação direta. O TDAH ocorre em todo o espectro de QI. Existe uma pequena redução média de QI em crianças com TDAH (cerca de 7-10 pontos), mas em adultos avaliados clinicamente esse efeito praticamente desaparece — QI médio próximo ou acima da média geral. O QI explica menos de 14% da variância no desempenho acadêmico de adolescentes com TDAH.</p><p>O mito de \"menos inteligência\" vem do baixo desempenho escolar gerado pelo transtorno, mal interpretado como \"burrice\" — quando é um problema de desempenho (não fazer o que já se sabe no momento certo), não de capacidade. O mito oposto (\"TDAH é sinal de mais criatividade/inteligência\") também não tem base científica.</p>",
    source: "Cartilha ABP (seção \"Mitos desmontados\"); Manual Barkley (Cap. 11, Cap. 2/3); IACAPAP (metanálise de Frazier et al., 2004)"
  },
  {
    q: "Como uma pessoa com TDAH pode se organizar melhor no trabalho/estudos?",
    a: "<p>O núcleo prático são as 8 Regras de autogestão: externalizar lembretes (caderno de bolso sempre à mão, cartazes nos pontos de decisão), fragmentar tarefas grandes em blocos de 30-60 minutos com prestação de contas e recompensa por etapa, externalizar a resolução de problemas (post-its, quadros, listas físicas em vez de segurar tudo na mente), e antecipar emocionalmente o resultado.</p><p>No estudo: técnica de leitura SQ4R, gravar aulas, alternar matérias difíceis com leves, exercício aeróbico antes de provas (ganho de concentração dura 45-60 minutos). No trabalho: espaço físico privado, horários fixos para e-mail, notificações silenciadas em blocos de foco, notas ativas em reuniões, e negociar explicitamente expectativas de prazo e supervisão ao escolher um cargo.</p>",
    source: "\"Vencendo o TDAH Adulto\" (Passo 4, Regras 4, 5, 6 e 7; Passo 5, seções \"Educação\" e \"Trabalho\")"
  }
];

export { FAQ_ITEMS };
