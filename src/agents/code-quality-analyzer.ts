import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { CODE_QUALITY_ANALYZER_PROMPT } from '../prompts/code-quality-analyzer.prompt.js';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes pull request code changes for security vulnerabilities, performance bottlenecks, and software maintainability best practices. Uses Claude Skills for deep technical analysis.',
  model: 'inherit',
  tools: {
    grep: true,
    view: true,
    Skill: true, // lets the agent invoke skills from .claude/skills/
  },
  prompt: CODE_QUALITY_ANALYZER_PROMPT,
};
