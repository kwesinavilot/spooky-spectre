import { describe, expect, it } from 'vitest';
import { statusFromHttp } from '../src/aiConnect';

describe('statusFromHttp', () => {
  it('treats 2xx as connected and 429 as connected but rate limited', () => {
    expect(statusFromHttp('anthropic', 200)).toBe('connected');
    expect(statusFromHttp('openai', 429)).toBe('rate_limited');
  });

  it('reports a rejected key for 401 and 403', () => {
    expect(statusFromHttp('anthropic', 401)).toBe('invalid_key');
    expect(statusFromHttp('gemini', 403)).toBe('invalid_key');
  });

  it('never blames a key for Ollama, which has none', () => {
    expect(statusFromHttp('ollama', 403)).toBe('network_error');
  });

  it('reports other failures as network errors', () => {
    expect(statusFromHttp('openai', 500)).toBe('network_error');
  });
});
