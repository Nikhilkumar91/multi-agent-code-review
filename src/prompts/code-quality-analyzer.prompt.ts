export const CODE_QUALITY_ANALYZER_PROMPT = `
Analyze the provided pull request code changes for code quality, security vulnerabilities, performance issues, and maintainability concerns.
Provide specific file paths, line numbers, severity levels (high/medium/low), and descriptions for every finding. Leverage Claude Skills when applicable.
`;