import { randomUUID } from 'node:crypto';

/**
 * Deeply merges multiple source objects into a target object.
 * @param target the object to merge into
 * @param sources the source object to merge content from
 * @returns merged object
 */
export const deepMerge = <T extends Record<string, any>>(target: T, ...sources: any[]): T => {
  if (!sources.length) return target;

  for (const source of sources) {
    if (source == null || typeof source !== 'object') continue;

    for (const key of Object.keys(source)) {
      const src = source[key];
      const tgt = (target as any)[key];

      if (src != null && typeof src === 'object' && !Array.isArray(src)) {
        if (tgt != null && typeof tgt === 'object' && !Array.isArray(tgt)) {
          deepMerge(tgt, src);
        } else {
          (target as any)[key] = deepMerge({}, src);
        }
      } else if (Array.isArray(src)) {
        (target as any)[key] = src.slice();
      } else {
        (target as any)[key] = src;
      }
    }
  }
  return target;
};

export function generateRandomText(len: number, specialChars = '!@#$%^&*'): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const all = `${lower}${upper}${digits}${specialChars}`;

  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];

  // guarantee minimum character class requirements
  const required = [
    pick(lower), pick(lower),
    pick(upper), pick(upper),
    pick(digits), pick(digits),
    pick(specialChars), pick(specialChars),
  ];

  const effective = Math.max(len, required.length);

  for (let i = required.length; i < effective; i++) {
    required.push(pick(all));
  }

  // Fisher-Yates shuffle
  for (let i = required.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [required[i], required[j]] = [required[j], required[i]];
  }

  return required.join('');
}

export function generateUUID(): string {
  return randomUUID();
}

/** Short unique suffix for names and emails created by a test, e.g. `k3f9x2-1a2b`. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}-${randomUUID().slice(0, 4)}`;
}

/**
 * Checks whether compareObj is a complete subset of baseObj with matching values.
 * Arrays are compared strictly by default, regardless of element order.
 */
export function isSubsetObject(
  baseObj: Record<string, unknown>,
  compareObj: Record<string, unknown>,
  arrayStrict = true,
): boolean {
  const listIsSubsetOf = (parent: unknown[], child: unknown[]): boolean =>
    child.every(value => parent.includes(value));

  const listsMatchExactly = (first: unknown[], second: unknown[]): boolean => {
    if (first.length !== second.length) return false;

    const sortedFirst = [...first].sort();
    const sortedSecond = [...second].sort();
    return sortedFirst.every((value, index) => value === sortedSecond[index]);
  };

  const compareObjects = (
    base: Record<string, unknown>,
    compare: Record<string, unknown>,
  ): boolean => {
    for (const key of Object.keys(compare)) {
      const baseValue = base[key];
      const compareValue = compare[key];

      if (compareValue !== null && typeof compareValue === 'object' && !Array.isArray(compareValue)) {
        if (baseValue === null || typeof baseValue !== 'object' || Array.isArray(baseValue)) return false;
        if (!compareObjects(baseValue as Record<string, unknown>, compareValue as Record<string, unknown>)) return false;
      } else if (Array.isArray(compareValue) && Array.isArray(baseValue)) {
        const arraysMatch = arrayStrict
          ? listsMatchExactly(baseValue, compareValue)
          : listIsSubsetOf(baseValue, compareValue);
        if (!arraysMatch) return false;
      } else if (baseValue !== compareValue) {
        return false;
      }
    }

    return true;
  };

  return compareObjects(baseObj, compareObj);
}
