// "Exercício do dia": 31 técnicas práticas (uma por dia possível do mês),
// derivadas dos mecanismos descritos no Manual Barkley / Cartilha ABP-Alexa /
// IACAPAP (ver fontes por item no commit que introduziu este arquivo).
// Diferente do "Princípio do dia" (reflexão/conceito), aqui cada item é uma
// AÇÃO concreta que o usuário pode fazer no próprio dia.
//
// Nota editorial: a base de conhecimento consultada não contém uma lista
// pronta de exercícios diários — estes 31 itens são uma tradução prática dos
// mecanismos documentados nas fontes (inibição comportamental, externalização,
// funções executivas, reforço imediato, custo de resposta), não citações
// literais. Não substituem acompanhamento profissional.

var EXERCISES = [
  "Antes de abrir qualquer aplicativo hoje, escreva à mão em um papel visível as 3 tarefas mais importantes do dia — não mais que 3. Externalizar a prioridade compensa a dificuldade de manter isso \"na cabeça\".",
  "Escolha uma tarefa que você vem adiando e divida-a em pelo menos 4 passos bem pequenos, cada um com verbo de ação (\"abrir o documento\", \"escrever o primeiro parágrafo\"). Passos pequenos e concretos são mais fáceis de iniciar.",
  "Configure um timer visível (celular, relógio, ou até um copo com água) para uma tarefa que você vai fazer agora. Ver o tempo passando substitui o \"sentido de tempo\" interno que costuma falhar no TDAH.",
  "Quando sentir vontade de responder algo com raiva ou impulsividade hoje, conte até 10 antes de agir ou espere ler de novo depois de 5 minutos. A pausa é um substituto externo para a inibição que não vem automaticamente.",
  "Escolha um objeto que você usa todos os dias (chaves, carteira, óculos) e defina um único lugar fixo para ele. Deixe-o lá hoje mesmo. Um \"lar\" fixo reduz a carga de memória para lembrar onde as coisas estão.",
  "Ao terminar uma tarefa hoje, dê a si mesmo uma recompensa pequena e imediata (um café, 5 minutos de algo que gosta) antes de passar para a próxima. Recompensa atrasada tem pouco efeito — o reforço precisa ser rápido.",
  "Escolha uma transição do seu dia (sair de casa, começar a trabalhar, ir dormir) e crie um alerta sonoro ou visual 10 minutos antes dela. Transições são pontos de risco de \"travar\"; um aviso externo ajuda a se preparar.",
  "Antes de começar a trabalhar hoje, guarde fisicamente (numa gaveta, outro cômodo) uma fonte de distração específica. Reduzir estímulos concorrentes no ambiente é mais eficaz do que só confiar na força de vontade.",
  "Escolha uma tarefa chata de hoje e diga em voz alta, para si mesmo, o próximo passo antes de fazê-lo. Verbalizar o passo imita a \"fala interna\" que orienta o comportamento e que costuma ser menos eficaz no TDAH.",
  "Hoje, ao perceber que está enrolando com uma tarefa, anote a hora em que começou a enrolar e a hora em que efetivamente começou. Só observar essa diferença já ajuda a construir noção real de tempo, sem se julgar.",
  "Escolha um compromisso que costuma esquecer e cadastre agora um alarme ou lembrete com o texto exato do que fazer. Lembretes automáticos substituem a memória prospectiva, um ponto fraco comum no TDAH.",
  "Antes de dormir hoje, deixe visível, perto da porta, os itens que precisa levar amanhã. Preparar à noite tira a decisão de cima da manhã, quando a autorregulação costuma estar mais fragilizada.",
  "Se hoje você perceber que está prestes a interromper alguém no meio da fala, tente segurar por 3 segundos antes de falar. Esse intervalo é treino direto de inibição de resposta.",
  "Escolha uma tarefa longa e use um bloco curto de tempo (15–25 minutos) com um intervalo garantido depois. Blocos curtos com pausa reduzem a fadiga da atenção sustentada, que se esgota mais rápido no TDAH.",
  "Hoje, ao sentir uma emoção forte, nomeie-a em voz alta ou por escrito (\"estou irritado porque isso demorou\") antes de reagir. Nomear a emoção ativa uma pausa entre sentir e agir.",
  "Escolha um cômodo ou mesa de trabalho e remova, só por hoje, tudo que não é necessário para a tarefa atual. Menos objetos no campo visual, menos \"ganchos\" para a atenção sair do lugar.",
  "Antes de sair de casa hoje, faça uma checagem verbal em voz alta dos itens essenciais (\"chave, carteira, celular\"). Rotinas verbais fixas reduzem esquecimentos recorrentes sem exigir memória perfeita.",
  "Escolha uma tarefa chata e negocie consigo mesmo um \"custo\" se não a fizer até um horário combinado (ex: não checar redes sociais até terminar). Perder algo de valor costuma motivar mais do que só \"tentar lembrar\".",
  "Hoje, ao acordar, evite checar o celular nos primeiros 10 minutos e escreva uma frase sobre como quer que o dia comece. Adiar o estímulo mais absorvente do dia dá espaço para autorregulação antes da sobrecarga.",
  "Escolha uma tarefa que você tende a fazer de forma impulsiva e escreva 2 linhas antes de começar: \"o que eu quero no final\" e \"primeiro passo\". Isso é um exercício direto de planejamento.",
  "Se hoje surgir um pensamento do tipo \"eu devia conseguir fazer isso sem ajuda\", anote-o e responda por escrito com um fato: TDAH tem base neurobiológica, não é falta de esforço. Contestar o mito por escrito ajuda a lembrar que isso não é uma falha pessoal.",
  "Escolha um horário fixo para dormir hoje e configure um alarme \"hora de desligar telas\" 30 minutos antes. Sono irregular piora diretamente atenção e controle de impulsos no dia seguinte.",
  "Hoje, ao iniciar uma tarefa, deixe visível só o material daquela tarefa específica na mesa. Reduzir pistas de outras tarefas evita a troca constante de foco.",
  "Escolha uma pessoa (parceiro, amigo, familiar, colega) e peça a ela para te lembrar de um compromisso específico hoje. Apoio social como lembrete externo é uma forma legítima de compensar déficits de memória.",
  "Se hoje você perceber que uma tarefa está tomando muito mais tempo do que devia, pare e pergunte por escrito: \"isso ainda é necessário ou eu travei em detalhe?\". Essa pausa quebra o padrão de hiperfoco improdutivo.",
  "Escolha uma meta pequena de hoje e, assim que cumprir, marque com um \"X\" visível em um papel ou aplicativo. Ver o progresso registrado dá um reforço visual imediato que a mente por si só não retém bem.",
  "Antes de uma reunião, compromisso ou conversa importante hoje, escreva 2 ou 3 pontos que quer lembrar de dizer. Isso externaliza o \"roteiro mental\" que costuma se perder no meio da fala espontânea.",
  "Hoje, ao sentir o impulso de começar uma tarefa nova antes de terminar a atual, escreva a nova ideia numa lista de \"depois\" em vez de trocar de tarefa na hora. A lista captura o impulso sem exigir força de vontade.",
  "Escolha um momento do dia para se mover fisicamente por 5 minutos (caminhar, alongar, subir escada) antes de uma tarefa que exige concentração. Atividade física breve ajuda a regular o estado de alerta.",
  "Hoje, ao terminar o dia, escreva uma coisa que deu certo, mesmo pequena — não o que faltou fazer. Fechar o dia notando progresso contraria o viés de autocrítica comum em quem convive com TDAH há anos.",
  "Escolha uma regra ou combinado que você tem com alguém e, hoje, transforme-a em um lembrete visual físico (post-it, cartaz, nota na porta) em vez de depender de lembrar sozinho. Regras visíveis no ambiente funcionam melhor."
];

/**
 * Retorna o exercício do dia correspondente à data informada (ou hoje).
 * Usa o dia do mês (1-31) como índice, mesmo esquema de principleForDate().
 * @param {Date} [date]
 * @returns {string}
 */
function exerciseForDate(date) {
  var d = date || new Date();
  var dayOfMonth = d.getDate(); // 1-31
  var index = (dayOfMonth - 1) % EXERCISES.length;
  return EXERCISES[index];
}

export { EXERCISES, exerciseForDate };
