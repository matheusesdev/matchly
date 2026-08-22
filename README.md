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
- Cadastro e login por e-mail com Supabase Auth.
- Upload de DOCX com limite de 5 MB.
- Extração de texto no backend usando Mammoth.
- Análise de aderência com Gemini.
- Score de compatibilidade, pontos fortes, gaps e palavras-chave.
- Geração de currículo otimizado para uma vaga específica.
- Persistência de currículos e análises no Postgres.
- Isolamento de dados por usuário com Row Level Security.
- Retry progressivo e fallback de modelo durante indisponibilidades da IA.
- Modo demonstrativo sem Supabase configurado.
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
- **Progressive enhancement:** sem backend configurado, a interface continua navegável em modo demonstrativo.

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
  GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite
```

Publique as funções:

```bash
npx supabase functions deploy analyze-resume --no-verify-jwt
npx supabase functions deploy optimize-resume --no-verify-jwt
```

O gateway não valida o JWT porque as funções fazem a validação explícita com `auth.getUser(accessToken)`. Requisições sem sessão válida continuam sendo rejeitadas.

## Modelo de dados

- **`resumes`:** nome do arquivo, texto extraído, proprietário e criação.
- **`analyses`:** vaga, score, palavras-chave, gaps, pontos fortes, texto otimizado e alterações.

As duas tabelas possuem RLS. Um usuário autenticado acessa somente registros cujo `user_id` corresponde ao próprio ID.

## Segurança e privacidade

- `.env` e `.env.local` são ignorados pelo Git.
- A chave Gemini nunca é enviada ao navegador.
- Toda operação de IA exige uma sessão válida.
- Currículos são processados no backend.
- Uploads aceitam somente DOCX de até 5 MB.
- Descrições de vaga possuem limite de 8.000 caracteres.
- Exclusões propagam com `on delete cascade`.
- Prompts proíbem invenção de cargos, datas, empresas, métricas, habilidades e credenciais.

> Para produção, recomenda-se complementar com rate limiting, política de retenção, observabilidade, termos de uso e política de privacidade revisados juridicamente.

## Qualidade

### Build de produção

```bash
npm run build
```

O comando verifica TypeScript antes de gerar o bundle.

### QA visual

Com o servidor local em execução:

```bash
node scripts/capture-linkedin.mjs
```

O Playwright gera screenshots em `artifacts/linkedin`. As capturas usam `prefers-reduced-motion` para produzir imagens estáticas consistentes.

### Checklist manual

- Cadastro, confirmação de e-mail, login e logout.
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
