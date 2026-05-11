const DB_PREFIX = 'queuepro_';

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function getCollection(name) {
  try {
    const raw = localStorage.getItem(DB_PREFIX + name);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveCollection(name, data) {
  localStorage.setItem(DB_PREFIX + name, JSON.stringify(data));
  notifySubscribers(name);
}

// Simple event emitter for real-time subscriptions
const _subscribers = {};

function notifySubscribers(name) {
  (_subscribers[name] || []).forEach(cb => { try { cb(); } catch {} });
}

function subscribe(name, callback) {
  if (!_subscribers[name]) _subscribers[name] = [];
  _subscribers[name].push(callback);
  return () => {
    _subscribers[name] = _subscribers[name].filter(cb => cb !== callback);
  };
}

function createEntity(name) {
  const init = () => {
    if (getCollection(name) === null) saveCollection(name, []);
  };

  return {
    list: async (sort) => {
      init();
      const items = [...getCollection(name)];
      if (sort) {
        const desc = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        items.sort((a, b) => {
          if (a[field] < b[field]) return desc ? 1 : -1;
          if (a[field] > b[field]) return desc ? -1 : 1;
          return 0;
        });
      }
      return items;
    },
    filter: async (query) => {
      init();
      return getCollection(name).filter(item =>
        Object.entries(query).every(([k, v]) => item[k] === v)
      );
    },
    get: async (id) => {
      init();
      const item = getCollection(name).find(i => i.id === id);
      if (!item) throw new Error(`${name}:${id} not found`);
      return item;
    },
    create: async (data) => {
      init();
      const items = getCollection(name);
      const newItem = { id: generateId(), created_date: new Date().toISOString(), ...data };
      items.push(newItem);
      saveCollection(name, items);
      return newItem;
    },
    update: async (id, data) => {
      init();
      const items = getCollection(name);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) throw new Error(`${name}:${id} not found`);
      items[idx] = { ...items[idx], ...data };
      saveCollection(name, items);
      return items[idx];
    },
    delete: async (id) => {
      init();
      const items = getCollection(name);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) throw new Error(`${name}:${id} not found`);
      items.splice(idx, 1);
      saveCollection(name, items);
    },
    subscribe: (callback) => subscribe(name, callback),
  };
}

// ── Seed data ────────────────────────────────────────────────────────────────

const DEMO_USERS = [
  { id: 'user-admin', email: 'admin@demo.com', username: 'admin', password: 'admin123', role: 'admin', full_name: 'Admin Pusat', created_date: new Date().toISOString() },
  { id: 'user-nakes', email: 'nakes@demo.com', username: 'nakes', password: 'nakes', role: 'nakes', full_name: 'Petugas Nakes', created_date: new Date().toISOString() },
];

const SEED_SERVICES = [
  { id: 'svc-a', service_code: 'A', service_name: 'Mini MCU',             service_group: 'MEDICAL',    booth_number: 1, free_quota: 100,  rp1_quota: 100, special_quota: 100, used_free_quota: 0, used_rp1_quota: 0, used_special_quota: 0, is_active: true, provider: 'Primaya Hospital', created_date: new Date().toISOString() },
  { id: 'svc-b', service_code: 'B', service_name: 'Vitamin C Injection',   service_group: 'MEDICAL',    booth_number: 2, free_quota: 25,   rp1_quota: 25,  special_quota: 250, used_free_quota: 0, used_rp1_quota: 0, used_special_quota: 0, is_active: true, provider: 'Primaya Hospital', created_date: new Date().toISOString() },
  { id: 'svc-c', service_code: 'C', service_name: 'Influenza Vaccine',     service_group: 'MEDICAL',    booth_number: 3, free_quota: 25,   rp1_quota: 25,  special_quota: 250, used_free_quota: 0, used_rp1_quota: 0, used_special_quota: 0, is_active: true, provider: 'Primaya Hospital', created_date: new Date().toISOString() },
  { id: 'svc-d', service_code: 'D', service_name: 'Eye Check (Airdoc)',    service_group: 'EYE_CHECK',  booth_number: 4, free_quota: 50,   rp1_quota: 0,   special_quota: 250, used_free_quota: 0, used_rp1_quota: 0, used_special_quota: 0, is_active: true, provider: 'Optik Melawai',   created_date: new Date().toISOString() },
  { id: 'svc-e', service_code: 'E', service_name: 'Eye Check (Autoref)',   service_group: 'EYE_CHECK',  booth_number: 5, free_quota: 9999, rp1_quota: 0,   special_quota: 0,   used_free_quota: 0, used_rp1_quota: 0, used_special_quota: 0, is_active: true, provider: 'Optik Melawai',   created_date: new Date().toISOString() },
];

