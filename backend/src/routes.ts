/**
 * API routes — expose every cockpit panel: regime, theses, candidates, causal
 * graph, intelligence layers, skeptic, narratives, alerts, learning, audit.
 */
import type { FastifyInstance } from 'fastify';
import type { AppState } from './state';
import { candidateQuerySchema, causalQuerySchema, pipelineRequestSchema } from '../../domain/schemas';
import { generateResearchBrief } from '../../reports/index';
import { generateLearningReport } from '../../learning/index';
import { runBacktest } from '../../backtesting/engine';
import { optimizeWeights } from '../../backtesting/optimizer';

export async function registerRoutes(app: FastifyInstance, state: AppState): Promise<void> {
  const mem = () => state.memory;

  app.get('/health', async () => ({ status: 'ok', lastRunAt: state.lastRunAt, dataBackend: state.repo.kind }));

  // --- Regime ---
  app.get('/api/regime', async () => mem().regime ?? null);
  app.get('/api/regime/history', async () => mem().regimeHistory);

  // --- Theses ---
  app.get('/api/theses', async () => mem().theses);
  app.get('/api/theses/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const t = mem().thesisById(id);
    if (!t) return reply.code(404).send({ error: 'thesis not found' });
    return t;
  });

  // --- Candidates ---
  app.get('/api/candidates', async (req) => {
    const q = candidateQuerySchema.parse(req.query ?? {});
    let list = mem().candidates;
    if (q.tier) list = list.filter((c) => c.tier === q.tier);
    if (q.thesisId) list = list.filter((c) => c.thesisIds.includes(q.thesisId!));
    if (q.theme) list = list.filter((c) => c.theme === q.theme);
    if (q.setupStage) list = list.filter((c) => c.setupStage === q.setupStage);
    if (q.minEEP !== undefined) list = list.filter((c) => c.eep >= q.minEEP!);
    if (q.minSR !== undefined) list = list.filter((c) => c.srScore >= q.minSR!);
    return list.slice(0, q.limit);
  });
  app.get('/api/candidates/:ticker', async (req, reply) => {
    const { ticker } = req.params as { ticker: string };
    const c = mem().candidateByTicker(ticker.toUpperCase());
    if (!c) return reply.code(404).send({ error: 'candidate not found' });
    return c;
  });

  // --- Intelligence layers ---
  app.get('/api/narratives', async () => mem().narratives);
  app.get('/api/inevitabilities', async () => mem().inevitabilities);
  app.get('/api/expectation-gaps', async () => mem().expectationGaps);
  app.get('/api/reality-divergence', async () => mem().realityDivergences);
  app.get('/api/information-advantage', async () => mem().informationAdvantage);
  app.get('/api/signals', async (req) => {
    const { family, ticker } = (req.query ?? {}) as { family?: string; ticker?: string };
    let list = mem().signals;
    if (family) list = list.filter((s) => s.family === family);
    if (ticker) list = list.filter((s) => s.ticker === ticker.toUpperCase());
    return list;
  });

  // --- Skeptic + debates ---
  app.get('/api/skeptic', async () => mem().skepticObjections);
  app.get('/api/debates', async () => mem().debates);

  // --- Backtest + adaptive optimizer (closed learning loop) ---
  app.get('/api/backtest', async (req, reply) => {
    const regime = mem().regime;
    if (!regime) return reply.code(503).send({ error: 'regime not ready' });
    const q = (req.query ?? {}) as { horizon?: string; topK?: string };
    return runBacktest(regime, {
      horizon: q.horizon ? Number(q.horizon) : undefined,
      topK: q.topK ? Number(q.topK) : undefined,
      overrides: state.appliedWeights?.multipliers,
    });
  });
  app.post('/api/optimizer/run', async (_req, reply) => {
    const regime = mem().regime;
    if (!regime) return reply.code(503).send({ error: 'regime not ready' });
    return optimizeWeights(regime);
  });
  app.post('/api/optimizer/apply', async (_req, reply) => {
    const regime = mem().regime;
    if (!regime) return reply.code(503).send({ error: 'regime not ready' });
    const result = optimizeWeights(regime);
    // Operator-gated honesty: only apply if it improves out-of-sample.
    const applied = result.improvementValSpread >= 0;
    if (applied) await state.applyLearnedWeights(result.learned);
    return { applied, reason: applied ? 'out-of-sample improvement' : 'no out-of-sample improvement; baseline kept', result, lastRunAt: state.lastRunAt };
  });
  app.post('/api/optimizer/reset', async () => {
    await state.resetLearnedWeights();
    return { ok: true, lastRunAt: state.lastRunAt };
  });
  app.get('/api/optimizer/applied', async () => state.appliedWeights ?? null);

  // --- Causal graph ---
  app.get('/api/causal/graph', async () => {
    const g = mem().causalGraph;
    return g ? { nodes: g.allNodes(), edges: g.allEdges() } : { nodes: [], edges: [] };
  });
  app.post('/api/causal/query', async (req, reply) => {
    const g = mem().causalGraph;
    if (!g) return reply.code(503).send({ error: 'causal graph not ready' });
    const q = causalQuerySchema.parse(req.body ?? {});
    return {
      from: q.from,
      beneficiaries: g.query(q.from, q.maxOrder, q.minWeight),
      bottlenecks: g.bottlenecks(q.from, q.maxOrder),
    };
  });

  // --- Alerts ---
  app.get('/api/alerts', async () => mem().alerts);
  app.post('/api/alerts/:id/ack', async (req, reply) => {
    const { id } = req.params as { id: string };
    const a = mem().alerts.find((x) => x.id === id);
    if (!a) return reply.code(404).send({ error: 'alert not found' });
    a.acknowledged = true;
    return a;
  });

  // --- Learning + audit ---
  app.get('/api/learning', async () => generateLearningReport(mem().learning));
  app.get('/api/learning/records', async () => mem().learning);
  app.get('/api/audit', async () => mem().audit.slice(-500));

  // --- Reports + full snapshot ---
  app.get('/api/report', async (_req, reply) => {
    reply.type('text/markdown');
    return generateResearchBrief(mem().snapshot());
  });
  app.get('/api/snapshot', async () => mem().snapshot());

  // --- Pipeline control ---
  app.post('/api/pipeline/run', async (req) => {
    const body = pipelineRequestSchema.parse(req.body ?? {});
    await state.run({
      profileOverrides: body.profile?.weightOverrides,
      acceptanceThreshold: body.profile?.acceptanceThreshold,
      convictionThreshold: body.profile?.convictionThreshold,
      watchlistMode: body.profile?.watchlistMode,
      regimeOverride: body.regimeOverride,
    });
    return { ok: true, lastRunAt: state.lastRunAt, candidates: state.memory.candidates.length };
  });
}
