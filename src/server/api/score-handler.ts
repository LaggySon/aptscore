import { scoreRequestSchema } from './schemas/score';
import { LocationUnresolved, ScoringUnavailable } from '../domain/errors';
import type { ScoringService } from '../services/scoring-service';

/** Framework-agnostic POST /score handler. Maps domain errors to HTTP status codes. */
export const handleScore = async (
  service: ScoringService,
  rawBody: unknown,
): Promise<{ status: number; body: unknown }> => {
  const parsed = scoreRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        code: 'invalid_request',
        message: parsed.error.issues[0]?.message ?? 'Invalid request',
      },
    };
  }

  try {
    return { status: 200, body: await service.score(parsed.data) };
  } catch (error) {
    if (error instanceof LocationUnresolved) {
      return { status: 422, body: { code: error.code, message: error.message } };
    }
    if (error instanceof ScoringUnavailable) {
      return { status: 503, body: { code: error.code, message: error.message } };
    }
    throw error;
  }
};
