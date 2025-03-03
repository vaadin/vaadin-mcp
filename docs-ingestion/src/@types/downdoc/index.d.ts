declare module 'downdoc' {
  /**
   * Convert AsciiDoc content to Markdown
   * @param asciidoc - The AsciiDoc content to convert
   * @param options - Optional configuration options
   * @returns The converted Markdown content
   */
  function downdoc(asciidoc: string, options?: {
    attributes?: Record<string, any>;
  }): string;

  export = downdoc;
}
