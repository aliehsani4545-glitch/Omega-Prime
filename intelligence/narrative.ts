/**
 * Narrative Velocity + Narrative Gravity engines.
 *
 * Velocity  = how fast a narrative is spreading.
 * Gravity   = how strongly capital, developers, founders, customers, partners,
 *             media and researchers are being pulled toward the same destination.
 *
 * The classifier distinguishes fad vs early-emerging vs durable-ecosystem vs
 * saturated vs crowded-euphoric — durable ecosystems have high gravity with
 * moderate (not blow-off) velocity and crowding.
 */
import type { Narrative, NarrativeClass, SignalObservation, Thesis } from '../domain/types';
import type { CompanyFacts } from '../connectors/types';
import { id, unit, clamp, nowISO, internalProvenance, mean } from '../domain/util';

export function computeNarrative(
  thesis: Thesis,
  members: CompanyFacts[],
  signals: SignalObservation[],
): Narrative {
  const tickers = new Set(members.map((m) => m.ticker));
  const memberSignals = signals.filter((s) => s.ticker && tickers.has(s.ticker));

  const velFamilies = ['developer_momentum', 'product_adoption', 'hiring_trend', 'estimate_revision'];
  const velocity = unit(0.5 + mean(memberSignals.filter((s) => velFamilies.includes(s.family)).map((s) => s.velocity)) * 1.2);

  const pull = {
    capital: unit(mean(members.map((m) => m.embeddedExpectation))),
    developers: unit(mean(members.map((m) => m.developerGravity))),
    founders: unit(0.4 + mean(members.map((m) => m.emergingReality)) * 0.4),
    customers: unit(mean(members.map((m) => m.productAdoption))),
    partners: unit(0.4 + mean(members.map((m) => m.emergingReality - m.embeddedExpectation)) + 0.3),
    media: unit(mean(members.map((m) => m.crowding))),
    researchers: unit(mean(members.map((m) => m.developerGravity)) * 0.7 + 0.15),
  };
  const gravity = unit(mean(Object.values(pull)));
  const crowding = mean(members.map((m) => m.crowding));

  const classification = classify(velocity, gravity, crowding);

  return {
    id: id('narr'),
    name: thesis.identity,
    thesisIds: [thesis.id],
    velocity,
    gravity,
    classification,
    pullSources: pull,
    confidence: unit(0.45 + gravity * 0.3 + (members.length > 1 ? 0.1 : 0)),
    provenance: [internalProvenance('narrative velocity + gravity from member pull-sources')],
    createdAt: nowISO(),
  };
}

function classify(velocity: number, gravity: number, crowding: number): NarrativeClass {
  if (crowding > 0.82 && velocity > 0.6) return 'crowded_euphoric';
  if (gravity > 0.6 && velocity < 0.75 && crowding < 0.8) return 'durable_ecosystem_forming';
  if (velocity > 0.7 && gravity < 0.5) return 'fad';
  if (gravity < 0.45 && velocity > 0.5) return 'early_emerging';
  if (crowding > 0.7) return 'saturated';
  return 'early_emerging';
}
