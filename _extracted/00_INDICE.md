# Índice — Base de Conhecimento TDAH

Resumos originais (resumo + tópicos + palavras-chave) construídos a partir das obras salvas em `c:\Users\rafae\projetos\psicologia\`. Nenhum arquivo aqui reproduz trechos literais extensos das obras-fonte — são sínteses próprias para estudo.

## 1. Fontes processadas — sínteses PROFUNDAS (2026-07-12, atuais)

Em 2026-07-12 as 5 fontes foram inteiramente reprocessadas com critério mais rigoroso (capítulo-a-capítulo, mais dados numéricos, mais tópicos por seção) para garantir que nenhuma obra ficasse sub-representada. Os arquivos `resumo_profundo_*.md` abaixo são a referência atual — os resumos antigos (rasos) permanecem no diretório só como histórico, não devem mais ser a fonte primária de consulta.

| # | Arquivo original | Status | Arquivo de resumo (ATUAL) |
|---|---|---|---|
| 1 | `Cartilha_TDAH_Alexa_ABP_Digital_Final.pdf` | Lida por completo (56 pág.), 12 núcleos temáticos | `resumo_profundo_cartilha_abp.md` |
| 2 | `D.1-ADHD-Portuguese-2020.pdf` (cap. IACAPAP) | Lido por completo (31 pág.), 11 núcleos temáticos + tabelas de dose completas | `resumo_profundo_iacapap.md` |
| 3 | `TDAH-Barkley-Manual.pdf` (Manual Barkley, 3ª ed.) | 22 capítulos sintetizados em profundidade (779 pág., 4 blocos) | `resumo_profundo_barkley_manual.md` |
| 4 | `Vencendo-o-TDAH-Adulto_Barkley.pdf` | Processado via OCR completo (244 pág.), 5 Passos + Apêndice + Recursos | `resumo_profundo_vencendo_tdah_adulto.md` |
| 5 | `A) Psicologia Geral.pdf` | Lida por completo (54 pág., 5 unidades), expandida com nomes/datas/conceitos | `resumo_profundo_psicologia_geral.md` |

**Nota de rigor**: síntese e paráfrase própria em todos os casos — nenhuma obra protegida por direitos autorais tem trechos literais extensos reproduzidos. Cada afirmação é rastreável à obra + capítulo/seção/passo de origem, seguindo a regra do projeto de nunca usar citação vaga tipo "síntese clínica geral".

## 2. Arquivos antigos (rasos, mantidos só como histórico — não usar como fonte primária)

- `BASE_CONHECIMENTO_TDAH.md` — síntese original (2026-07 anterior), 3 fontes (Cartilha, IACAPAP, Barkley), bem mais rasa que os `resumo_profundo_*.md` acima.
- `resumo_vencendo_tdah_adulto.md`, `resumo_psicologia_geral.md`, `sintese_block_0{1-5}.md` — versões anteriores, superadas.
- `resumo_capitulo1_barkley.md` — resumo isolado do capítulo 1, já incorporado (com mais profundidade) em `resumo_profundo_barkley_manual.md`.

## 3. Índice de capítulos — Manual Barkley (Fonte 3)

**Parte I — A Natureza do TDAH**
1. História
2. Principais Sintomas, Critérios Diagnósticos, Prevalência e Diferenças de Gênero
3. Problemas Cognitivos, de Desenvolvimento e de Saúde Associados
4. Transtornos Co-mórbidos, Adaptação Social e Familiar e Subtipos
5. Etiologias
6. TDAH em Adultos: Curso Evolutivo e Consequências
7. Uma Teoria para o TDAH (capítulo teórico central)

**Parte II — Avaliação**
8. Entrevista Diagnóstica, Escalas de Avaliação do Comportamento e Exame Médico
9. Testes e Medidas Observacionais
10. Integrando os Resultados da Avaliação: Dez Casos Clínicos
11. Avaliação de Adultos com TDAH

**Parte III — Tratamento**
12. Aconselhamento e Treinamento para os Pais
13. COPE: Treinamento Comunitário para Pais
14. Treinamento para Famílias de Adolescentes com TDAH
15. Tratamento do TDAH em Ambientes Escolares
16. Programas de Resolução de Conflitos Mediados por Estudantes
17. Estimulantes
18. Tratamentos com Antidepressivos e Inibidores da Recaptação de Norepinefrina
19. Outros Medicamentos
20. Terapias Infantis Combinadas
21-22. Capítulos finais (ver `resumo_profundo_barkley_manual.md`, bloco "Parte IV" — cobertura completa dos 22 capítulos do livro, 2 a mais do que o índice original de 20 mapeava)

## 4. Outros arquivos deste diretório

- `barkley_manual.txt` — texto bruto extraído do PDF (material de estudo interno, protegido por direitos autorais — não copiar/distribuir).
- `vencendo_full_ocr.txt` — texto bruto via OCR do PDF escaneado (mesma observação de direitos autorais).
- `autoavaliacao_triagem_tdah.md` — questionário de triagem usado na funcionalidade "Autoavaliação" do app (`app-mobile/src/self-assessment.js`).

## 5. Conceito central unificador

Modelo de Barkley (Cap. 7 do Manual + Passo 2 de "Vencendo o TDAH Adulto"): TDAH = déficit de **inibição comportamental** → compromete 4 funções executivas (memória de trabalho não-verbal/"olho da mente", memória de trabalho verbal/"voz da mente", autocontrole emocional/"coração da mente", planejamento/"playground da mente") → gera "miopia temporal" → tratamento eficaz = externalizar rotinas/consequências (rotinas visíveis, timers, listas, medicação, as "8 Regras" de autogestão). Ver detalhe completo nos `resumo_profundo_*.md`.
