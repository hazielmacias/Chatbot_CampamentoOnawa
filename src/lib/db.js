import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://oqhoebtjqvbgwhdxszmk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const globalForSupabase = globalThis;
const supabase = globalForSupabase.supabase || createClient(SUPABASE_URL, SUPABASE_KEY);

if (process.env.NODE_ENV !== 'production') {
  globalForSupabase.supabase = supabase;
}

function toCamel(obj) {
  if (!obj) return obj;
  const out = {};
  for (const key of Object.keys(obj)) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camel] = obj[key];
  }
  return out;
}

export async function getOrCreateContact(phone, name = null) {
  const { data: existing, error: findErr } = await supabase
    .from('onawa_contacts')
    .select('*')
    .eq('phone', phone)
    .maybeSingle();

  if (findErr) throw findErr;

  if (existing) {
    const c = toCamel(existing);
    if (name && !c.name) {
      const { data, error } = await supabase
        .from('onawa_contacts')
        .update({ name })
        .eq('id', c.id)
        .select()
        .single();
      if (error) throw error;
      return toCamel(data);
    }
    return c;
  }

  const { data, error } = await supabase
    .from('onawa_contacts')
    .insert({ phone, name })
    .select()
    .single();

  if (error) throw error;
  return toCamel(data);
}

export async function saveMessage(phone, direction, content, messageType = 'text') {
  const contact = await getOrCreateContact(phone);
  const { data, error } = await supabase
    .from('onawa_messages')
    .insert({
      contact_id: contact.id,
      direction,
      content,
      message_type: messageType
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('onawa_contacts')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', contact.id);

  return toCamel(data);
}

export async function getAllContacts() {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .select('*, onawa_messages(*)')
    .order('last_message_at', { ascending: false });

  if (error) throw error;

  return (data || []).map(c => {
    const camel = toCamel(c);
    camel.messages = (c.onawa_messages || [])
      .map(toCamel)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return camel;
  });
}

export async function getContact(phone) {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .select('*, onawa_messages(*)')
    .eq('phone', phone)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const camel = toCamel(data);
  camel.messages = (data.onawa_messages || [])
    .map(toCamel)
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return camel;
}

export async function markEscalated(phone, reason = 'Interest detected', advisorPhone = null) {
  const { data, error } = await supabase
    .from('onawa_contacts')
    .update({
      is_escalated: true,
      is_interested: true,
      status: 'escalated'
    })
    .eq('phone', phone)
    .select()
    .single();

  if (error) throw error;

  if (data) {
    await supabase.from('onawa_escalations').insert({
      contact_id: data.id,
      reason,
      advisor_notified: !!advisorPhone,
      advisor_phone: advisorPhone
    });
  }

  return toCamel(data);
}

export default {
  getOrCreateContact,
  saveMessage,
  getAllContacts,
  getContact,
  markEscalated
};
