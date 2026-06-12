const conversations = new Map();

export function getOrCreateContact(phone) {
  if (!conversations.has(phone)) {
    conversations.set(phone, {
      phone,
      messages: [],
      isEscalated: false,
      isInterested: false,
      createdAt: new Date().toISOString()
    });
  }
  return conversations.get(phone);
}

export function saveMessage(phone, direction, content) {
  const contact = getOrCreateContact(phone);
  contact.messages.push({
    direction,
    content,
    timestamp: new Date().toISOString()
  });
}

export function getAllContacts() {
  return Array.from(conversations.values());
}

export function getContact(phone) {
  return conversations.get(phone);
}

export function markEscalated(phone) {
  const contact = getOrCreateContact(phone);
  contact.isEscalated = true;
  contact.isInterested = true;
}
