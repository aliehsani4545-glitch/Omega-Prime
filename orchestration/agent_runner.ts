/**
 * Agent runner — executes the specialist roster in parallel (independent
 * tasks), then reconciles: aggregates contradictions and escalations for the
 * Research Director. Mirrors Claude-Code multi-agent orchestration: parallel
 * fan-out, then reconciliation before downstream decisions.
 */
import type { AgentContext, AgentOutput } from '../domain/types';
import type { BaseAgent } from '../agents/base';

export interface ReconciledAgentRun {
  outputs: AgentOutput[];
  escalations: AgentOutput[];
  contradictions: { agent: string; notes: string[] }[];
  okCount: number;
  lowConfidenceCount: number;
}

export async function runAgents(agents: BaseAgent[], ctx: AgentContext): Promise<ReconciledAgentRun> {
  const outputs = await Promise.all(agents.map((a) => a.run(ctx)));
  const escalations = outputs.filter((o) => o.escalate);
  const contradictions = outputs
    .filter((o) => o.contradictions.length > 0)
    .map((o) => ({ agent: o.agent, notes: o.contradictions }));
  return {
    outputs,
    escalations,
    contradictions,
    okCount: outputs.filter((o) => o.status === 'ok').length,
    lowConfidenceCount: outputs.filter((o) => o.status === 'low_confidence').length,
  };
}
