import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiExtractor } from './geminiExtractor';
import { config } from '../shared/config';

describe('GeminiExtractor', () => {
  let extractor: GeminiExtractor;

  beforeEach(() => {
    extractor = new GeminiExtractor();
    document.body.innerHTML = ''; // Clean up DOM before each test
  });

  it('should extract a single prompt correctly', async () => {
    // Arrange
    document.body.innerHTML = `
      <div>
        <span class="${config.SELECTORS.gemini.promptContainer.replace(/\./g, ' ')}">
          <p class="query-text-line">Hello, world!</p>
        </span>
      </div>
    `;

    // Act
    const result = await extractor.extract();

    // Assert
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.data.body).toHaveLength(1);
      expect(result.data.body[0].id).toBe('prompt-0');
      expect(result.data.body[0].content).toEqual(['Hello, world!']);
    }
  });

  it('should extract multiple prompts in the correct order', async () => {
    // Arrange
    document.body.innerHTML = `
      <div>
        <span class="${config.SELECTORS.gemini.promptContainer.replace(/\./g, ' ')}">
          <p class="query-text-line">First prompt.</p>
        </span>
        <span class="${config.SELECTORS.gemini.promptContainer.replace(/\./g, ' ')}">
          <p class="query-text-line">Second prompt, line 1.</p>
          <p class="query-text-line">Second prompt, line 2.</p>
        </span>
      </div>
    `;

    // Act
    const result = await extractor.extract();

    // Assert
    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.data.body).toHaveLength(2);
      expect(result.data.body[0].id).toBe('prompt-0');
      expect(result.data.body[0].content).toEqual(['First prompt.']);
      expect(result.data.body[1].id).toBe('prompt-1');
      expect(result.data.body[1].content).toEqual(['Second prompt, line 1.', 'Second prompt, line 2.']);
    }
  });

  it('should return an error if no prompt containers are found', async () => {
    // Arrange
    document.body.innerHTML = `<div>No prompts here.</div>`;

    // Act
    const result = await extractor.extract();

    // Assert
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.message).toBe('Content element not found after polling.');
    }
  });

  it('should handle prompts with no text content', async () => {
    // Arrange
    document.body.innerHTML = `
      <div>
        <span class="${config.SELECTORS.gemini.promptContainer.replace(/\./g, ' ')}">
          <p class="query-text-line"></p>
          <p class="query-text-line">   </p>
        </span>
        <span class="${config.SELECTORS.gemini.promptContainer.replace(/\./g, ' ')}">
        <p class="query-text-line">This one is valid.</p>
      </span>
      </div>
    `;

    // Act
    const result = await extractor.extract();

    // Assert
    expect(result.status).toBe('success');
    if (result.status === 'success') {
        expect(result.data.body).toHaveLength(1);
        expect(result.data.body[0].content).toEqual(['This one is valid.']);
    }
  });
});
