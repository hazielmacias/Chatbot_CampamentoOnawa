import pg from 'pg';
const { Pool } = pg;

const globalForPool = globalThis;
const pool = globalForPool.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1
});

if (process.env.NODE_ENV !== 'production') {
  globalForPool.pgPool = pool;
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

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows.map(toCamel);
}

export async function getOrCreateContact(phone, name = null) {
  const existing = await query('SELECT * FROM onawa_contacts WHERE phone = $1', [phone]);
  if (existing.length > 0) {
    const contact = existing[0];
    if (name && !contact.name) {
      const updated = await query(
        'UPDATE onawa_contacts SET name = $1, updated_at = now() WHERE id = $2 RETURNING *',
        [name, contact.id]
      );
      return updated[0];
    }
    return contact;
  }
  const created = await query(
    'INSERT INTO onawa_contacts (phone, name) VALUES ($1, $2) RETURNING *',
    [phone, name]
  );
  return created[0];
}

export async function saveMessage(phone, direction, content, messageType = 'text') {
  const contact = await getOrCreateContact(phone);
  const message = await query(
    `INSERT INTO onawa_messages (contact_id, direction, content, message_type)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [contact.id, direction, content, messageType]
  );
  await query(
    'UPDATE onawa_contacts SET last_message_at = now(), updated_at = now() WHERE id = $1',
    [contact.id]
  );
  return message[0];
}

export async function getAllContacts() {
  const contacts = await query(
    'SELECT * FROM onawa_contacts ORDER BY last_message_at DESC'
  );
  for (const contact of contacts) {
    contact.messages = await query(
      'SELECT * FROM onawa_messages WHERE contact_id = $1 ORDER BY timestamp ASC',
      [contact.id]
    );
  }
  return contacts;
}

export async function getContact(phone) {
  const contacts = await query('SELECT * FROM onawa_contacts WHERE phone = $1', [phone]);
  if (contacts.length === 0) return null;
  const contact = contacts[0];
  contact.messages = await query(
    'SELECT * FROM onawa_messages WHERE contact_id = $1 ORDER BY timestamp ASC',
    [contact.id]
  );
  return contact;
}

export async function markEscalated(phone, reason = 'Interest detected', advisorPhone = null) {
  const contact = await query(
    `UPDATE onawa_contacts
     SET is_escalated = true, is_interested = true, status = 'escalated', updated_at = now()
     WHERE phone = $1 RETURNING *`,
    [phone]
  );
  if (contact.length > 0) {
    await query(
      `INSERT INTO onawa_escalations (contact_id, reason, advisor_notified, advisor_phone)
       VALUES ($1, $2, $3, $4)`,
      [contact[0].id, reason, !!advisorPhone, advisorPhone]
    );
  }
  return contact[0];
}

export default {
  getOrCreateContact,
  saveMessage,
  getAllContacts,
  getContact,
  markEscalated
};
