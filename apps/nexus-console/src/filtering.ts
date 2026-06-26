export function textMatches(haystacks: Array<string | undefined>, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return true;
  }
  return haystacks.some((value) => Boolean(value) && value!.toLowerCase().includes(needle));
}

export function pinSelected<T>(records: T[], selected: T | undefined, getId: (record: T) => string): T[] {
  if (!selected) {
    return records;
  }
  const selectedId = getId(selected);
  if (records.some((record) => getId(record) === selectedId)) {
    return records;
  }
  return [selected, ...records];
}

export function uniqueOptions(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort();
}
