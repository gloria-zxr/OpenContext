export function buildIdeaRefUrl({ threadId, entryId, date }) {
  const safeThreadId = encodeURIComponent(String(threadId || '').trim());
  const params = new URLSearchParams();
  if (entryId) params.set('entry', String(entryId));
  if (date) params.set('date', String(date));
  return `oc://idea/${safeThreadId}${params.toString() ? `?${params.toString()}` : ''}`;
}

export function parseIdeaRefUrl(href) {
  if (!href || !href.startsWith('oc://idea/')) return null;
  try {
    const url = new URL(href);
    const threadId = decodeURIComponent(String(url.pathname || '').replace(/^\/+/, ''));
    const entryId = url.searchParams.get('entry') || '';
    const date = url.searchParams.get('date') || '';
    return { threadId, entryId, date };
  } catch {
    const raw = href.slice('oc://idea/'.length);
    const [path, query = ''] = raw.split('?');
    const params = new URLSearchParams(query);
    return {
      threadId: decodeURIComponent(path || ''),
      entryId: params.get('entry') || '',
      date: params.get('date') || '',
    };
  }
}
