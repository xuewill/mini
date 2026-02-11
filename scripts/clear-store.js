const Store = require('electron-store');
const store = new Store();
console.log('Current store path:', store.path);
store.store = {
    theme: 'system',
    openai: {
      apiKey: '',
      baseURL: 'https://api.openai.com/v1',
      models: [
        { id: 'gpt-4o', name: 'GPT-4o', enabled: true },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', enabled: true }
      ]
    },
    mcp: {
      servers: [],
      configPath: ''
    },
    sessions: []
};
console.log('Store reset complete.');
