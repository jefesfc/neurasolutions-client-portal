import Anthropic from '@anthropic-ai/sdk';

// Clinic fork: set ANTHROPIC_API_KEY in EasyPanel and switch securityAnalyzer.ts
// to use this client with model 'claude-opus-4-8' instead of GPT-4o.
export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' });
