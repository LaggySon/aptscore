import { handleScore } from '../../../../server/api/score-handler';
import { getScoringService } from '../../../../server/container';

export const runtime = 'nodejs';

export const POST = async (request: Request) => {
  const rawBody = await request.json().catch(() => null);
  const { status, body } = await handleScore(getScoringService(), rawBody);
  return Response.json(body, { status });
};
