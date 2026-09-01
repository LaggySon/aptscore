import type { IsochroneService } from '../services/isochrone-service';
import { LocationUnresolved, ScoringUnavailable } from '../domain/errors';
import { isochroneRequestSchema } from './schemas/isochrone';

export const handleIsochrone = async (
  service: IsochroneService,
  rawBody: unknown,
): Promise<{ status: number; body: unknown }> => {
  const parsed = isochroneRequestSchema.safeParse(rawBody);
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
    return { status: 200, body: await service.isochrone(parsed.data) };
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
