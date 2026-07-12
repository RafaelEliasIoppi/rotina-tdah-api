// "Princípio do dia": 31 textos curtos (um por dia possível do mês),
// fundamentados no Manual Barkley / Cartilha ABP-Alexa / IACAPAP (ver fontes
// por item no commit que introduziu este arquivo). Antes era um texto único
// fixo; agora muda de acordo com o dia do mês corrente.

var PRINCIPLES = [
  "O cérebro com TDAH não sustenta bem informação, tempo e motivação internamente — a solução não é \"tentar mais\", é externalizar. Este checklist é isso aplicado à sua rotina real.",
  "Prazo que só existe na sua cabeça é prazo que não existe. Coloque hora, alarme ou lembrete visível — o cérebro com TDAH reage muito mais ao que vê do que ao que \"sabe\".",
  "TDAH tem raiz genética forte, não é resultado de falta de caráter ou de má criação. Cobrar mais força de vontade de quem já está se esforçando só aumenta a frustração sem mudar o resultado.",
  "A dificuldade não é \"prestar atenção\" em geral — é sustentar atenção quando a tarefa não é interessante nem tem recompensa imediata. Torne a tarefa chata mais curta, mais visível ou com um prêmio pequeno no final.",
  "Memória de trabalho fraca significa que a informação \"escorrega\" antes de virar ação. Anotar não é frescura nem falta de inteligência — é a prótese que substitui um sistema que naturalmente falha.",
  "TDAH costuma vir com \"miopia temporal\": o futuro parece distante e pouco real, então o presente sempre ganha. Trazer a consequência futura para perto — visualizá-la, escrevê-la, antecipá-la — ajuda a competir com o impulso do agora.",
  "Antes de reagir, existe uma fração de segundo em que era possível pausar. Treinar essa pausa — contar até três, respirar, sair da sala — é treinar o músculo que o TDAH deixa mais fraco.",
  "Dificuldade para regular emoção faz parte do TDAH, não é \"drama\" ou instabilidade de caráter. Nomear o que você sente antes de agir já reduz a intensidade da resposta.",
  "Recompensa que demora não segura a atenção de um cérebro com TDAH tanto quanto recompensa imediata. Quebrar uma meta grande em pequenas vitórias com retorno rápido não é fraqueza, é estratégia.",
  "Rotina fixa não é sobre disciplina moral — é sobre reduzir decisões. Cada decisão nova gasta energia que o cérebro com TDAH já tem em menor reserva.",
  "Começar uma tarefa costuma ser mais difícil do que executá-la. Se travar antes de iniciar, tente negociar consigo mesmo só os primeiros dois minutos — o resto costuma vir mais fácil depois.",
  "Hiperfoco é a outra face do TDAH: a mesma dificuldade de regular atenção que atrapalha em tarefas chatas pode prender você por horas em algo que engancha. Use alarmes também para sair de tarefas boas demais, não só para lembrar das chatas.",
  "Trocar de atividade exige uma função executiva que o TDAH enfraquece: desligar de uma coisa para ligar em outra. Um aviso de \"faltam 5 minutos\" antes da transição facilita esse desligamento.",
  "TDAH raramente vem sozinho — ansiedade, transtorno opositor, alterações de humor e uso de substâncias são comorbidades frequentes. Se algo além da desatenção/impulsividade estiver pesando, vale investigar separadamente, não só rotular tudo como \"TDAH\".",
  "Sono ruim piora sintomas de TDAH, e TDAH também dificulta manter um sono regular — é uma via de mão dupla. Proteger horário fixo de dormir é tão parte do manejo quanto qualquer lista de tarefas.",
  "Adultos com TDAH costumam ter sido crianças com TDAH que aprenderam a mascarar sintomas, não pessoas que \"curaram\" o transtorno. Estratégias de organização continuam necessárias mesmo quando a hiperatividade visível diminuiu com a idade.",
  "Muita gente com TDAH subestima o próprio nível de dificuldade — é um viés conhecido, não falta de autocrítica. Pedir feedback de alguém próximo sobre prazos e combinados pode revelar padrões que passam despercebidos por dentro.",
  "Planejar um passo de cada vez é mais realista do que tentar visualizar o caminho inteiro de uma vez. Divida a tarefa em partes pequenas o suficiente para caber na memória de trabalho.",
  "Custo de resposta — perder algo já conquistado por não cumprir um combinado — costuma funcionar melhor do que só prometer recompensa por bom comportamento. Pequenas perdas imediatas comunicam mais do que promessas distantes.",
  "Impulsividade não é \"falta de educação\", é um freio que engata mais devagar. Ambientes com menos estímulo e menos tentação por perto reduzem a necessidade de exercer esse freio o tempo todo.",
  "Lista de tarefas na cabeça compete com tudo que está acontecendo agora, e quase sempre perde. Colocar a lista fora da cabeça — papel, app, quadro — tira essa disputa e libera espaço mental.",
  "O tratamento eficaz do TDAH costuma combinar abordagem comportamental com acompanhamento profissional — não é escolher entre \"força de vontade\" ou \"remédio\", é somar estratégias que sustentam umas às outras.",
  "Um ambiente bagunçado ou barulhento pesa mais sobre um cérebro com TDAH do que sobre outros, porque ele já gasta mais energia filtrando estímulos. Reduzir bagunça visual ao redor da tarefa é reduzir a carga que a atenção precisa carregar.",
  "Autoinstrução verbal — \"falar\" o próximo passo em voz alta ou por escrito — supre uma função interna que no TDAH tende a ser mais fraca: a voz que guia o próprio comportamento. Narrar a tarefa em voz alta pode parecer bobo, mas ajuda a manter o rumo.",
  "TDAH tem base neurobiológica, não é invenção recente nem efeito colateral de tela ou tecnologia moderna. Isso não significa que telas não atrapalhem foco — significa que o transtorno já existia muito antes delas.",
  "Comemorar o progresso pequeno junto com o grande é importante: cérebros com TDAH respondem melhor a reforço frequente do que a uma única recompensa distante no fim de um grande projeto. Marque as vitórias intermediárias, não só a linha de chegada.",
  "Colocar objetos-chave sempre no mesmo lugar visível (chaves, carteira, remédio) elimina uma decisão e uma busca que, de outra forma, consomem atenção todos os dias. Ambiente previsível poupa função executiva para o que realmente importa.",
  "Errar um prazo ou esquecer um compromisso não é evidência de \"personalidade desorganizada\" — é sintoma esperado de um transtorno reconhecido, com explicação neurobiológica. Isso não tira sua responsabilidade sobre buscar apoio, mas tira o peso da culpa moral.",
  "Em crianças, TDAH costuma aparecer mais como agitação visível; em adultos, mais como inquietação interna, procrastinação e dificuldade de organização. O transtorno muda de forma ao longo da vida, não desaparece sozinho.",
  "Dividir uma tarefa grande em etapas com prazos parciais imita, de fora, a função de planejamento que o TDAH dificulta por dentro. Cada etapa pequena vira um novo ponto de checagem e de ajuste de rota.",
  "TDAH é tratado melhor como uma condição contínua a manejar, não como um problema a resolver de uma vez. Ajustar estratégias com o tempo — não desistir na primeira que falhou — é parte esperada do processo, não sinal de fracasso."
];

/**
 * Retorna o princípio do dia correspondente à data informada (ou hoje).
 * Usa o dia do mês (1-31) como índice; meses com menos de 31 dias apenas
 * não usam os últimos itens da lista naquele mês — não há necessidade de
 * tratamento especial.
 * @param {Date} [date]
 * @returns {string}
 */
function principleForDate(date) {
  var d = date || new Date();
  var dayOfMonth = d.getDate(); // 1-31
  var index = (dayOfMonth - 1) % PRINCIPLES.length;
  return PRINCIPLES[index];
}

export { PRINCIPLES, principleForDate };
