import { prisma } from "@/server/lib/prisma";
import { logger } from "@/server/lib/logger";
import { eventBus } from "@/server/events/event-bus";
import type { Prisma } from "@prisma/client";
import type { ContactListInput, ContactCreateInput, ContactUpdateInput } from "./contact.schemas";

const childLogger = logger.child({ service: "contact" });

export async function listContacts(input: ContactListInput) {
  const where: Prisma.ContactWhereInput = {
    organizationId: input.organizationId,
  };

  if (input.search) {
    where.OR = [
      { firstName: { contains: input.search, mode: "insensitive" } },
      { lastName: { contains: input.search, mode: "insensitive" } },
      { email: { contains: input.search, mode: "insensitive" } },
      { title: { contains: input.search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.contact.findMany({
    where,
    take: input.limit + 1,
    ...(input.cursor ? { skip: 1, cursor: { id: input.cursor } } : {}),
    orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }],
  });

  let nextCursor: string | undefined;
  if (items.length > input.limit) {
    const next = items.pop();
    nextCursor = next?.id;
  }

  return {
    items: items.map((c) => ({
      id: c.id,
      organizationId: c.organizationId,
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      title: c.title,
      isPrimary: c.isPrimary,
      invitationStatus: c.invitationStatus,
      linkedUserId: c.linkedUserId,
      createdAt: c.createdAt.toISOString(),
    })),
    nextCursor,
  };
}

export async function createContact(input: ContactCreateInput, actorId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true },
  });

  if (!org) {
    throw new ContactServiceError("Organization not found", "ORGANIZATION_NOT_FOUND");
  }

  const contact = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.isPrimary) {
      await tx.contact.updateMany({
        where: { organizationId: input.organizationId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return tx.contact.create({
      data: {
        organizationId: input.organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        title: input.title,
        isPrimary: input.isPrimary,
      },
    });
  });

  childLogger.info(
    { contactId: contact.id, organizationId: input.organizationId, actorId },
    "Contact created",
  );

  eventBus.emit("contact.created", {
    entity: "contact",
    entityId: contact.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: input.organizationId,
      name: `${input.firstName} ${input.lastName}`,
    },
  });

  return {
    id: contact.id,
    organizationId: contact.organizationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    isPrimary: contact.isPrimary,
    invitationStatus: contact.invitationStatus,
    linkedUserId: contact.linkedUserId,
    createdAt: contact.createdAt.toISOString(),
  };
}

export async function updateContact(input: ContactUpdateInput, actorId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id: input.id },
    select: { id: true, organizationId: true },
  });

  if (!existing) {
    throw new ContactServiceError("Contact not found", "CONTACT_NOT_FOUND");
  }

  const data: Prisma.ContactUpdateInput = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.title !== undefined) data.title = input.title;
  if (input.isPrimary !== undefined) data.isPrimary = input.isPrimary;

  const contact = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (input.isPrimary === true) {
      await tx.contact.updateMany({
        where: {
          organizationId: existing.organizationId,
          isPrimary: true,
          id: { not: input.id },
        },
        data: { isPrimary: false },
      });
    }

    return tx.contact.update({
      where: { id: input.id },
      data,
    });
  });

  childLogger.info({ contactId: contact.id, actorId }, "Contact updated");

  eventBus.emit("contact.updated", {
    entity: "contact",
    entityId: contact.id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: existing.organizationId,
      updatedFields: Object.keys(data),
    },
  });

  return {
    id: contact.id,
    organizationId: contact.organizationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    isPrimary: contact.isPrimary,
    invitationStatus: contact.invitationStatus,
    linkedUserId: contact.linkedUserId,
    createdAt: contact.createdAt.toISOString(),
  };
}

export async function deleteContact(id: string, actorId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, organizationId: true, firstName: true, lastName: true },
  });

  if (!existing) {
    throw new ContactServiceError("Contact not found", "CONTACT_NOT_FOUND");
  }

  await prisma.contact.delete({ where: { id } });

  childLogger.info({ contactId: id, actorId }, "Contact deleted");

  eventBus.emit("contact.deleted", {
    entity: "contact",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: existing.organizationId,
      name: `${existing.firstName} ${existing.lastName}`,
    },
  });

  return { id };
}

export async function markContactInvited(id: string, actorId: string) {
  const existing = await prisma.contact.findUnique({
    where: { id },
    select: { id: true, email: true, organizationId: true, invitationStatus: true },
  });

  if (!existing) {
    throw new ContactServiceError("Contact not found", "CONTACT_NOT_FOUND");
  }

  if (!existing.email) {
    throw new ContactServiceError("Contact must have an email to be invited", "CONTACT_NO_EMAIL");
  }

  if (existing.invitationStatus === "REGISTERED") {
    throw new ContactServiceError("Contact is already registered", "ALREADY_REGISTERED");
  }

  const contact = await prisma.contact.update({
    where: { id },
    data: {
      invitationStatus: "INVITED",
    },
  });

  childLogger.info({ contactId: id, actorId }, "Contact marked as invited");

  eventBus.emit("contact.invited", {
    entity: "contact",
    entityId: id,
    actor: actorId,
    timestamp: new Date().toISOString(),
    metadata: {
      organizationId: existing.organizationId,
      email: existing.email,
    },
  });

  return {
    id: contact.id,
    organizationId: contact.organizationId,
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email,
    phone: contact.phone,
    title: contact.title,
    isPrimary: contact.isPrimary,
    invitationStatus: contact.invitationStatus,
    linkedUserId: contact.linkedUserId,
    createdAt: contact.createdAt.toISOString(),
  };
}

export class ContactServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "ContactServiceError";
  }
}
