# HK VPS Core (NestJS + Fastify)

Projeto único em NestJS + Fastify para o gateway da plataforma HKTECH.

## Rodando com Docker

```bash
docker compose up --build -d
```

API em `http://localhost:3001/api`.

## Rotas

- `GET /api/health`
- `GET /api/ai-team`
- `GET /api/agents`
- `GET /api/agents/:name`
- `GET /api/agents/souls`
- `GET /api/agents/soul/:name`
- `POST /api/agents/soul/:name`
- `GET /api/contexts`
- `GET /api/reports`
- `GET /api/reports/latest`
- `GET /api/crons`
- `GET /api/skills`
- `GET /api/system/status`
- `GET /api/system/structure`
- `POST /api/system/kill-switch`
- `POST /api/system/run-tests`
- `GET /api/system/infra-status`
- `GET /api/system/infra-logs`
- `GET /api/metrics/llm`
- `GET /api/metrics/system`
- `GET /api/metrics/agents`

## Observação

O código legado foi removido e substituído pela implementação NestJS.
