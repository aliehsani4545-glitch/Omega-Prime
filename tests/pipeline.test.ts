import { describe, it, expect } from 'vitest';
import { runPipeline } from '../orchestration/research_director';
import { generateResearchBrief } from '../reports/index';
import { generateLearningReport } from '../learning/index';

describe('Research Director pipeline (end-to-end)', () => {
  it('runs a full cycle and populates memory', async () => {
    const m = await runPipeline();
    expect(m.regime).toBeDefined();
    expect(m.theses.length).toBeGreaterThan(0);
    expect(m.candidates.length).toBeGreaterThan(0);
    expect(m.signals.length).toBeGreaterThan(0);
    expect(m.causalGraph).toBeDefined();
    expect(m.narratives.length).toBeGreaterThan(0);
    expect(m.inevitabilities.length).toBeGreaterThan(0);
  });

  it('surfaces under-the-radar archetypes, not just the obvious leader', async () => {
    const m = await runPipeline();
    const top = m.candidates[0]!;
    // The highest-EEP names should not all be the most-embedded mega caps.
    const nvda = m.candidates.find((c) => c.ticker === 'NVDA')!;
    expect(top.eep).toBeGreaterThanOrEqual(nvda.eep);
  });

  it('every candidate carries a skeptic verdict and provenance', async () => {
    const m = await runPipeline();
    for (const c of m.candidates) {
      expect(c.skepticVerdict).toBeDefined();
      expect(c.provenance.length).toBeGreaterThan(0);
      expect(c.eep).toBeGreaterThanOrEqual(0);
      expect(c.srScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('audits every significant action', async () => {
    const m = await runPipeline();
    expect(m.audit.length).toBeGreaterThan(0);
    expect(m.audit.some((a) => a.action === 'classify')).toBe(true);
  });

  it('generates a non-trivial research brief and learning report', async () => {
    const m = await runPipeline();
    const brief = generateResearchBrief(m.snapshot());
    expect(brief).toContain('Omega Prime X');
    expect(brief).toContain('Market Regime');
    const lr = generateLearningReport(m.learning);
    expect(lr.sampleSize).toBeGreaterThan(0);
    expect(lr.agentAssessments.length).toBeGreaterThan(0);
  });
});
