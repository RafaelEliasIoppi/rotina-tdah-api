/**
 * Página de Política de Privacidade servida como HTML simples em GET /privacy.
 * Conteúdo isolado neste módulo para manter app.js enxuto.
 */

const LAST_UPDATED = '11 de julho de 2026';
const CONTACT_EMAIL = 'rafaelioppi@gmail.com';
const RESPONSIBLE_NAME = 'Rafael Elias Ioppi';

export function renderPrivacyPolicyHtml() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Política de Privacidade — Rotina Diária: Apoio TDAH</title>
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    line-height: 1.6;
    color: #1f2933;
    background: #fafafa;
    max-width: 760px;
    margin: 0 auto;
    padding: 32px 20px 80px;
  }
  h1 {
    font-size: 1.75rem;
    margin-bottom: 4px;
  }
  h2 {
    font-size: 1.2rem;
    margin-top: 2em;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 4px;
  }
  p, li {
    font-size: 1rem;
  }
  ul {
    padding-left: 1.4em;
  }
  .updated {
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 2em;
  }
  .notice {
    background: #fff3cd;
    border: 1px solid #ffe08a;
    border-radius: 6px;
    padding: 12px 16px;
    font-size: 0.9rem;
  }
  a { color: #2b6cb0; }
  footer {
    margin-top: 3em;
    font-size: 0.85rem;
    color: #666;
  }
</style>
</head>
<body>
  <h1>Política de Privacidade</h1>
  <p class="updated">Última atualização: ${LAST_UPDATED}</p>

  <p>
    Esta Política de Privacidade descreve como o aplicativo <strong>Rotina Diária — Apoio TDAH</strong>
    ("app", "nós") coleta, usa e protege os dados dos usuários. Ao usar o app, você concorda
    com os termos descritos aqui.
  </p>

  <h2>1. Quem é o responsável pelo app</h2>
  <p>
    O app é desenvolvido e mantido por <strong>${RESPONSIBLE_NAME}</strong>, atuando como
    controlador dos dados pessoais tratados nos termos da Lei Geral de Proteção de Dados
    (LGPD — Lei nº 13.709/2018).
  </p>

  <h2>2. Quais dados coletamos</h2>
  <p>Coletamos apenas os dados necessários para o funcionamento do app:</p>
  <ul>
    <li>
      <strong>Cadastro por email e senha:</strong> nome (opcional), email e senha.
      A senha nunca é armazenada em texto puro — utilizamos hash criptográfico (bcrypt)
      e não temos acesso à senha original em nenhum momento.
    </li>
    <li>
      <strong>Login via Google:</strong> se você optar por entrar com sua conta Google,
      recebemos do Google seu nome, email e foto de perfil, conforme o padrão do
      Google Sign-In. Não temos acesso à sua senha do Google.
    </li>
    <li>
      <strong>Dados de uso do app:</strong> a rotina diária que você configura (tarefas,
      horários, blocos do dia) e o histórico de conclusão dessas tarefas (usado para
      calcular seu progresso e sequências/streaks). Quando você não está logado, esses
      dados ficam apenas no seu dispositivo (armazenamento local). Quando você está
      logado, esses dados são sincronizados com nosso servidor para que você possa
      acessá-los em outros aparelhos.
    </li>
    <li>
      <strong>Dados de assinatura (Plano Premium):</strong> se você assina o plano
      Premium, armazenamos apenas o status da sua assinatura e identificadores internos
      do Stripe (por exemplo, se o plano está ativo). <strong>Nunca armazenamos dados de
      cartão de crédito</strong> — o pagamento é processado inteiramente pelo Stripe,
      nosso processador de pagamentos.
    </li>
  </ul>
  <p>
    Não coletamos dados de localização, contatos, câmera, microfone, nem qualquer dado
    além do necessário para as funcionalidades descritas acima.
  </p>

  <h2>3. Para que usamos seus dados</h2>
  <ul>
    <li>Criar e autenticar sua conta;</li>
    <li>Sincronizar sua rotina e histórico de tarefas entre dispositivos;</li>
    <li>Calcular seu progresso (anel de progresso, streaks) dentro do app;</li>
    <li>Processar e gerenciar sua assinatura do plano Premium, quando aplicável;</li>
    <li>Comunicações essenciais sobre sua conta (ex.: confirmação de cadastro).</li>
  </ul>
  <p>
    <strong>Não usamos seus dados para publicidade, não vendemos dados a terceiros e não
    utilizamos rastreadores de terceiros ou redes de anúncios dentro do app.</strong>
  </p>

  <h2>4. Com quem compartilhamos dados</h2>
  <p>Compartilhamos dados apenas com prestadores de serviço estritamente necessários para operar o app:</p>
  <ul>
    <li>
      <strong>Google</strong> — utilizado apenas para autenticação (login com Google),
      conforme os termos de privacidade do próprio Google.
    </li>
    <li>
      <strong>Stripe</strong> — processador de pagamentos responsável pelo checkout,
      cobrança recorrente e portal de gerenciamento de assinatura do plano Premium.
      O Stripe processa e armazena os dados de pagamento (cartão de crédito) diretamente;
      nós nunca temos acesso a esses dados.
    </li>
    <li>
      <strong>Neon</strong> — provedor do banco de dados PostgreSQL gerenciado onde os
      dados da sua conta e rotina ficam armazenados, hospedado em servidores nos Estados
      Unidos (região us-east-1).
    </li>
    <li>
      <strong>Render</strong> (ou provedor de hospedagem equivalente) — infraestrutura
      onde o backend do app é executado.
    </li>
  </ul>
  <p>Não compartilhamos seus dados com nenhuma outra empresa ou terceiro para fins comerciais.</p>

  <h2>5. Armazenamento e segurança</h2>
  <p>
    Seus dados são armazenados em um banco de dados PostgreSQL gerenciado (Neon), hospedado
    nos Estados Unidos. Senhas são protegidas com hash bcrypt. Tomamos medidas razoáveis de
    segurança técnica e organizacional para proteger seus dados contra acesso não autorizado,
    perda ou alteração.
  </p>

  <h2>6. Seus direitos e como excluir sua conta</h2>
  <p>
    Você tem direito a acessar, corrigir ou excluir seus dados pessoais a qualquer momento,
    conforme a LGPD. Para solicitar a exclusão da sua conta e de todos os dados associados
    a ela, entre em contato pelo email abaixo informando o email cadastrado no app. Atenderemos
    à solicitação dentro de um prazo razoável.
  </p>

  <h2>7. Aviso importante sobre o conteúdo do app</h2>
  <p>
    O app <strong>Rotina Diária — Apoio TDAH</strong> é uma ferramenta educacional e de
    organização pessoal, destinada a apoiar rotinas e hábitos. Ele <strong>não realiza
    diagnóstico</strong> de TDAH ou qualquer outra condição, <strong>não substitui</strong>
    avaliação, acompanhamento ou tratamento por profissionais de saúde qualificados
    (médicos, psicólogos, etc.). Em caso de dúvidas sobre sintomas ou tratamento, procure
    um profissional de saúde.
  </p>

  <h2>8. Alterações nesta política</h2>
  <p>
    Podemos atualizar esta Política de Privacidade periodicamente. A data da última
    atualização está indicada no topo desta página. Recomendamos revisitar esta página
    ocasionalmente.
  </p>

  <h2>9. Contato</h2>
  <p>
    Em caso de dúvidas sobre esta Política de Privacidade ou sobre o tratamento dos seus
    dados pessoais, entre em contato com o responsável pelo app:
  </p>
  <ul>
    <li><strong>Responsável:</strong> ${RESPONSIBLE_NAME}</li>
    <li><strong>Email:</strong> <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a></li>
  </ul>

  <footer>
    Rotina Diária — Apoio TDAH · Política de Privacidade · ${LAST_UPDATED}
  </footer>
</body>
</html>
`;
}

export default renderPrivacyPolicyHtml;
