/**
 * Runs a cycle and writes a markdown research brief to reports/latest.md.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { runPipeline } from '../orchestration/research_director';
import { generateResearchBrief } from '../reports/index';

async function main(): Promise<void> {
  const memory = await runPipeline();
  const brief = generateResearchBrief(memory.snapshot());
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = join(here, '..', 'reports');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'latest.md');
  writeFileSync(outPath, brief, 'utf8');
  console.log(`Research brief written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
