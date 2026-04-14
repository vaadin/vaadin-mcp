/**
 * Type declarations for modules without built-in TypeScript support
 */

declare module 'downdoc' {
  function downdoc(content: string, options?: { attributes?: Record<string, any> }): string;
  export default downdoc;
}

declare module '@asciidoctor/reducer' {
  export function register(): void;
}

// Override asciidoctor types for nodenext CJS interop.
// The package uses module.exports = function but its types declare export default,
// which doesn't work under nodenext module resolution.
declare module 'asciidoctor' {
  import type { Asciidoctor } from 'asciidoctor';
  function asciidoctor(): Asciidoctor;
  export = asciidoctor;
}
