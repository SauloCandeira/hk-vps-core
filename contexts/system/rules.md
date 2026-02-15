# OpenClaw Runtime Rules

Context is persistent knowledge used by agents, not memory and not logs.
It must be loaded before agent execution and applied consistently.

Rules:
- Never expose secrets in API responses
- Only read from allowed runtime paths
- Keep backward compatibility for existing endpoints
- Prefer structured JSON for admin dashboard
