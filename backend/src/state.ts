/**
 * Backend application state. Holds the current Research Memory (the output of
 * the latest pipeline run) and the persistence repository.
 */
import { runPipeline, type PipelineOptions } from '../../orchestration/research_director';
import { buildRepository, type Repository } from '../../database/repository';
import type { ResearchMemory } from '../../memory/store';
import type { LearnedWeights } from '../../domain/types';

export class AppState {
  memory!: ResearchMemory;
  repo!: Repository;
  lastRunAt?: string;
  /** Operator-applied learned weights; persisted across re-runs once applied. */
  appliedWeights?: LearnedWeights;

  async init(): Promise<void> {
    this.repo = buildRepository();
    await this.repo.init();
    await this.run();
  }

  async run(options: PipelineOptions = {}): Promise<void> {
    // Applied learned weights carry forward unless explicitly overridden.
    const merged: PipelineOptions = { learnedWeights: this.appliedWeights, ...options };
    this.memory = await runPipeline(merged);
    this.lastRunAt = new Date().toISOString();
    await this.repo.saveSnapshot(this.memory.snapshot());
  }

  async applyLearnedWeights(w: LearnedWeights): Promise<void> {
    this.appliedWeights = w;
    await this.run();
  }

  async resetLearnedWeights(): Promise<void> {
    this.appliedWeights = undefined;
    await this.run();
  }
}

let __state: AppState | undefined;
export async function getState(): Promise<AppState> {
  if (!__state) {
    __state = new AppState();
    await __state.init();
  }
  return __state;
}
