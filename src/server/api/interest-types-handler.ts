import { interestTypeCatalog } from '../config/interest-types';

/** Framework-agnostic GET /interest-types handler (FR-001). */
export const handleInterestTypes = (): { status: number; body: unknown } => ({
  status: 200,
  body: { interestTypes: interestTypeCatalog() },
});
