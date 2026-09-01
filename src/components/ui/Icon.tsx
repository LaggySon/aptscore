import type { SVGProps } from 'react';

export type IconName =
  | 'arrow-left'
  | 'arrow-right'
  | 'bank'
  | 'book'
  | 'cafe'
  | 'check'
  | 'chevron-down'
  | 'cross'
  | 'dumbbell'
  | 'groceries'
  | 'heart'
  | 'layers'
  | 'library'
  | 'location'
  | 'minus'
  | 'park'
  | 'pharmacy'
  | 'plus'
  | 'pub'
  | 'restaurant'
  | 'school'
  | 'search'
  | 'sparkle'
  | 'transit'
  | 'walk';

const paths: Record<IconName, React.ReactNode> = {
  'arrow-left': <path d="m15 18-6-6 6-6" />,
  'arrow-right': (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  bank: (
    <>
      <path d="m3 10 9-6 9 6" />
      <path d="M5 10h14M6 10v7m4-7v7m4-7v7m4-7v7M4 20h16" />
    </>
  ),
  book: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </>
  ),
  cafe: (
    <>
      <path d="M5 8h12v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z" />
      <path d="M17 10h1a3 3 0 0 1 0 6h-2M6 21h12M8 3v2m4-2v2m4-2v2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  cross: (
    <>
      <path d="M12 2v20M2 12h20" />
      <rect x="5" y="5" width="14" height="14" rx="3" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6 7v10M3 9v6m15-8v10m3-8v6M6 12h12" />
    </>
  ),
  groceries: (
    <>
      <path d="M3 4h2l2.2 10h9.9l2-7H6" />
      <circle cx="9" cy="19" r="1.4" />
      <circle cx="17" cy="19" r="1.4" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
  ),
  layers: (
    <>
      <path d="m12 2 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
    </>
  ),
  library: (
    <>
      <path d="M4 19.5V5l5-2v16.5M9 5h11v14.5M2 21h20" />
      <path d="M13 9h3m-3 4h3" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  park: (
    <>
      <path d="m12 3-5 7h3l-4 6h12l-4-6h3l-5-7Z" />
      <path d="M12 16v5" />
    </>
  ),
  pharmacy: (
    <>
      <path d="M9 3h6v18H9zM3 9h18v6H3z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pub: (
    <>
      <path d="M5 4h10l-1 9a4 4 0 0 1-8 0L5 4Z" />
      <path d="M8 21h6m-3-4v4m4-14h2a3 3 0 0 1 0 6h-3" />
    </>
  ),
  restaurant: (
    <>
      <path d="M7 3v8m-3-8v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18m0-18c-3 2-3 7 0 9" />
    </>
  ),
  school: (
    <>
      <path d="m3 10 9-6 9 6-9 6-9-6Z" />
      <path d="M7 13v4c3 2 7 2 10 0v-4M21 10v6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  sparkle: (
    <>
      <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </>
  ),
  transit: (
    <>
      <rect x="5" y="3" width="14" height="14" rx="3" />
      <path d="M8 7h8M8 12h8m-7 5-2 4m8-4 2 4" />
      <circle cx="9" cy="14" r=".7" fill="currentColor" />
      <circle cx="15" cy="14" r=".7" fill="currentColor" />
    </>
  ),
  walk: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="m10 21 2-6-3-3 2-5 4 3 3 1M6 21l3-6m3 0 4 6" />
    </>
  ),
};

export const Icon = ({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    {paths[name]}
  </svg>
);
