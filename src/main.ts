import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  );

  const defaultOrigins = ['https://hktech.com.br'];
  const envOrigins = process.env.ADMIN_ORIGINS
    ? process.env.ADMIN_ORIGINS.split(',').map((entry) => entry.trim()).filter(Boolean)
    : [];

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      const allowedOrigins = envOrigins.length ? envOrigins : defaultOrigins;
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Not allowed by CORS'), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Internal-Key'],
  });

  app.setGlobalPrefix('api');

  const port = Number(process.env.PORT || 3001);
  const host = process.env.BIND_ADDRESS || '0.0.0.0';
  await app.listen(port, host);
}

bootstrap();
