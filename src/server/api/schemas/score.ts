import { z } from 'zod';
import { isSupportedType } from '../../config/interest-types';

const importanceSchema = z.enum(['low', 'medium', 'high']);

const rangeSchema = z
  .object({
    mode: z.enum(['minutes', 'distance']),
    value: z.number().positive(),
    distanceUnit: z.enum(['m', 'km', 'mi']).optional(),
  })
  .refine((range) => range.mode === 'minutes' || range.distanceUnit !== undefined, {
    message: 'distanceUnit is required when range mode is "distance"',
  });

const locationSchema = z
  .object({
    query: z.string().min(1).optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
  })
  .refine(
    (location) =>
      location.query !== undefined ||
      (location.lat !== undefined && location.lng !== undefined),
    { message: 'Provide a location query or both lat and lng' },
  );

const interestSchema = z.object({
  typeId: z.string().refine(isSupportedType, { message: 'Unsupported interest type' }),
  importance: importanceSchema.optional(),
});

/** Request contract for POST /v1/score (mirrors contracts/openapi.yaml). */
export const scoreRequestSchema = z.object({
  location: locationSchema,
  interests: z.array(interestSchema).min(1, 'Select at least one interest type'),
  range: rangeSchema.optional(),
});

export type ScoreRequest = z.infer<typeof scoreRequestSchema>;
