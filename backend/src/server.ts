/**
 * Omega Prime X — Backend bootstrap (Fastify).
 * Runs the first intelligence cycle on boot, then serves the cockpit API.
 */
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { getState } from './state';
import { registerRoutes } from './routes';

async function main(): Promise<void> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
  });

  await app.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
  });

  app.log.info('Omega Prime X: running initial intelligence cycle...');
  const state = await getState();
  app.log.info(
    { regime: state.memory.regime?.label, mode: state.memory.regime?.operatingMode, candidates: state.memory.candidates.length },
    'Initial cycle complete',
  );

  await registerRoutes(app, state);

  const port = Number(process.env.BACKEND_PORT ?? 8080);
  const host = process.env.BACKEND_HOST ?? '0.0.0.0';
  try {
    await app.listen({ port, host });
    app.log.info(`Omega Prime X API listening on http://${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
