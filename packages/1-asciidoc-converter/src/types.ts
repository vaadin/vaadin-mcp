/**
 * Type declarations for modules without built-in TypeScript support
 */

declare module 'downdoc' {
  function downdoc(content: string, options?: { attributes?: Record<string, any> }): string;
  export = downdoc;
}

declare module '@asciidoctor/reducer' {
  export function register(): void;
} 