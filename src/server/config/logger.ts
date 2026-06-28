import pino from 'pino';
import { loadConfig } from './env';

/** Structured JSON logger (Constitution III — Observability). */
export const logger = pino({ level: loadConfig().logLevel });

export type Logger = pino.Logger;
