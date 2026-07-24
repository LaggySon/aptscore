import { handleIsochrone } from '../../../../server/api/isochrone-handler';
import { getIsochroneService } from '../../../../server/container';

export const runtime = 'nodejs';

export const POST = async (request: Request) => {
  const rawBody = await request.json().catch(() => null);
  const { status, body } = await handleIsochrone(getIsochroneService(), rawBody);
  return Response.json(body, { status });
};
