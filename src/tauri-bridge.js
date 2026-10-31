/* Même contrat que le preload Electron ; aucun accès système arbitraire. */
(() => {
  if (!window.__TAURI__) return;
  const { invoke } = window.__TAURI__.core;
  const subscriptions = new Map();
  const ready = Promise.all(['terminal:data', 'terminal:exit', 'session:navigate'].map(async name => {
    subscriptions.set(name, new Set());
    await window.__TAURI__.event.listen(name, ({ payload }) => {
      for (const callback of subscriptions.get(name)) callback(payload);
    });
  }));
  const call = async (channel, args = null) => { await ready; try { return await invoke('deck', { channel, args }); } catch (error) { throw new Error(typeof error === 'string' ? error : error.message || 'Action indisponible.'); } };
  const on = name => callback => { subscriptions.get(name).add(callback); return () => subscriptions.get(name).delete(callback); };
  window.deck = {
    boot: () => call('deck:boot'), catalog: () => call('project:catalog'), addProject: x => call('project:add', x),
    addSession: x => call('session:add', x), removeSession: x => call('session:remove', x),
    start: x => call('terminal:start', x), attach: x => call('terminal:attach', x), write: x => call('terminal:write', x),
    resize: x => call('terminal:resize', x), ack: x => call('terminal:ack', x), save: x => call('deck:save', x),
    copy: x => call('clipboard:copy', x), paste: () => call('clipboard:paste'), quotas: x => call('quotas:read', x),
    attention: x => call('session:attention', x), git: x => call('git:status', x), openStudio: () => call('studio:open'),
    onData: on('terminal:data'), onExit: on('terminal:exit'), onNavigate: on('session:navigate')
  };
})();
