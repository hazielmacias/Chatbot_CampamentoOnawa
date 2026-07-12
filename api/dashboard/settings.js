import {
  fetchBotMessages,
  upsertMessage,
  createMessage,
  deleteMessage,
  PROTECTED_KEYS
} from '../../src/lib/db.js';
import { getCacheMeta } from '../../src/bot/configCache.js';

function parseKeywords(input) {
  if (Array.isArray(input)) return input.map(s => String(s).trim().toLowerCase()).filter(Boolean);
  if (typeof input === 'string') {
    return input.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const messages = await fetchBotMessages();
      return res.status(200).json({
        messages,
        protectedKeys: Array.from(PROTECTED_KEYS),
        cache: getCacheMeta()
      });
    } catch (error) {
      console.error('GET settings error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const { key, title, content, description, sortOrder, keywords, mode } = req.body || {};
      if (!key || !title || typeof content !== 'string') {
        return res.status(400).json({ error: 'Faltan campos: key, title, content' });
      }
      const kw = parseKeywords(keywords);
      const sortNum = sortOrder !== undefined && sortOrder !== null && sortOrder !== '' ? Number(sortOrder) : undefined;
      const saved = await upsertMessage({ key, title, content, description, sortOrder: sortNum, keywords: kw });
      return res.status(200).json({ ok: true, message: saved, mode: mode || 'update' });
    } catch (error) {
      console.error('POST settings error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { key, title, content, description, sortOrder, keywords } = req.body || {};
      if (!key || !title || typeof content !== 'string') {
        return res.status(400).json({ error: 'Faltan campos: key, title, content' });
      }
      const kw = parseKeywords(keywords);
      const sortNum = sortOrder !== undefined && sortOrder !== null && sortOrder !== '' ? Number(sortOrder) : undefined;
      const saved = await createMessage({ key, title, content, description, sortOrder: sortNum, keywords: kw });
      return res.status(201).json({ ok: true, message: saved });
    } catch (error) {
      if (error.code === 'DUPLICATE_KEY') {
        return res.status(409).json({ error: 'Key duplicada', code: error.code, key: error.key });
      }
      console.error('PUT settings error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const key = req.query?.key || req.body?.key;
      if (!key) {
        return res.status(400).json({ error: 'Falta el campo key' });
      }
      const result = await deleteMessage(key);
      return res.status(200).json(result);
    } catch (error) {
      if (error.code === 'PROTECTED_KEY') {
        return res.status(403).json({ error: 'Key protegida', code: error.code, key: error.key });
      }
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'No existe', code: error.code, key: error.key });
      }
      console.error('DELETE settings error:', error);
      return res.status(500).json({ error: 'Error', message: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
