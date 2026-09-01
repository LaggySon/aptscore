import { z } from 'zod';

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
      location.query !== undefined || (location.lat !== undefined && location.lng !== undefined),
    { message: 'Provide a location query or both lat and lng' },
  );

export const isochroneRequestSchema = z.object({
  location: locationSchema,
  range: rangeSchema.optional(),
});
