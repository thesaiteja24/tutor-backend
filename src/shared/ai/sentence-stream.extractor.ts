export class SentenceStreamExtractor {
  private insideContent = false;
  private inString = false;
  private escapeNext = false;
  private sentenceBuffer = "";
  private accumulatedContent = "";

  feed(
    chunk: string,
    onSentence?: (sentence: string) => Promise<void> | void,
    onTextDelta?: (delta: string) => Promise<void> | void,
  ) {
    for (let i = 0; i < chunk.length; i++) {
      const char = chunk[i];
      if (!char) continue;

      if (this.escapeNext) {
        this.escapeNext = false;
        if (this.insideContent) {
          const unescaped = char === "n" ? "\n" : char === "t" ? "\t" : char;
          this.sentenceBuffer += unescaped;
          this.accumulatedContent += unescaped;
          if (onTextDelta) onTextDelta(unescaped);
        }
        continue;
      }

      if (char === "\\") {
        this.escapeNext = true;
        continue;
      }

      if (char === '"') {
        this.inString = !this.inString;
        if (this.insideContent && !this.inString) {
          this.insideContent = false;
          if (this.sentenceBuffer.trim().length > 0 && onSentence) {
            onSentence(this.sentenceBuffer.trim());
            this.sentenceBuffer = "";
          }
        }
        continue;
      }

      if (!this.insideContent && this.inString) {
        const fullBufferSoFar = this.accumulatedContent + chunk.slice(0, i);
        if (
          fullBufferSoFar.includes('"content"') &&
          fullBufferSoFar.lastIndexOf('"content"') > fullBufferSoFar.lastIndexOf('"learningState"') &&
          fullBufferSoFar.lastIndexOf('"content"') > fullBufferSoFar.lastIndexOf('"correction"')
        ) {
          this.insideContent = true;
        }
      }

      if (this.insideContent) {
        this.sentenceBuffer += char;
        this.accumulatedContent += char;
        if (onTextDelta) onTextDelta(char);

        if (
          (char === "." || char === "!" || char === "?" || char === "\n") &&
          this.sentenceBuffer.trim().length > 15
        ) {
          if (onSentence) {
            onSentence(this.sentenceBuffer.trim());
          }
          this.sentenceBuffer = "";
        }
      }
    }
  }

  flush(onSentence: (sentence: string) => Promise<void> | void) {
    if (this.sentenceBuffer.trim().length > 0) {
      onSentence(this.sentenceBuffer.trim());
      this.sentenceBuffer = "";
    }
  }

  getCompleteContent(): string {
    return this.accumulatedContent;
  }
}
