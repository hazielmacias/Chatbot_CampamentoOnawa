const conversations = new Map();

export function getOrCreateContact(phone, name = null) {
  if (!conversations.has(phone)) {
    conversations.set(phone, {
      phone,
      name,
      messages: [],
      isEscalated: false,
      isInterested: false,
      createdAt: new Date().toISOString()
    });
  } else if (name) {
    const contact = conversations.get(phone);
    if (!contact.name) contact.name = name;
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
