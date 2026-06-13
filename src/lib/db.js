import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function getOrCreateContact(phone, name = null) {
  const existing = await prisma.contact.findUnique({ where: { phone } });
  if (existing) {
    if (name && !existing.name) {
      return await prisma.contact.update({
        where: { phone },
        data: { name }
      });
    }
    return existing;
  }
  return await prisma.contact.create({
    data: { phone, name }
  });
}

export async function saveMessage(phone, direction, content, messageType = 'text') {
  const contact = await getOrCreateContact(phone);
  const message = await prisma.onawaMessage.create({
    data: {
      contactId: contact.id,
      direction,
      content,
      messageType
    }
  });
  await prisma.contact.update({
    where: { id: contact.id },
    data: { lastMessageAt: new Date() }
  });
  return message;
}

export async function getAllContacts() {
  return await prisma.contact.findMany({
    include: {
      messages: { orderBy: { timestamp: 'asc' } }
    },
    orderBy: { lastMessageAt: 'desc' }
  });
}

export async function getContact(phone) {
  return await prisma.contact.findUnique({
    where: { phone },
    include: {
      messages: { orderBy: { timestamp: 'asc' } }
    }
  });
}

export async function markEscalated(phone, reason = 'Interest detected in conversation', advisorPhone = null) {
  const contact = await prisma.contact.update({
    where: { phone },
    data: {
      isEscalated: true,
      isInterested: true,
      status: 'escalated'
    }
  });
  await prisma.onawaEscalation.create({
    data: {
      contactId: contact.id,
      reason,
      advisorNotified: !!advisorPhone,
      advisorPhone
    }
  });
  return contact;
}

export default {
  prisma,
  getOrCreateContact,
  saveMessage,
  getAllContacts,
  getContact,
  markEscalated
};
