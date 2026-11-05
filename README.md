<div align="center">
  <img src="artifacts/linkedin/01-landing-hero.png" alt="Matchly — não envie só um currículo, envie o currículo certo" width="100%" />

  # Matchly

  **Currículos mais relevantes. Carreiras mais próximas.**

  A Matchly compara um currículo com uma vaga, explica a aderência entre os dois e gera uma versão mais direcionada para recrutadores e sistemas ATS — sem inventar experiências, habilidades ou resultados.

  [![React](https://img.shields.io/badge/React-19-155D49?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-155D49?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-155D49?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
  [![Gemini](https://img.shields.io/badge/Gemini-3.6_Flash-155D49?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
</div>

---

## Sobre o produto

Enviar o mesmo currículo para vagas diferentes reduz a relevância da candidatura. Adaptá-lo manualmente exige tempo, leitura cuidadosa e conhecimento de como recrutadores e sistemas ATS interpretam o documento.

A Matchly transforma esse processo em um fluxo simples:

1. O usuário envia seu currículo em DOCX.
2. Cola a descrição completa da vaga.
3. Recebe score de aderência, pontos fortes, gaps e palavras-chave ausentes.
4. Solicita uma versão otimizada para aquela oportunidade.
5. A IA reorganiza e melhora a escrita usando exclusivamente fatos presentes no original.

> **Princípio inegociável:** a IA pode melhorar a forma como uma trajetória é apresentada, mas nunca inventar uma trajetória.

## Demonstração

<table>
  <tr>
    <td width="66%"><img src="artifacts/linkedin/03-tela-de-analise.png" alt="Tela de envio do currículo e descrição da vaga" /></td>
    <td width="34%"><img src="artifacts/linkedin/04-landing-mobile.png" alt="Landing page responsiva em dispositivo móvel" /></td>
  </tr>
  <tr><td align="center"><strong>Fluxo de análise</strong></td><td align="center"><strong>Experiência mobile</strong></td></tr>
</table>

A landing page possui motion orientado ao produto, revelações por scroll, microinterações e suporte a `prefers-reduced-motion`. A interface funciona desde 320 px até telas desktop amplas.

## Funcionalidades

### Implementadas

- Landing page comercial responsiva.
- Login por e-mail com Supabase Auth para usuários convidados.
- Lista de acesso do MVP validada no backend antes de qualquer chamada à IA.
- Upload de DOCX com limite de 5 MB.
- Extração de texto no backend usando Mammoth.
- Análise de aderência com Gemini.
- Score de compatibilidade, pontos fortes, gaps e palavras-chave.
- Geração de currículo otimizado para uma vaga específica.
- Persistência de currículos e análises no Postgres.
- Isolamento de dados por usuário com Row Level Security.
- Retry progressivo e fallback de modelo durante indisponibilidades da IA.
- Estados de carregamento e erros acionáveis.

### Roadmap

- Exportação real da versão otimizada para DOCX.
- Histórico de análises e comparação original × otimizado.
- Recuperação de senha e autenticação social.
- Limites de uso, planos e cobrança recorrente.
- Testes automatizados de integração e ponta a ponta.
- Observabilidade e métricas de produto.

## Arquitetura

```mermaid
flowchart LR
    U[Usuário] -->|DOCX + vaga| W[React + Vite]
    W -->|JWT| A[Supabase Auth]
    W -->|FormData autenticado| F1[Edge Function: analyze-resume]
    F1 -->|Extrai texto| M[Mammoth]
    F1 -->|Prompt anti-alucinação| G[Gemini API]
    F1 -->|Currículo + análise| DB[(Postgres + RLS)]
    W -->|analysis_id + JWT| F2[Edge Function: optimize-resume]
    F2 --> DB
    F2 -->|Reescrita controlada| G
    DB -->|Dados do proprietário| W
```

### Decisões técnicas

- **Nenhuma chave privada no cliente:** `GEMINI_API_KEY` existe apenas nas Edge Functions.
- **Autorização em profundidade:** as funções validam explicitamente o access token e o banco aplica RLS.
- **IA com saída estruturada:** o Gemini retorna JSON para reduzir ambiguidade.
- **Resiliência:** erros `429`, `500`, `502`, `503` e `504` recebem retry exponencial e fallback.
- **Falha segura:** sem backend configurado, o fluxo funcional permanece bloqueado.

## Stack

| Camada | Tecnologia | Responsabilidade |
| --- | --- | --- |
| Interface | React 19 + TypeScript | Fluxos, estados e componentes |
| Build | Vite 6 | Desenvolvimento e bundle |
| Design | CSS + Phosphor Icons | Sistema visual, motion e responsividade |
| Autenticação | Supabase Auth | Cadastro, login e sessões |
| Banco | Supabase Postgres | Currículos, análises e resultados |
| Segurança | PostgreSQL RLS | Isolamento por usuário |
| Backend | Supabase Edge Functions | Parsing, validação e IA |
| IA | Gemini 3.6 Flash | Análise e otimização |
| Fallback | Gemini 3.5 Flash-Lite | Continuidade em picos de demanda |
| Parsing | Mammoth | Extração de DOCX |
| QA visual | Playwright | Screenshots desktop e mobile |

## Executando localmente

### Pré-requisitos

- Node.js 20+ e npm 10+.
- Projeto Supabase para o fluxo real.
- Chave Gemini configurada somente no Supabase.

```bash
git clone https://github.com/matheusesdev/matchly.git
cd matchly
npm install
```

Crie o arquivo de ambiente:

```bash
cp .env.example .env.local
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Preencha apenas as variáveis públicas:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

Inicie o frontend:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## Configurando o Supabase

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
```

Cadastre os secrets — nunca no `.env` do frontend:

```bash
npx supabase secrets set \
  GEMINI_API_KEY=SUA_CHAVE \
  GEMINI_MODEL=gemini-3.6-flash \
  GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite \
  MVP_ALLOWED_EMAILS=voce@email.com,outro-convidado@email.com
```

Publique as funções:

```bash
npx supabase functions deploy analyze-resume --no-verify-jwt
npx supabase functions deploy optimize-resume --no-verify-jwt
```

O gateway não valida o JWT porque as funções fazem a validação explícita com `auth.getUser(accessToken)`. Requisições sem sessão válida continuam sendo rejeitadas. A variável `MVP_ALLOWED_EMAILS` é obrigatória e aceita e-mails separados por vírgula; se estiver ausente ou vazia, as funções falham de forma segura sem chamar o Gemini.

Enquanto o MVP estiver fechado, desative também **Allow new users to sign up** em **Authentication > Sign In / Providers > Email** no painel do Supabase. A lista no backend é a barreira que protege o custo da API; desabilitar novos cadastros evita contas desnecessárias.

## Modelo de dados

- **`resumes`:** nome do arquivo, texto extraído, proprietário e criação.
- **`analyses`:** vaga, score, palavras-chave, gaps, pontos fortes, texto otimizado e alterações.

As duas tabelas possuem RLS. Um usuário autenticado acessa somente registros cujo `user_id` corresponde ao próprio ID.

## Segurança e privacidade

- `.env` e `.env.local` são ignorados pelo Git.
- A chave Gemini nunca é enviada ao navegador.
- Toda operação de IA exige uma sessão válida e um e-mail presente na lista de convidados do backend.
- Currículos são processados no backend.
- Uploads aceitam somente DOCX de até 5 MB.
- Descrições de vaga possuem limite de 8.000 caracteres.
- Exclusões propagam com `on delete cascade`.
- Prompts proíbem invenção de cargos, datas, empresas, métricas, habilidades e credenciais.

> Para produção, recomenda-se complementar com rate limiting, política de retenção, observabilidade, termos de uso e política de privacidade revisados juridicamente.

## Qualidade

### Verificações automáticas

| Comando | O que garante |
| --- | --- |
| `npm run typecheck` | Tipos do front-end. |
| `npm test` | Testes unitários (Vitest): validação da IA, verificação de origem, cotas, exportação PDF/DOCX, textos legais. |
| `npm run build` | Build de produção (inclui checagem de tipos). |
| `npm run test:e2e` | Testes de ponta a ponta (Playwright) com o Supabase simulado em `e2e/support.ts`, incluindo acessibilidade WCAG 2 A/AA (axe) e layout em 360 px. Não precisam de `.env` nem de rede. |
| `npm run check:functions` | Tipos das Edge Functions (`deno check`); exige o [Deno](https://deno.com) instalado. |

Na primeira execução dos testes de ponta a ponta, instale o navegador: `npx playwright install chromium`.

O workflow [`ci.yml`](.github/workflows/ci.yml) roda tudo isso em cada pull request e em cada push na `main`.

### Observabilidade

Cada chamada de IA grava uma linha em `ai_runs` (tipo, resultado, tentativas, fidelidade e duração; **sem** conteúdo de currículo, vaga ou e-mail) e emite um log estruturado nas Edge Functions (painel do Supabase > Edge Functions > Logs). Para ver as métricas agregadas:

```bash
npm run metrics
```

Mostra volume por dia, taxa de falhas por tipo, **qualidade da verificação de origem** (fidelidade média, p10 e mediana; abaixo de 0,6 o app regenera uma vez), latência (p50/p95) e bloqueios por cota. As consultas ficam em [`supabase/metrics.sql`](supabase/metrics.sql) e usam a CLI do Supabase já logada e vinculada ao projeto.

### QA visual

Com o servidor local em execução:

```bash
node scripts/capture-linkedin.mjs
```

O Playwright gera screenshots em `artifacts/linkedin`. As capturas usam `prefers-reduced-motion` para produzir imagens estáticas consistentes.

### Checklist manual

- Login e logout de uma conta convidada; rejeição de uma conta fora da lista.
- Upload válido, formato incorreto e arquivo acima de 5 MB.
- Vaga vazia, curta e próxima ao limite.
- Análise completa com persistência.
- Otimização sem fatos ausentes no original.
- Sessão expirada e requisição sem autenticação.
- Indisponibilidade do Gemini e fallback.
- Layout em 320 px, 390 px, tablet e desktop.
- Teclado e redução de movimento.

## Estrutura

```text
matchly/
├── artifacts/linkedin/        # Screenshots e texto de divulgação
├── scripts/                   # Automação de QA visual
├── src/
│   ├── components/            # Landing e autenticação
│   ├── lib/                   # Supabase e API tipada
│   ├── App.tsx                # Fluxo principal
│   └── *.css                  # Design, motion e responsividade
├── supabase/
│   ├── functions/             # Edge Functions e módulos compartilhados
│   └── migrations/            # Schema, índices e RLS
├── .env.example
├── AGENTS.md
└── package.json
```

## Princípios

1. **Verdade antes de persuasão:** melhorar a comunicação sem fabricar qualificações.
2. **Privacidade por padrão:** cada usuário acessa apenas os próprios dados.
3. **Orientação antes de automação:** explicar score e gaps antes de gerar.
4. **Acessibilidade como requisito:** responsividade, foco e redução de movimento.
5. **Erros acionáveis:** toda falha explica o que aconteceu e como continuar.

## Status

MVP funcional. O fluxo central — autenticar, enviar DOCX, analisar aderência e gerar uma versão otimizada — está implementado. Exportação DOCX, pagamentos e histórico completo permanecem no roadmap.

---

<div align="center">Desenvolvido com foco em produto, segurança e uma experiência de candidatura mais relevante.</div>
