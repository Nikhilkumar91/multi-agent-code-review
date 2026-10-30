import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

export const refactoringSuggester: AgentDefinition = {
  description:
    'Identifies opportunities to modernize code patterns, apply design patterns, eliminate dead code, and improve architectural clarity.',
  model: 'inherit',
  tools: {
    grep: true,
    view: true,
  },
  prompt: `You are a Refactoring Suggester agent. Your job is to analyze code changes for architectural improvements and code modernization.
  
  Focus on:
  1. Identifying code duplication, dead logic, or overly complex functions that need extraction.
  2. Suggesting modern language features and clean design patterns.
  3. Providing clear before/after examples for your refactoring recommendations.`,
};