const SEED_EVENT = {
  id: 'evt-default',
  event_name: 'Brilian Talks Health Care 2025',
  event_headline: 'Kesehatan Untuk Semua',
  event_tagline: 'Healthy People, Healthy Performance',
  location: 'Aula Utama',
  event_date: new Date().toISOString().split('T')[0],
  max_participants: 750,
  free_check_quota: 750,
  payment_quota: 0,
  queue_monitor_url: typeof window !== 'undefined' ? window.location.origin + '/led-monitor' : '/led-monitor',
  mobile_monitor_url: typeof window !== 'undefined' ? window.location.origin + '/mobile-monitor' : '/mobile-monitor',
  event_status: 'ACTIVE',
  created_date: new Date().toISOString(),
};

function seedIfEmpty(name, data) {
  if (getCollection(name) === null) {
    localStorage.setItem(DB_PREFIX + name, JSON.stringify(data));
  }
}

const DATA_VERSION = '6.0';

function initSeeds() {
  const storedVersion = localStorage.getItem(DB_PREFIX + 'data_version');
  if (storedVersion !== DATA_VERSION) {
    // Re-seed master data on version change (preserves Queue/Participant data)
    localStorage.setItem(DB_PREFIX + 'Service', JSON.stringify(SEED_SERVICES));
    localStorage.setItem(DB_PREFIX + 'EventSetting', JSON.stringify([SEED_EVENT]));
    localStorage.setItem(DB_PREFIX + 'data_version', DATA_VERSION);
  }
  seedIfEmpty('Queue', []);
  seedIfEmpty('Participant', []);
  seedIfEmpty('QueueEvent', []);
  seedIfEmpty('User', DEMO_USERS);
}

if (typeof window !== 'undefined') {
  initSeeds();
}

// ── Entities ─────────────────────────────────────────────────────────────────

export const entities = {
  Service: createEntity('Service'),
  Queue: createEntity('Queue'),
  Participant: createEntity('Participant'),
  User: createEntity('User'),
  EventSetting: createEntity('EventSetting'),
  QueueEvent: createEntity('QueueEvent'),
};

// ── Auth ──────────────────────────────────────────────────────────────────────

const USER_KEY = 'queuepro_current_user';

export const auth = {
  me: async () => {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('Not authenticated');
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) throw new Error('User session not found');
    return JSON.parse(raw);
  },
  logout: async () => {
    localStorage.removeItem('token');
    localStorage.removeItem(USER_KEY);
  },
};

// ── Functions ─────────────────────────────────────────────────────────────────

export const functions = {
  invoke: async (name, params = {}) => {
    if (name === 'getDemoToken') {
      const { username, password } = params;
      const user = DEMO_USERS.find(
        u => (u.username === username || u.email === username) && u.password === password
      );
      if (!user) throw new Error('Username atau password salah');
      const token = 'local_' + generateId();
      localStorage.setItem('token', token);
      localStorage.setItem(USER_KEY, JSON.stringify({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }));
      return { data: { token } };
    }

    if (name === 'createAppUser') {
      const { email, username, password, role, full_name } = params;
      const allUsers = getCollection('User') || [];
      if (allUsers.find(u => u.email === email || u.username === username)) {
        throw new Error('User sudah ada');
      }
      const newUser = {
        id: generateId(),
        email,
        username: username || email,
        password: password || '',
        role: role || 'nakes',
        full_name: full_name || email,
        created_date: new Date().toISOString(),
      };
      allUsers.push(newUser);
      saveCollection('User', allUsers);
      return { data: newUser };
    }

    throw new Error(`Function '${name}' not implemented locally`);
  },
};

// ── Users management ──────────────────────────────────────────────────────────

export const users = {
  inviteUser: async (email, role) => {
    const allUsers = getCollection('User') || [];
    const existing = allUsers.find(u => u.email === email);
    if (existing) return existing;
    const newUser = {
      id: generateId(),
      email,
      username: email,
      password: '',
      role: role || 'nakes',
      full_name: email,
      created_date: new Date().toISOString(),
    };
    allUsers.push(newUser);
    saveCollection('User', allUsers);
    return newUser;
  },
};
