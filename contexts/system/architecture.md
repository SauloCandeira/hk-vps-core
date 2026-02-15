# HK Tech Platform Architecture

Context is a persistent knowledge layer used to shape agent reasoning and behavior.
It is not memory and not logs. Context is loaded before agent execution.

- Frontend: React admin panel + public interface
- Auth: Firebase Auth
- Storage: Firebase Storage for files only
- Admin DB: Cloud SQL (panel data, configs, users)
- Core AI Engine: OpenClaw on VPS (this gateway + runtime)

Data flow:
- Frontend -> Firebase Auth -> Admin APIs
- Admin APIs -> VPS Gateway -> OpenClaw runtime
- OpenClaw produces reports and logs in runtime workspace
