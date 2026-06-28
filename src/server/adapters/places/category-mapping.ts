import { interestTypeById } from '../../config/interest-types';

/** A parsed OpenStreetMap tag, e.g. `amenity=cafe` → `{ key: 'amenity', value: 'cafe' }`. */
export interface ProviderTag {
  key: string;
  value: string;
}

const parseTag = (tag: string): ProviderTag => {
  const [key, value] = tag.split('=');
  return { key, value };
};

/** Parsed provider tags for an interest type (empty when the type is unknown). */
export const providerTagsForType = (typeId: string): ProviderTag[] =>
  interestTypeById(typeId)?.providerMapping.map(parseTag) ?? [];
