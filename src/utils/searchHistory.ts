/**
 * Search history persistence helper.
 *
 * Stores the user's recent search queries in localStorage so the Search
 * page can offer quick-repeat suggestions. Entries are kept unique and
 * capped to MAX_ITEMS (most recent first).
 */

const STORAGE_KEY = 'astolfy:searchHistory';
const MAX_ITEMS = 10;

export function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function addSearchToHistory(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return getSearchHistory();

  let history = getSearchHistory();

  // Remove any existing copy so the new entry becomes the most recent.
  history = history.filter((q) => q !== trimmed);
  history.unshift(trimmed);

  if (history.length > MAX_ITEMS) {
    history = history.slice(0, MAX_ITEMS);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('SearchHistory: unable to persist history', e);
  }

  return history;
}

export function removeSearchFromHistory(query: string): string[] {
  let history = getSearchHistory();
  history = history.filter((q) => q !== query);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('SearchHistory: unable to update history', e);
  }
  return history;
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('SearchHistory: unable to clear history', e);
  }
}