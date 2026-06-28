import { handleInterestTypes } from '../../../../server/api/interest-types-handler';

export const runtime = 'nodejs';

export const GET = () => {
  const { status, body } = handleInterestTypes();
  return Response.json(body, { status });
};
