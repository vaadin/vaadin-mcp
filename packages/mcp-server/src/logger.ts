/**
 * Simple logger that respects NODE_ENV for debug output
 */

const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  debug: (...args: any[]) => {
    if (!isProduction) {
      console.debug(...args);
    }
  },
  info: console.info,
  warn: console.warn,
  error: console.error,
};
