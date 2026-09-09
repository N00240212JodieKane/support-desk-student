// A standalone resource this week — full CRUD, same shape as Ticket/Comment
// above. Tag already carries the M:N relation to Ticket in the Prisma schema
// (TicketTag, from Week 2), but attaching/detaching tags on a ticket isn't
// part of this week's scope — this is just the resource itself.
import prisma from '../config/db.js';

export const getAllTags = async () => prisma.tag.findMany({ orderBy: { name: 'asc' } });

export const getTagById = async (id) => prisma.tag.findUnique({ where: { id } });

export const createTag = async ({ name }) => prisma.tag.create({ data: { name } });

export const updateTag = async (id, changes) =>
  prisma.tag.update({ where: { id }, data: changes });

export const deleteTag = async (id) => prisma.tag.delete({ where: { id } });
