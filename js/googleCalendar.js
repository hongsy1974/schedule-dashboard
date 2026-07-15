(function () {
  // Filled in once a Google Cloud OAuth Client ID is created for this site.
  // Not a secret — it's meant to be public in client-side code (same as the
  // Firebase config), it only identifies which app is requesting access.
  const CLIENT_ID = 'REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com';
  const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

  let tokenClient = null;
  let accessToken = null;

  function ensureTokenClient() {
    if (tokenClient) return tokenClient;
    if (!window.google || !google.accounts || !google.accounts.oauth2) return null;
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: () => {}, // overridden per-call in requestToken()
    });
    return tokenClient;
  }

  function requestToken() {
    return new Promise((resolve, reject) => {
      const client = ensureTokenClient();
      if (!client) {
        reject(new Error('Google 로그인 스크립트를 아직 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'));
        return;
      }
      client.callback = (resp) => {
        if (resp.error) { reject(new Error(resp.error)); return; }
        accessToken = resp.access_token;
        resolve(accessToken);
      };
      client.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
    });
  }

  function isConnected() { return !!accessToken; }

  function disconnect() {
    if (accessToken && window.google && google.accounts && google.accounts.oauth2) {
      google.accounts.oauth2.revoke(accessToken, () => {});
    }
    accessToken = null;
  }

  async function apiFetch(path, options) {
    const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
      ...options,
      headers: { ...(options && options.headers), Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Google Calendar API 오류 (${res.status}): ${body.slice(0, 200)}`);
    }
    if (res.status === 204) return null;
    return res.json();
  }

  function taskToEvent(t) {
    const typeLabel = App.const.TYPE[t.type] ? App.const.TYPE[t.type].label : t.type;
    return {
      summary: t.name,
      description: `[${typeLabel}] 진행률 ${t.progress}% · 상태 ${t.rawStatus}`,
      start: { date: t.due },
      end: { date: t.due },
    };
  }

  // Creates or updates the Google Calendar event for one task, keyed by the
  // task's already-known googleEventId (if any). Returns the event id to
  // store back on the task so future syncs update the same event instead of
  // creating duplicates.
  async function syncTask(t) {
    const body = taskToEvent(t);
    if (t.googleEventId) {
      try {
        await apiFetch(`/calendars/primary/events/${t.googleEventId}`, { method: 'PATCH', body: JSON.stringify(body) });
        return t.googleEventId;
      } catch (e) {
        // Event may have been deleted on the Google side since we last synced — fall through to recreate it.
      }
    }
    const created = await apiFetch('/calendars/primary/events', { method: 'POST', body: JSON.stringify(body) });
    return created.id;
  }

  async function deleteEvent(eventId) {
    if (!eventId || !accessToken) return;
    try {
      await apiFetch(`/calendars/primary/events/${eventId}`, { method: 'DELETE' });
    } catch (e) { /* best effort — nothing else to do if this fails */ }
  }

  window.App = window.App || {};
  App.googleCalendar = { requestToken, isConnected, disconnect, syncTask, deleteEvent };
})();
