import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function createEntity(tableName) {
  return {
    list: async (sort) => {
      let query = supabase.from(tableName).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        const field = desc ? sort.slice(1) : sort;
        query = query.order(field, { ascending: !desc });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    filter: async (queryObj) => {
      let query = supabase.from(tableName).select('*');
      for (const [key, value] of Object.entries(queryObj)) {
        query = query.eq(key, value);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    get: async (id) => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },

    create: async (rowData) => {
      const newItem = {
        id: generateId(),
        created_date: new Date().toISOString(),
        ...rowData,
      };
      const { data, error } = await supabase
        .from(tableName)
        .insert(newItem)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    update: async (id, rowData) => {
      const { data, error } = await supabase
        .from(tableName)
        .update(rowData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    delete: async (id) => {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },

    subscribe: (callback) => {
      const channel = supabase
        .channel(`realtime:${tableName}:${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
          callback();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    },
  };
}

export const entities = {
  Service:      createEntity('Service'),
  Queue:        createEntity('Queue'),
  Participant:  createEntity('Participant'),
  User:         createEntity('User'),
  EventSetting: createEntity('EventSetting'),
  QueueEvent:   createEntity('QueueEvent'),
};

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

export const functions = {
  invoke: async (name, params = {}) => {
    if (name === 'getDemoToken') {
      const { username, password } = params;
      const { data: users, error } = await supabase
        .from('User')
        .select('*')
        .or(`username.eq.${username},email.eq.${username}`)
        .eq('password', password)
        .limit(1);

      if (error) throw error;
      const user = users?.[0];
      if (!user) throw new Error('Username atau password salah');

      const token = 'sb_' + generateId();
      localStorage.setItem('token', token);
      localStorage.setItem(USER_KEY, JSON.stringify({
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      }));
      return { data: { token } };
    }

    if (name === 'createAppUser') {
      const { email, username, password, role, full_name } = params;
      const { data: existing } = await supabase
        .from('User')
        .select('id')
        .or(`email.eq.${email},username.eq.${username || email}`)
        .limit(1);

      if (existing?.length > 0) throw new Error('User sudah ada');

      const newUser = {
        id: generateId(),
        email,
        username: username || email,
        password: password || '',
        role: role || 'nakes',
        full_name: full_name || email,
        created_date: new Date().toISOString(),
      };
      const { data, error } = await supabase.from('User').insert(newUser).select().single();
      if (error) throw error;
      return { data };
    }

    throw new Error(`Function '${name}' not implemented`);
  },
};

export const users = {
  inviteUser: async (email, role) => {
    const { data: existing } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (existing?.length > 0) return existing[0];

    const newUser = {
      id: generateId(),
      email,
      username: email,
      password: '',
      role: role || 'nakes',
      full_name: email,
      created_date: new Date().toISOString(),
    };
    const { data, error } = await supabase.from('User').insert(newUser).select().single();
    if (error) throw error;
    return data;
  },
};
