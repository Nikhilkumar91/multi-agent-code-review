import * as fs from 'fs';
import * as path from 'path';
import { CodeReviewOrchestrator } from './orchestrator.js';
import { ReportGenerator, logger, withRetry, withTimeout, withRateLimit } from './utils/index.js';
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // 1. Validate command-line arguments
  if (args.length < 3) {
    logger.error('Usage: npm run dev -- <owner> <repo> <prNumber>');
    logger.error('Example: npm run dev -- udacity cd14715-simple-todo-app 1');
    process.exit(1);
  }

  const [owner, repo, prNumberStr] = args;
  const prNumber = parseInt(prNumberStr, 10);

  if (Number.isNaN(prNumber) || prNumber <= 0) {
    logger.error(`Invalid pull request number: "${prNumberStr}". It must be a positive integer.`);
    process.exit(1);
  }

  // 2. Validate authentication (Anthropic API key OR AWS credentials)
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasAws = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);

  if (hasApiKey) {
    logger.info('Authentication: using ANTHROPIC_API_KEY');
  } else if (hasAws) {
    if (!process.env.AWS_REGION) {
      logger.error('AWS credentials found but AWS_REGION is not set. Set AWS_REGION (e.g., us-east-1).');
      process.exit(1);
    }
    logger.info('Authentication: using AWS credentials (Bedrock)');
  } else {
    logger.error('No authentication configured. Set ANTHROPIC_API_KEY, or AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_REGION.');
    process.exit(1);
  }

  // 3. Validate model
  if (!process.env.ANTHROPIC_MODEL) {
    logger.error('ANTHROPIC_MODEL is not set.');
    logger.error('  Anthropic API example: ANTHROPIC_MODEL=claude-sonnet-4-5-20250929');
    logger.error('  Bedrock example:       ANTHROPIC_MODEL=us.anthropic.claude-sonnet-4-5-20250929-v1:0');
    process.exit(1);
  }

  logger.info(`Starting review for ${owner}/${repo} PR #${prNumber}...`);

  try {
    // 4. Run the review
    const orchestrator = new CodeReviewOrchestrator();
    const report = await withRateLimit(
  () =>
    withRetry(
      () => withTimeout(() => orchestrator.reviewPullRequest(owner, repo, prNumber), 15 * 60 * 1000),
      2,    // retries
      2000  // base delay in ms
    ),
  20000   // estimated tokens
);

    // 5. Generate and save all three report formats
    const generator = new ReportGenerator();
    const reportsDir = path.resolve(process.env.PROJECT_ROOT || process.cwd(), 'reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const baseName = `${owner}_${repo}_${prNumber}`;
    const files = {
      json: path.join(reportsDir, `${baseName}.json`),
      markdown: path.join(reportsDir, `${baseName}.md`),
      html: path.join(reportsDir, `${baseName}.html`),
    };

    fs.writeFileSync(files.json, generator.generateJSONReport(report));
    fs.writeFileSync(files.markdown, generator.generateMarkdownReport(report));
    fs.writeFileSync(files.html, generator.generateHTMLReport(report));

    logger.info('Successfully generated all review reports:');
    logger.info(`- JSON:     ${files.json}`);
    logger.info(`- Markdown: ${files.markdown}`);
    logger.info(`- HTML:     ${files.html}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error during pull request review: ${message}`);
    if (error instanceof Error && error.stack) {
      logger.debug(error.stack);
    }
    process.exit(1);
  }
}

main();