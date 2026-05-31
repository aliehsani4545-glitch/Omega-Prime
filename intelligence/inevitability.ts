/**
 * Technological Inevitability Engine
 * ----------------------------------
 * Identifies infrastructure layers / ecosystem dependencies becoming
 * inevitable, and maps first/second/third-order listed beneficiaries plus
 * bottlenecks and hidden constraints. Output is inevitabilities, not stocks.
 */
import type { Inevitability, InevitabilityStage, SignalObservation } from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { id, unit, clamp, nowISO, internalProvenance, mean } from '../domain/util';

export interface InevitabilitySeed {
  key: string;
  name: string;
  description: string;
  /** tickers by causal order */
  firstOrder: string[];
  secondOrder: string[];
  thirdOrder: string[];
  bottlenecks: string[];
  hiddenConstraints: string[];
  linkedThesisIds: string[];
}

function stageFor(score: number, crowding: number): InevitabilityStage {
  if (crowding > 0.8) return 'crowded';
  if (score > 0.8) return 'becoming_inevitable';
  if (score > 0.6) return 'accelerating';
  return 'emerging';
}

export function computeInevitability(
  seed: InevitabilitySeed,
  universe: CompanyFacts[],
  signals: SignalObservation[],
): Inevitability {
  const members = universe.filter((c) =>
    [...seed.firstOrder, ...seed.secondOrder, ...seed.thirdOrder].includes(c.ticker),
  );
  const sig = (families: string[], tickers: string[]) =>
    mean(
      signals
        .filter((s) => s.ticker && tickers.includes(s.ticker) && families.includes(s.family))
        .map((s) => (s.velocity + 1) / 2),
    );

  const all = members.map((c) => c.ticker);
  const drivers = {
    adoptionAcceleration: unit(sig(['product_adoption', 'developer_momentum'], all)),
    capitalFormation: unit(0.4 + mean(members.map((c) => c.embeddedExpectation)) * 0.5),
    developerGravity: unit(mean(members.map((c) => c.developerGravity))),
    talentMigration: unit(sig(['hiring_trend'], all)),
    supplyConstraint: unit(sig(['supply_constraint'], seed.bottlenecks.length ? seed.bottlenecks : all)),
    infrastructureDependence: unit(0.5 + mean(members.map((c) => c.emergingReality - c.embeddedExpectation))),
    ecosystemLockIn: unit(mean(members.map((c) => c.developerGravity)) * 0.8 + 0.1),
    strategicNecessity: unit(mean(members.map((c) => c.emergingReality))),
    networkEffects: unit(mean(members.map((c) => c.productAdoption))),
  };

  const score = mean(Object.values(drivers));
  const crowding = mean(members.map((c) => c.crowding));
  const stage = stageFor(score, crowding);
  const confidence = unit(0.4 + score * 0.4 + (members.length > 2 ? 0.1 : 0));

  return {
    id: id('inev'),
    name: seed.name,
    description: seed.description,
    stage,
    drivers,
    bottlenecks: seed.bottlenecks,
    firstOrderBeneficiaries: seed.firstOrder,
    secondOrderBeneficiaries: seed.secondOrder,
    thirdOrderBeneficiaries: seed.thirdOrder,
    hiddenConstraints: seed.hiddenConstraints,
    linkedThesisIds: seed.linkedThesisIds,
    confidence,
    provenance: [internalProvenance(`inevitability "${seed.key}" from adoption/capital/supply/gravity drivers`)],
    createdAt: nowISO(),
  };
}
