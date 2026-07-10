import { useEffect } from 'react';

function isGivebutterSuccessPayload(data) {
  if (!data || typeof data !== 'object') return false;

  const eventName = String(data.event || data.type || data.name || '').toLowerCase();
  if (eventName.includes('transaction.succeeded') || eventName.includes('donation.success')) {
    return true;
  }

  if (data.status === 'success' || data.success === true) return true;
  if (data.completed === true) return true;

  return false;
}

export function syncGivebutterUrlParams({
  amount,
  frequency,
  kittenId,
  kittenName,
  tier,
  sponsor = false,
}) {
  const params = new URLSearchParams(window.location.search);

  if (amount != null && amount !== '') params.set('amount', String(amount));
  else params.delete('amount');

  if (frequency) params.set('frequency', frequency);
  else params.delete('frequency');

  if (sponsor) {
    params.set('sponsor', '1');
    if (kittenId != null) params.set('kitten_id', String(kittenId));
    if (kittenName) params.set('kitten_name', kittenName);
    if (tier) params.set('tier', tier);
  } else {
    params.delete('sponsor');
    params.delete('kitten_id');
    params.delete('kitten_name');
    params.delete('tier');
  }

  const query = params.toString();
  const nextUrl = query
    ? `${window.location.pathname}?${query}${window.location.hash}`
    : `${window.location.pathname}${window.location.hash}`;

  window.history.replaceState({}, '', nextUrl);
}

export function useGivebutterCheckoutSuccess(onSuccess) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('donation') === 'success' || params.get('sponsor') === 'success') {
      onSuccess?.({ source: 'url' });
    }
  }, [onSuccess]);

  useEffect(() => {
    function handleMessage(event) {
      if (!event?.origin || !event.origin.includes('givebutter.com')) return;
      if (!isGivebutterSuccessPayload(event.data)) return;
      onSuccess?.({ source: 'widget', payload: event.data });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess]);
}

export function markCheckoutSuccessParam(mode = 'donation') {
  const params = new URLSearchParams(window.location.search);
  params.set(mode, 'success');
  const query = params.toString();
  window.history.replaceState({}, '', `${window.location.pathname}?${query}${window.location.hash}`);
}
