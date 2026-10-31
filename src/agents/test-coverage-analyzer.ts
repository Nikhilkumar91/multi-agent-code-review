import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { TEST_COVERAGE_ANALYZER_PROMPT } from '../prompts/test-coverage-analyzer.prompt.js';

export const testCoverageAnalyzer: AgentDefinition = {
  description:
    'Evaluates test completeness for pull request changes: finds untested functions, branches and edge cases, estimates coverage, and suggests specific test cases with meaningful assertions.',
  model: 'inherit',
  tools: {
    grep: true,
    view: true,
    Skill: true, // lets the agent invoke skills from .claude/skills/
  },
  prompt: TEST_COVERAGE_ANALYZER_PROMPT,
};
