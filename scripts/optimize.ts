/**
 * CLI: run the backtest + adaptive weight optimizer and print the result.
 * Demonstrates the closed learning loop end-to-end without the API.
 */
import { classifyRegime } from '../regime_engine/index';
import { buildConnectors } from '../connectors/index';
import { runBacktest } from '../backtesting/engine';
import { optimizeWeights } from '../backtesting/optimizer';

async function main(): Promise<void> {
  const regime = classifyRegime(await buildConnectors().marketData.getRegimeInputs(new Date().toISOString()));
  const bt = runBacktest(regime, {});
  console.log('Backtest (baseline weights)');
  console.log(`  periods evaluated : ${bt.periodsEvaluated.length}`);
  console.log(`  mean spread       : ${(bt.meanSpread * 100).toFixed(2)}%`);
  console.log(`  mean hit-rate     : ${(bt.meanHitRate * 100).toFixed(1)}%`);
  console.log(`  mean rank-IC      : ${bt.meanRankIC.toFixed(3)}  (Spearman SR vs forward return)`);

  console.log('\nAdaptive optimizer (train in-sample → validate out-of-sample)');
  const opt = optimizeWeights(regime, {});
  const fmt = (m: { valSpread: number; valHitRate: number; valRankIC: number }) =>
    `spread ${(m.valSpread * 100).toFixed(2)}%  hit ${(m.valHitRate * 100).toFixed(1)}%  IC ${m.valRankIC.toFixed(3)}`;
  console.log(`  baseline  (val): ${fmt(opt.baseline)}`);
  console.log(`  optimized (val): ${fmt(opt.optimized)}`);
  console.log(`  out-of-sample spread improvement: ${(opt.improvementValSpread * 100).toFixed(2)}pp`);
  console.log(`  changed weights: ${opt.changedComponents.map((c) => `${c.component}×${c.to}`).join(', ') || 'none'}`);
  for (const n of opt.notes) console.log(`  • ${n}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
