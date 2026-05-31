/**
 * Zod schemas for API request validation and operator-supplied objects.
 * Keep these aligned with types.ts. Only boundary inputs are validated here;
 * internal objects are trusted within the process.
 */
import { z } from 'zod';

export const operatingModeSchema = z.enum(['offensive', 'selective', 'defensive', 'watchlist_only']);

export const candidateTierSchema = z.enum(['tier1', 'tier2', 'tier3', 'tier4', 'rejected']);

/** Operator-tunable scoring profile (override layer on top of regime policy). */
export const scoringProfileSchema = z.object({
  name: z.string().min(1).default('default'),
  weightOverrides: z.record(z.string(), z.number()).default({}),
  acceptanceThreshold: z.number().min(0).max(1).optional(),
  convictionThreshold: z.number().min(0).max(1).optional(),
  watchlistMode: z.boolean().default(false),
});
export type ScoringProfileInput = z.infer<typeof scoringProfileSchema>;

/** Candidate search / screen request. */
export const candidateQuerySchema = z.object({
  tier: candidateTierSchema.optional(),
  thesisId: z.string().optional(),
  theme: z.string().optional(),
  minEEP: z.number().min(0).max(1).optional(),
  minSR: z.number().min(0).max(1).optional(),
  setupStage: z.enum(['early', 'emerging', 'confirmed', 'extended', 'late']).optional(),
  limit: z.number().int().min(1).max(500).default(100),
});
export type CandidateQuery = z.infer<typeof candidateQuerySchema>;

/** Causal graph "who benefits" query. */
export const causalQuerySchema = z.object({
  from: z.string().min(1),
  maxOrder: z.number().int().min(1).max(6).default(4),
  minWeight: z.number().min(0).max(1).default(0.05),
});
export type CausalQuery = z.infer<typeof causalQuerySchema>;

/** Pipeline run request. */
export const pipelineRequestSchema = z.object({
  profile: scoringProfileSchema.optional(),
  regimeOverride: operatingModeSchema.optional(),
});
export type PipelineRequest = z.infer<typeof pipelineRequestSchema>;
