const Store = require('electron-store');
const store = new Store();
console.log('Current store path:', store.path);
console.log('Clearing mcp.servers...');
store.set('mcp.servers', []);
console.log('Done.');
