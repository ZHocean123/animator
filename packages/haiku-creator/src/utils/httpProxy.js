import { createRequire } from 'module';

// Use createRequire to get CommonJS-style access to http/https modules
const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');

// Setter functions for ESM compatibility
export const setHttpGlobalAgent = (agent) => {
  http.globalAgent = agent;
};

export const setHttpsGlobalAgent = (agent) => {
  https.globalAgent = agent;
};

export const setBothGlobalAgents = (agent) => {
  http.globalAgent = agent;
  https.globalAgent = agent;
};

export { http, https };