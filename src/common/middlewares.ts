import https from 'https';
import crypto from 'crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { TelemetryService } from '../runtime/telemetry.service';

const CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cachedCerts: Record<string, string> | null = null;
let cachedAt = 0;

const rateState = new Map<string, { count: number; resetAt: number }>();

const fetchCerts = () =>
  new Promise<Record<string, string>>((resolve, reject) => {
    https
      .get(CERTS_URL, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });

const getCerts = async () => {
  const now = Date.now();
  if (cachedCerts && now - cachedAt < 60 * 60 * 1000) return cachedCerts;
  cachedCerts = await fetchCerts();
  cachedAt = now;
  return cachedCerts;
};

const base64UrlDecode = (value: string) => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf-8');
};

const parseJwt = (token: string) => {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;
  try {
    return {
      header: JSON.parse(base64UrlDecode(header)),
      payload: JSON.parse(base64UrlDecode(payload)),
      signature,
      signedData: `${header}.${payload}`,
    };
  } catch {
    return null;
  }
};

const verifyFirebaseJwt = async (token: string) => {
  const parsed = parseJwt(token);
  if (!parsed) return null;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || '';
  if (!projectId) return null;
  if (parsed.payload.aud !== projectId) return null;
  if (parsed.payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!parsed.payload.sub) return null;
  if (parsed.payload.exp && Date.now() / 1000 > parsed.payload.exp) return null;

  const certs = await getCerts();
  const cert = certs[parsed.header.kid];
  if (!cert) return null;

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(parsed.signedData);
  verifier.end();
  const signature = Buffer.from(parsed.signature.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  const valid = verifier.verify(cert, signature);
  return valid ? parsed.payload : null;
};

@Injectable()
export class RequestLogMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggingService) {}

  use(req: any, _res: any, next: any) {
    this.logger.system({
      action: 'request',
      status: 'received',
      metadata: { method: req.method, path: req.path },
    });
    next();
  }
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  use(req: any, res: any, next: any) {
    const key = `${req.ip || req.socket?.remoteAddress || 'unknown'}:${req.path}`;
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
    const limit = Number(process.env.RATE_LIMIT_MAX || 120);
    const now = Date.now();

    for (const [mapKey, entry] of rateState.entries()) {
      if (entry.resetAt <= now) rateState.delete(mapKey);
    }

    const current = rateState.get(key);
    if (!current || current.resetAt < now) {
      rateState.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= limit) {
      return res.status(429).send({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        timestamp: new Date().toISOString(),
      });
    }

    current.count += 1;
    next();
  }
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggingService) {}

  async use(req: any, res: any, next: any) {
    const protectedPrefixes = ['/api/agents', '/api/contexts', '/api/reports', '/api/crons', '/api/system', '/api/metrics'];
    if (!protectedPrefixes.some((prefix) => req.path.startsWith(prefix))) return next();

    const internalKey = process.env.INTERNAL_API_KEY || process.env.API_KEY || process.env.INTERNAL_KEY || '';
    const apiKey = String(req.headers['x-api-key'] || req.headers['x-internal-key'] || '').trim();
    const authHeader = String(req.headers.authorization || '');

    if (internalKey && apiKey && apiKey === internalKey) {
      res.setHeader('X-Request-Source', 'internal');
      return next();
    }

    if (authHeader.startsWith('Bearer ')) {
      const payload = await verifyFirebaseJwt(authHeader.replace('Bearer ', '').trim());
      if (payload) {
        res.setHeader('X-Request-Source', 'admin');
        return next();
      }
    }

    this.logger.system({ action: 'auth_reject', status: 'denied', metadata: { path: req.path, ip: req.ip } });
    return res.status(401).send({ error: 'Unauthorized', source: 'external', timestamp: new Date().toISOString() });
  }
}

@Injectable()
export class KillSwitchMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggingService) {}

  use(req: any, res: any, next: any) {
    const enabled = String(process.env.AI_KILL_SWITCH || 'false').toLowerCase() === 'true';
    if (!enabled) return next();
    if (req.path === '/api/system/kill-switch' && req.method === 'POST') return next();

    this.logger.system({ action: 'kill_switch_block', status: 'blocked', metadata: { path: req.path, method: req.method } });
    return res.status(423).send({
      error: 'AI_KILL_SWITCH_ENABLED',
      message: 'AI operations are temporarily disabled.',
      timestamp: new Date().toISOString(),
    });
  }
}

@Injectable()
export class CostGuardMiddleware implements NestMiddleware {
  constructor(private readonly telemetry: TelemetryService) {}

  async use(req: any, res: any, next: any) {
    const guarded = ['/api/ai-team', '/api/agents', '/api/contexts', '/api/reports', '/api/skills', '/api/system', '/api/crons'];
    if (!guarded.some((prefix) => req.path.startsWith(prefix))) return next();

    const budget = await this.telemetry.checkDailyBudget();
    if (!budget.allowed) {
      return res.status(403).send({
        error: 'COST_GUARD_BLOCKED',
        reason: budget.failSafe ? 'telemetry_unavailable' : 'daily_budget_exceeded',
        cost_today: budget.costToday,
        max_budget_usd: budget.maxBudget,
        fail_safe: budget.failSafe,
        timestamp: new Date().toISOString(),
      });
    }

    next();
  }
}
