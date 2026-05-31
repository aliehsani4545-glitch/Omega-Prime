/**
 * Seed / smoke script. Runs one full intelligence cycle and prints a summary.
 * Persists to the configured DATA_BACKEND (memory by default).
 */
import { runPipeline } from '../orchestration/research_director';
import { buildRepository } from '../database/repository';
import { humanRegime } from '../regime_engine/index';

async function main(): Promise<void> {
  console.log('Omega Prime X — running intelligence cycle...\n');
  const memory = await runPipeline();
  const repo = buildRepository();
  await repo.init();
  const runId = await repo.saveSnapshot(memory.snapshot());

  const r = memory.regime!;
  console.log(`Regime:    ${humanRegime(r.label)}  (conf ${(r.confidence * 100).toFixed(0)}%)`);
  console.log(`Mode:      ${r.operatingMode.toUpperCase()}`);
  console.log(`Theses:    ${memory.theses.length}`);
  console.log(`Candidates:${memory.candidates.length}`);

  const byTier = memory.candidates.reduce<Record<string, number>>((m, c) => {
    m[c.tier] = (m[c.tier] ?? 0) + 1;
    return m;
  }, {});
  console.log(`Tiers:     ${JSON.stringify(byTier)}`);

  console.log('\nTop 8 by SR score:');
  for (const c of memory.candidates.slice(0, 8)) {
    console.log(
      `  ${c.ticker.padEnd(5)} ${c.tier.padEnd(8)} EEP ${(c.eep * 100).toFixed(0).padStart(3)}  SR ${(c.srScore * 100).toFixed(0).padStart(3)}  ${c.setupStage.padEnd(9)} ${c.company}`,
    );
  }

  console.log(`\nAlerts:    ${memory.alerts.length}`);
  console.log(`Persisted run #${runId} to ${repo.kind} backend.`);
  await repo.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
