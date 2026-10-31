import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';
import { REFACTORING_SUGGESTER_PROMPT } from '../prompts/refactoring-suggester.prompt.js';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies refactoring opportunities in pull request changes: extract-function candidates, dead code, duplication, design-pattern improvements and modern language features, with before/after code.',
  model: 'inherit',
  tools: {
    grep: true,
    view: true,
    Skill: true, // lets the agent invoke skills from .claude/skills/
  },
  prompt: REFACTORING_SUGGESTER_PROMPT,
};
