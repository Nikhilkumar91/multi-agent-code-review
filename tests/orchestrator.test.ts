import { describe, it, expect } from 'vitest';
import { CodeReviewOrchestrator } from '../src/orchestrator.js';
import { mcpServersConfig } from '../src/config/mcp.config.js';
import { codeQualityAnalyzer, testCoverageAnalyzer, refactoringSuggester } from '../src/agents/index.js';
import { buildOrchestratorPrompt } from '../src/prompts/index.js';

describe('CodeReviewOrchestrator', () => {
  it('can be constructed with default options', () => {
    expect(new CodeReviewOrchestrator()).toBeInstanceOf(CodeReviewOrchestrator);
  });

  it('exposes a reviewPullRequest method', () => {
    expect(typeof CodeReviewOrchestrator.prototype.reviewPullRequest).toBe('function');
  });

  // Integration evidence: the real-PR workflow needs live credentials, so it is skipped here.
  // It was verified by running `npm run dev -- udacity cd14715-simple-todo-app <1|2|3>`,
  // which produced the 9 reports in reports/ (the same flow works for octocat/Hello-World #1).
  it.skip('reviews a real pull request (requires live credentials)', async () => {
    const report = await new CodeReviewOrchestrator().reviewPullRequest('octocat', 'Hello-World', 1);
    expect(report.summary).toBeDefined();
  });
});

describe('MCP configuration', () => {
  it('configures the GitHub and ESLint servers over stdio with npx', () => {
    for (const server of [mcpServersConfig.github, mcpServersConfig.eslint]) {
      expect(server.type).toBe('stdio');
      expect(server.command).toBe('npx');
      expect(server.args.length).toBeGreaterThan(0);
    }
  });

  it('maps GITHUB_TOKEN to the GitHub server environment', () => {
    expect(mcpServersConfig.github.env).toHaveProperty('GITHUB_PERSONAL_ACCESS_TOKEN');
  });
});

describe('subagent definitions', () => {
  const agents = {
    'code-quality-analyzer': codeQualityAnalyzer,
    'test-coverage-analyzer': testCoverageAnalyzer,
    'refactoring-suggester': refactoringSuggester,
  };

  for (const [name, agent] of Object.entries(agents)) {
    it(`${name} has a description, inherits the model and can use the Skill tool`, () => {
      expect(agent.description.length).toBeGreaterThan(20);
      expect(agent.model).toBe('inherit');
      expect(JSON.stringify(agent.tools)).toContain('Skill');
    });
  }
});

describe('orchestrator prompt', () => {
  it('names the PR and explicitly invokes all three subagents', () => {
    const prompt = buildOrchestratorPrompt('udacity', 'cd14715-simple-todo-app', 7);
    expect(prompt).toContain('udacity');
    expect(prompt).toContain('cd14715-simple-todo-app');
    expect(prompt).toContain('7');
    expect(prompt).toContain('code-quality-analyzer');
    expect(prompt).toContain('test-coverage-analyzer');
    expect(prompt).toContain('refactoring-suggester');
  });
});
