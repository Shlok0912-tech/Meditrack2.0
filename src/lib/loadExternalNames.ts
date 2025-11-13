export async function loadExternalNames(urls: string[] = ['/Train/labels.txt', '/labels.txt']): Promise<string[]> {
  const tried: string[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        tried.push(`${url} (${res.status})`);
        continue;
      }
      const text = await res.text();
      const names = text
        .split(/\r?\n/) // split lines
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => s.replace(/^[-•\s]+/, '')) // strip bullets/dashes
        .map((s) => s.replace(/\s+/g, ' ')); // normalize spaces
      // unique while preserving last occurrence case
      const map = new Map<string, string>();
      for (const n of names) map.set(n.toLowerCase(), n);
      const unique = Array.from(map.values());
      console.log(`📥 Loaded ${unique.length} external medicine names from ${url}`);
      return unique;
    } catch (e) {
      tried.push(`${url} (fetch error)`);
    }
  }
  console.warn('No external labels.txt found. Tried:', tried.join(', '));
  return [];
}
