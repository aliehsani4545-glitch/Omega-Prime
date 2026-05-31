/**
 * Reports Layer — renders auditable, human-readable research artifacts from
 * Research Memory. Markdown so it drops cleanly into the cockpit or a file.
 */
import type { Candidate } from '../domain/types';
import type { MemorySnapshot } from '../memory/store';
import { humanRegime } from '../regime_engine/index';
import { generateLearningReport } from '../learning/index';

const pct = (x: number | undefined): string => (x === undefined ? 'n/a' : `${Math.round(x * 100)}`);

export function generateCandidateDossier(c: Candidate): string {
  const lines: string[] = [];
  lines.push(`### ${c.ticker} — ${c.company}  (${c.tier.toUpperCase()})`);
  lines.push(`**EEP ${pct(c.eep)}/100 · SR ${pct(c.srScore)}/100 · regime-fit ${pct(c.regimeFit)} · ${c.setupStage} · ${c.portfolioRole}**`);
  lines.push('');
  lines.push(`- **Theme:** ${c.theme}`);
  lines.push(`- **Why now:** ${c.whyNow}`);
  lines.push(`- **Why not already obvious:** ${c.whyNotObvious}`);
  lines.push(`- **Supporting thesis:** ${c.supportingThesis}`);
  lines.push(`- **Catalysts:** ${c.catalysts.join('; ')}`);
  lines.push(`- **Contrarian risks:** ${c.contrarianRisks.join('; ') || 'none material'}`);
  lines.push(`- **Invalidation triggers:** ${c.invalidationTriggers.join('; ')}`);
  lines.push(`- **Crowding risk:** ${pct(c.crowdingRisk)}/100 · **Conviction:** ${pct(c.conviction)}/100 · **Confidence:** ${pct(c.confidence)}/100`);
  lines.push(`- **Horizon:** ${c.timeHorizonDays}d · **Catalyst window:** ${c.catalystWindowDays}d`);
  if (c.skepticVerdict && c.skepticVerdict.objections.length) {
    lines.push(`- **Skeptic verdict:** ${c.skepticVerdict.skepticWins ? 'SKEPTIC WINS' : 'survived'} (severity ${pct(c.skepticVerdict.aggregateSeverity)}/100)`);
  }
  return lines.join('\n');
}

export function generateResearchBrief(snap: MemorySnapshot): string {
  const out: string[] = [];
  out.push(`# Omega Prime X — Research Brief`);
  out.push(`_Generated ${snap.generatedAt}_`);
  out.push('');

  if (snap.regime) {
    out.push(`## Market Regime`);
    out.push(`**${humanRegime(snap.regime.label)}** · confidence ${pct(snap.regime.confidence)}/100 · operating mode **${snap.regime.operatingMode.toUpperCase()}**`);
    out.push('');
    out.push(`> ${snap.regime.explanation}`);
    out.push('');
    out.push(`- Favored signals: ${snap.regime.policy.favoredSignals.join(', ') || 'n/a'}`);
    out.push(`- Penalized signals: ${snap.regime.policy.penalizedSignals.join(', ') || 'n/a'}`);
    out.push(`- Acceptance threshold: ${pct(snap.regime.policy.acceptanceThreshold)} · Alert threshold: ${pct(snap.regime.policy.alertThreshold)} · Aggressiveness: ${pct(snap.regime.policy.portfolioAggressiveness)}`);
    out.push('');
  }

  const tiers: Array<[string, string]> = [
    ['tier1', 'Tier 1 — Actionable Emerging Leadership'],
    ['tier2', 'Tier 2 — High-Quality Near-Ready'],
    ['tier3', 'Tier 3 — Thesis-Aligned, Needs Confirmation'],
    ['tier4', 'Tier 4 — Watchlist / Regime-Blocked'],
  ];
  out.push(`## Candidates (${snap.candidates.length})`);
  for (const [tier, title] of tiers) {
    const group = snap.candidates.filter((c) => c.tier === tier);
    if (!group.length) continue;
    out.push('');
    out.push(`### ${title} (${group.length})`);
    for (const c of group) {
      out.push('');
      out.push(generateCandidateDossier(c));
    }
  }

  const rejected = snap.candidates.filter((c) => c.tier === 'rejected');
  if (rejected.length) {
    out.push('');
    out.push(`### Rejected (${rejected.length})`);
    out.push(rejected.map((c) => `- ${c.ticker}: failed skeptic / insufficient evidence`).join('\n'));
  }

  out.push('');
  out.push(`## Active Theses`);
  for (const t of snap.theses) {
    out.push(`- **${t.identity}** (${t.status}) — conviction ${pct(t.conviction)}/100, crowding ${pct(t.crowding)}/100`);
  }

  out.push('');
  out.push(`## Technological Inevitabilities`);
  for (const i of snap.inevitabilities) {
    out.push(`- **${i.name}** — stage *${i.stage}* (conf ${pct(i.confidence)}/100); bottlenecks: ${i.bottlenecks.join(', ')}`);
  }

  out.push('');
  out.push(`## Learning Review`);
  const lr = generateLearningReport(snap.learning);
  out.push(`- Sample ${lr.sampleSize} · hit-rate ${pct(lr.hitRate)}/100 · false-positive ${pct(lr.falsePositiveRate)}/100`);
  for (const w of lr.weightRecommendations) {
    out.push(`  - Weight: ${String(w.component)} ${w.currentWeight} → ${w.recommendedWeight} (${w.rationale})`);
  }

  out.push('');
  out.push(`## Alerts (${snap.alerts.length})`);
  for (const a of snap.alerts) out.push(`- [${a.severity}] ${a.title}`);

  return out.join('\n');
}
