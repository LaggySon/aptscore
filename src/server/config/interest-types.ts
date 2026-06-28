import { SCORING } from '../domain/constants';
import type { InterestType } from '../domain/types';

/** Helper so each entry reads as `(id, label, providerTags)` with a shared default ceiling. */
const define = (id: string, label: string, providerMapping: string[]): InterestType => ({
  id,
  label,
  providerMapping,
  idealCeilingK: SCORING.idealPlacesCeiling,
});

/**
 * The closed catalog of supported interest types (FR-001), mapped to OpenStreetMap
 * tags. The mapping is the only place that knows about provider categories.
 */
export const INTEREST_TYPES: readonly InterestType[] = [
  define('groceries', 'Groceries / supermarkets', ['shop=supermarket', 'shop=convenience']),
  define('transit', 'Public transit', ['public_transport=station', 'highway=bus_stop', 'railway=station']),
  define('cafes', 'Cafés', ['amenity=cafe']),
  define('restaurants', 'Restaurants', ['amenity=restaurant']),
  define('parks', 'Parks / green space', ['leisure=park', 'leisure=garden']),
  define('pharmacy', 'Pharmacy', ['amenity=pharmacy']),
  define('bookstores', 'Bookstores', ['shop=books']),
  define('pubs', 'Bars / pubs', ['amenity=pub', 'amenity=bar']),
  define('gyms', 'Gyms / fitness', ['leisure=fitness_centre', 'leisure=sports_centre']),
  define('schools', 'Schools', ['amenity=school', 'amenity=kindergarten']),
  define('healthcare', 'Healthcare', ['amenity=clinic', 'amenity=doctors']),
  define('libraries', 'Libraries', ['amenity=library']),
  define('bakeries', 'Bakeries', ['shop=bakery']),
  define('banks', 'Banks / ATMs', ['amenity=bank', 'amenity=atm']),
];

const byId = new Map(INTEREST_TYPES.map((type) => [type.id, type]));

export const interestTypeById = (id: string): InterestType | undefined => byId.get(id);

export const isSupportedType = (id: string): boolean => byId.has(id);

/** Public-facing catalog (id + label only) for GET /v1/interest-types. */
export const interestTypeCatalog = (): Array<Pick<InterestType, 'id' | 'label'>> =>
  INTEREST_TYPES.map(({ id, label }) => ({ id, label }));
