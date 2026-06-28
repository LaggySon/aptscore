/** Join class names, dropping falsey values. Keeps Tailwind class lists readable (DRY). */
export const cn = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');
