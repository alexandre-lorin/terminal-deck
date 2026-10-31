const { contextBridge, ipcRenderer } = require('electron');
const invoke = async (channel, ...args) => {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};
contextBridge.exposeInMainWorld('deck', {
  boot: () => invoke('deck:boot'), catalog: () => invoke('project:catalog'), addProject: folder => invoke('project:add', folder),
  addSession: args => invoke('session:add', args), removeSession: id => invoke('session:remove', id),
  start: args => invoke('terminal:start', args), attach: id => invoke('terminal:attach', id), write: args => invoke('terminal:write', args), resize: args => invoke('terminal:resize', args),
  ack: args => invoke('terminal:ack', args),
  save: state => invoke('deck:save', state),
  copy: text => invoke('clipboard:copy', text), paste: () => invoke('clipboard:paste'),
  dictation: args => invoke('dictation', args),
  attention: id => invoke('session:attention', id),
  onNavigate: callback => { const listener = (_event, id) => callback(id); ipcRenderer.on('session:navigate', listener); return () => ipcRenderer.removeListener('session:navigate', listener); },
  openStudio: () => invoke('studio:open'),
  quotas: force => invoke('quotas:read', force),
  git: projectId => invoke('git:status', projectId),
  onData: callback => { const listener = (_event, data) => callback(data); ipcRenderer.on('terminal:data', listener); return () => ipcRenderer.removeListener('terminal:data', listener); },
  onExit: callback => { const listener = (_event, data) => callback(data); ipcRenderer.on('terminal:exit', listener); return () => ipcRenderer.removeListener('terminal:exit', listener); }
});
