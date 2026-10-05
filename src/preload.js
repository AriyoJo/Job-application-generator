const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('documentAPI', {
  print: () => ipcRenderer.invoke('print-document'),
  savePDF: () => ipcRenderer.invoke('save-document-pdf'),

  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    create: (profile) => ipcRenderer.invoke('profiles:create', profile),
    update: (id, profile) => ipcRenderer.invoke('profiles:update', id, profile),
    delete: (id) => ipcRenderer.invoke('profiles:delete', id),
  },
});
