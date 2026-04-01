export {};

declare global {
  namespace Express {
    interface Request {
      /** Correlation id from pino-http (nestjs-pino) */
      id?: string;
    }
  }
}
