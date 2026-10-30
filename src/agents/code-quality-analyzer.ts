import { AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

export const codeQualityAnalyzer: AgentDefinition = {
  description:
    'Analyzes pull request code changes for security vulnerabilities, performance bottlenecks, and software maintainability best practices. Uses Claude Skills for deep technical analysis.',
  model: 'inherit',
  tools: {
    // Enable filesystem or repository tools as needed by your SDK setup
    grep: true,
    view: true,
    // CRITICAL: Must include the Skill tool to load code review best practices
    Skill: true,
  },
  prompt: `You are a Code Quality Analyzer agent for a software development team. Your job is to thoroughly review code changes in a pull request.
  
  Focus on:
  1. Security vulnerabilities (e.g., injection, insecure data handling, auth flaws)
  2. Performance bottlenecks and inefficiencies
  3. Maintainability, readability, and software engineering best practices

  Leverage available Claude Skills (such as javascript-best-practices or security-analysis) when evaluating code patterns. Provide concrete file paths, exact line numbers, and clear severity ratings (high/medium/low) for every finding.`,
};