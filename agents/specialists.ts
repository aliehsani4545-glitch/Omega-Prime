/**
 * Specialist agents. A configurable SignalFamilyAgent covers most analysts;
 * a few bespoke agents (Macro Regime, Skeptic, Portfolio Fit) carry custom
 * logic. Agents are spawnable dynamically and the roster can grow to hundreds.
 */
import type { AgentContext } from '../domain/types';
import { BaseAgent, type AgentResult } from './base';
import { mean } from '../domain/util';
import { humanRegime } from '../regime_engine/index';

/** Generic agent that focuses on a set of signal families. */
export class SignalFamilyAgent extends BaseAgent {
  readonly name: string;
  readonly purpose: string;
  private families: string[];

  constructor(name: string, purpose: string, families: string[], confidenceFloor = 0.35) {
    super();
    this.name = name;
    this.purpose = purpose;
    this.families = families;
    (this as { confidenceFloor: number }).confidenceFloor = confidenceFloor;
  }

  protected async execute(ctx: AgentContext): Promise<AgentResult> {
    const signals = ctx.signals.filter((s) => this.families.includes(s.family));
    const inflections = signals.filter((s) => s.isInflection && s.velocity > 0);
    const topTickers = Array.from(
      inflections
        .reduce((m, s) => {
          if (!s.ticker) return m;
          m.set(s.ticker, (m.get(s.ticker) ?? 0) + s.velocity);
          return m;
        }, new Map<string, number>())
        .entries(),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t);

    const avgVel = signals.length ? mean(signals.map((s) => s.velocity)) : 0;
    const confidence = this.confidenceFromSignals(signals) * (0.6 + Math.min(0.4, inflections.length * 0.08));

    return {
      summary: `${this.name}: ${inflections.length} positive inflections across ${this.families.join('/')}. Avg velocity ${avgVel.toFixed(2)}. Leaders: ${topTickers.join(', ') || 'none'}.`,
      signals,
      data: { avgVelocity: avgVel, leaders: topTickers, inflectionCount: inflections.length },
      confidence,
    };
  }
}

/** Macro Regime Agent — reports the active regime + operating mode. */
export class MacroRegimeAgent extends BaseAgent {
  readonly name = 'MacroRegimeAgent';
  readonly purpose = 'Surface the active market regime and the operating mode it imposes downstream.';

  protected async execute(ctx: AgentContext): Promise<AgentResult> {
    const r = ctx.regime;
    return {
      summary: `Regime ${humanRegime(r.label)} (conf ${(r.confidence * 100).toFixed(0)}%) → mode ${r.operatingMode.toUpperCase()}. Favored: ${r.policy.favoredSignals.join(', ') || 'n/a'}.`,
      signals: [],
      data: { label: r.label, mode: r.operatingMode, policy: r.policy },
      confidence: r.confidence,
    };
  }
}

/** Skeptic Agent — flags crowding/fragility/saturation across the board. */
export class SkepticAgent extends BaseAgent {
  readonly name = 'SkepticAgent';
  readonly purpose = 'Disconfirmation sweep: attack the consensus of the current signal set.';
  override readonly confidenceFloor = 0.3;

  protected async execute(ctx: AgentContext): Promise<AgentResult> {
    const crowdedThemes = ctx.theses.filter((t) => t.crowding > 0.78).map((t) => t.identity);
    const weakening = ctx.theses.filter((t) => t.status === 'weakening' || t.status === 'broken').map((t) => t.identity);
    return {
      summary: `Skeptic: crowded themes [${crowdedThemes.join(', ') || 'none'}]; weakening [${weakening.join(', ') || 'none'}].`,
      signals: ctx.signals.filter((s) => s.direction === 'bearish'),
      data: { crowdedThemes, weakening },
      confidence: 0.6,
    };
  }
}

/** Portfolio Fit Agent — assesses regime-conditioned aggressiveness. */
export class PortfolioFitAgent extends BaseAgent {
  readonly name = 'PortfolioFitAgent';
  readonly purpose = 'Translate regime + crowding into portfolio aggressiveness and role guidance.';

  protected async execute(ctx: AgentContext): Promise<AgentResult> {
    const aggr = ctx.regime.policy.portfolioAggressiveness;
    return {
      summary: `Portfolio posture: aggressiveness ${(aggr * 100).toFixed(0)}% under ${ctx.regime.operatingMode}.`,
      signals: [],
      data: { aggressiveness: aggr, mode: ctx.regime.operatingMode },
      confidence: 0.7,
    };
  }
}

/** Build the initial elite roster of specialist agents. */
export function buildSpecialistRoster(): BaseAgent[] {
  return [
    new MacroRegimeAgent(),
    new SignalFamilyAgent('LiquidityAgent', 'Track liquidity/flow conditions.', ['institutional_flow', 'liquidity']),
    new SignalFamilyAgent('MarketBreadthAgent', 'Track breadth and relative strength dispersion.', ['relative_strength']),
    new SignalFamilyAgent('VolatilityStructureAgent', 'Track volatility-sensitive fragility.', ['liquidity', 'institutional_flow']),
    new SignalFamilyAgent('HyperscalerCapexAgent', 'Detect capex commentary inflection.', ['earnings_language_drift', 'supply_constraint']),
    new SignalFamilyAgent('SemiconductorSupplyChainAgent', 'Track semi supply constraints.', ['supply_constraint', 'earnings_language_drift']),
    new SignalFamilyAgent('MemoryStorageCycleAgent', 'Track memory/storage cycle inflection.', ['supply_constraint', 'estimate_revision']),
    new SignalFamilyAgent('NetworkingOpticalAgent', 'Track optical/networking adoption.', ['product_adoption', 'supply_constraint']),
    new SignalFamilyAgent('PowerCoolingGridAgent', 'Track power/cooling/grid bottlenecks.', ['supply_constraint', 'hiring_trend']),
    new SignalFamilyAgent('EarningsLanguageDriftAgent', 'Detect management tone drift.', ['earnings_language_drift']),
    new SignalFamilyAgent('EstimateRevisionAgent', 'Detect estimate revision momentum.', ['estimate_revision']),
    new SignalFamilyAgent('RelativeStrengthAgent', 'Detect relative strength leadership.', ['relative_strength']),
    new SignalFamilyAgent('InstitutionalFlowAgent', 'Detect institutional accumulation.', ['institutional_flow']),
    new SignalFamilyAgent('NarrativeVelocityAgent', 'Measure narrative spread speed.', ['developer_momentum', 'product_adoption']),
    new SignalFamilyAgent('NarrativeGravityAgent', 'Measure ecosystem pull / gravity.', ['developer_momentum', 'hiring_trend']),
    new SignalFamilyAgent('DeveloperMomentumAgent', 'Track developer/open-source momentum.', ['developer_momentum']),
    new SignalFamilyAgent('ProductAdoptionAgent', 'Track product adoption curves.', ['product_adoption']),
    new SignalFamilyAgent('ValuationVsEmbeddedAgent', 'Compare valuation vs embedded expectations.', ['valuation_vs_embedded', 'balance_sheet']),
    new SkepticAgent(),
    new PortfolioFitAgent(),
  ];
}
