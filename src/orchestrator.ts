import { query } from '@anthropic-ai/claude-agent-sdk';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ReviewReportSchema, type ReviewReport } from './types/index.js';
import { mcpServersConfig } from './config/mcp.config.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from './agents/index.js';
import { buildOrchestratorPrompt } from './prompts/index.js';

export interface OrchestratorOptions {}

/**
 * Main Code Review Orchestrator
 * Coordinates subagents to analyze pull requests and generate comprehensive reports
 */
export class CodeReviewOrchestrator {
  constructor(options: OrchestratorOptions = {}) {}

  async reviewPullRequest(
    owner: string,
    repo: string,
    prNumber: number
  ): Promise<ReviewReport> {
    const prompt = buildOrchestratorPrompt(owner, repo, prNumber);

    // Convert the Zod schema to JSON Schema for SDK structured output
    const jsonSchema = zodToJsonSchema(ReviewReportSchema, { $refStrategy: 'root' });

    const response = query({
      prompt,
      options: {
        model: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929',
        cwd: process.env.PROJECT_ROOT,
        settingSources: ['project'], // lets the Skill tool find .claude/skills/
        mcpServers: mcpServersConfig,
        agents: {
          'code-quality-analyzer': codeQualityAnalyzer,
          'test-coverage-analyzer': testCoverageAnalyzer,
          'refactoring-suggester': refactoringSuggester,
        },
        allowedTools: [
          'Task',            // spawns subagents
          'Skill',
          'mcp__github__*',  // GitHub MCP tools
          'mcp__eslint__*',  // ESLint MCP tools
        ],
        outputFormat: {
          type: 'json_schema',
          schema: jsonSchema,
        },
        maxTurns: 50,
      },
    });

    let finalOutput: unknown = null;

    for await (const message of response) {
      if (message.type === 'result') {
        if (message.subtype === 'success') {
          finalOutput = message.structured_output;
        } else {
          throw new Error(`Orchestrator run ended with "${message.subtype}" before producing a report.`);
        }
      }
    }

    if (!finalOutput) {
      throw new Error('Orchestrator failed to produce a structured review report.');
    }

    // Validate against the Zod schema
    return ReviewReportSchema.parse(finalOutput);
  }
}