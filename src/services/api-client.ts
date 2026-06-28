import type { InterestTypeOption, ScoreRequest, ScoreResult } from '../types';

// Same-origin Next.js Route Handlers.
const BASE_URL = '/api/v1';

/** Error carrying the backend's error code (e.g. scoring_unavailable) for friendly messaging. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Parse a non-2xx response into an ApiError, falling back to a generic message. */
const toApiError = async (response: Response): Promise<ApiError> => {
  const body = (await response.json().catch(() => null)) as
    | { code?: string; message?: string }
    | null;
  return new ApiError(
    body?.code ?? 'request_failed',
    body?.message ?? `Request failed (${response.status})`,
  );
};

export const fetchInterestTypes = async (): Promise<InterestTypeOption[]> => {
  const response = await fetch(`${BASE_URL}/interest-types`);
  if (!response.ok) throw await toApiError(response);
  const body = (await response.json()) as { interestTypes: InterestTypeOption[] };
  return body.interestTypes;
};

export const scoreLocation = async (request: ScoreRequest): Promise<ScoreResult> => {
  const response = await fetch(`${BASE_URL}/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as ScoreResult;
};
