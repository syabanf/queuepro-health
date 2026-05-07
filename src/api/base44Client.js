import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

let base44Instance = null;

function getBase44Client() {
  // Check for token in localStorage first (from login), then use appParams
  const storedToken = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
  const token = storedToken || appParams.token;
  
  // Only recreate if token changed
  if (!base44Instance || base44Instance._token !== token) {
    base44Instance = createClient({
      appId: appParams.appId,
      token,
      functionsVersion: appParams.functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl: appParams.appBaseUrl
    });
    base44Instance._token = token;
  }
  return base44Instance;
}

export const base44 = new Proxy({}, {
  get: (target, prop) => {
    return getBase44Client()[prop];
  }
});