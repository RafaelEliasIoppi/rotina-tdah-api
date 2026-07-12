# Canais de distribuição e venda além da Play Store

> Contexto: app Android vai para a Play Store 100% grátis (sem tela de pagamento interna, por exigência de Play Billing). Já existe um APK paralelo, distribuído fora da Play Store, que mantém checkout Stripe (R$ 9,90/mês). Este documento mapeia onde mais vender/divulgar esse APK e a versão web (PWA), sem violar a política de nenhuma plataforma.

---

## 1. Lojas alternativas de Android (aceitam pagamento externo)

| Canal | Prós | Contras | Vale o esforço agora? |
|---|---|---|---|
| **Site próprio (APK direto)** | Já existe. Zero taxa, controle total do checkout Stripe, zero fricção de aprovação de loja. | Usuário precisa habilitar "fontes desconhecidas" — barreira de confiança para público leigo; sem descoberta orgânica (não existe "busca" te achando). | **Sim, é a base** — já está pronto, só falta divulgar. |
| **Amazon Appstore** | Aceita pagamento externo (não exige IAP da Amazon para links/contas fora do app, dependendo da categoria); alcança usuários de tablets Fire e alguns Android BR; processo de submissão simples, gratuito. | Tráfego pequeno no Brasil comparado à Play Store; ainda exige conta de desenvolvedor e revisão. | Vale, é rápido e sem custo — mas não priorizar tempo nisso agora. |
| **Samsung Galaxy Store** | Pré-instalada em todo Android Samsung (grande parcela do mercado BR); aceita billing externo em certas categorias; boa visibilidade orgânica para apps de nicho pequenos, menos concorrência que Play Store. | Processo de aprovação mais burocrático; conta de dev tem taxa única pequena; exige adaptar o APK ao SDK deles em alguns casos. | Segunda prioridade — mercado Samsung é grande no Brasil. |
| **APKPure / APKMirror / F-Droid** | Zero custo, zero aprovação prévia (upload direto), alcança um público específico "early adopter" que já confia em instalar fora da loja. | Marca associada a pirataria/risco na cabeça do usuário leigo (o público de TDAH que você quer não é esse nicho técnico); pouca conversão para pagamento recorrente. | Baixa prioridade — não é o público-alvo. |

**Resumo:** nenhuma loja alternativa de Android vai gerar volume relevante de instalação para um app novo e pequeno. Elas servem mais como "porto seguro" de distribuição paga fora da Play Store do que como canal de aquisição.

---

## 2. PWA como canal principal (recomendação forte)

Sim — **vale muito a pena, e provavelmente deveria ser o canal PRINCIPAL**, não secundário.

**Por quê:**
- O app já é PWA/Capacitor — a mesma base de código roda no navegador sem instalação nenhuma.
- Stripe Checkout funciona direto no navegador, sem fricção de "baixar APK desconhecido" nem espera de revisão de loja.
- Elimina 100% da taxa de 15-30% que qualquer loja cobraria — margem inteira fica com você.
- Você já tem: backend em produção, Stripe funcionando, política de privacidade pública. Ou seja, o custo incremental para vender via web é quase zero — é reaproveitar o que já existe.
- Link direto (`rotinatdah.com` ou domínio equivalente) pode ser compartilhado em bio de Instagram, grupo de WhatsApp, indicação de psicólogo — sem "que loja eu baixo isso" no meio do caminho.
- Instalável como PWA no celular (ícone na tela inicial, funciona quase como app nativo) para quem quiser.

**Contras honestos:**
- Sem exposição orgânica de "loja" (não existe alguém navegando a Play Store e esbarrando no seu app).
- Depende 100% de você levar tráfego até o link — não tem descoberta passiva.
- Público mais velho/menos digital pode estranhar "app que não é da loja".

**Conclusão:** a Play Store (grátis) serve para **credibilidade e descoberta orgânica de instalação**. O PWA + Stripe é onde a **receita realmente acontece**. São complementares, não concorrentes — a Play Store pode inclusive linkar para o site/PWA como "upgrade" fora do app (permitido, desde que não haja botão de pagamento dentro do próprio APK da Play Store).

---

## 3. Canais fora de "lojas de app"

Estes são, na prática, os canais de **maior retorno por esforço** para um fundador solo.

- **Grupos de pais/TDAH no Facebook e WhatsApp**: altíssima intenção — pais de crianças com TDAH pesquisam ativamente ferramentas. Poste como membro genuíno da comunidade (não spam), oferecendo valor (dica de rotina) antes de mencionar o app.
- **Comunidades de neurodivergência** (Reddit r/tdah_brasil, fóruns, Discord de adultos com TDAH): público adulto autodiagnosticado/diagnosticado, alta afinidade com o produto, gosta de indicar ferramentas entre si.
- **Parcerias com psicólogos/psiquiatras que atendem TDAH**: potencialmente o canal de **maior LTV e menor CAC** — um profissional que recomenda o app para pacientes gera confiança instantânea e uso continuado. Vale oferecer material de apoio (folheto, link com desconto) para eles indicarem.
- **Microinfluenciadores de TDAH no Instagram/TikTok BR**: nicho já engajado, custo baixo (permuta ou cachê pequeno), autenticidade alta. Melhor que macro/celebridade porque o público de TDAH confia mais em quem "vive aquilo" do que em publi genérica.

---

## 4. Prioridade recomendada (fundador solo, tempo limitado)

1. **PWA + Stripe via site próprio** — já pronto, zero taxa, é onde a receita deve nascer. Foco imediato: landing page clara + link de checkout fácil de compartilhar.
2. **Parcerias com psicólogos/psiquiatras** — maior retorno por hora investida; poucas conversas bem feitas podem gerar fluxo constante de indicação.
3. **Grupos de pais/comunidades de neurodivergência (orgânico, não pago)** — baixo custo, mas exige presença genuína e tempo.
4. **Play Store grátis** — mantém como já planejado, serve para credibilidade e descoberta, não para receita direta.
5. **Microinfluenciadores de nicho** — testar depois que os canais acima já validarem a mensagem/conversão.
6. **Amazon Appstore / Samsung Galaxy Store** — baixa prioridade, fazer quando sobrar tempo (upload é rápido e não custa nada, mas não é onde focar energia agora).
7. **APKPure e afins** — não priorizar, público não é o ideal para o produto.

**Regra prática**: como fundador solo, o gargalo não é "quantos canais existem", é **tempo**. Os canais 1-3 acima concentram praticamente todo o potencial de receita com o menor esforço de manutenção — vale dominar esses antes de espalhar energia em lojas alternativas de baixo retorno.
