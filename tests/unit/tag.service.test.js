import { jest } from '@jest/globals';

const mockPrisma = {
  tag: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.unstable_mockModule('../../src/config/db.js', () => ({
  default: mockPrisma,
}));

const { getAllTags, getTagById, createTag, updateTag, deleteTag } = await import(
  '../../src/services/tag.service.js'
);

describe('tag.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAllTags returns whatever Prisma finds', async () => {
    const seeded = [{ id: 1, name: 'billing' }];
    mockPrisma.tag.findMany.mockResolvedValue(seeded);

    const tags = await getAllTags();

    expect(tags).toBe(seeded);
  });

  it('getTagById looks up a tag by id', async () => {
    const tag = { id: 1, name: 'billing' };
    mockPrisma.tag.findUnique.mockResolvedValue(tag);

    const result = await getTagById(1);

    expect(result).toBe(tag);
    expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('createTag passes name through to Prisma', async () => {
    const created = { id: 2, name: 'urgent' };
    mockPrisma.tag.create.mockResolvedValue(created);

    const tag = await createTag({ name: 'urgent' });

    expect(tag).toBe(created);
    expect(mockPrisma.tag.create).toHaveBeenCalledWith({ data: { name: 'urgent' } });
  });

  it('updateTag passes the given changes through to Prisma', async () => {
    const updated = { id: 1, name: 'renamed' };
    mockPrisma.tag.update.mockResolvedValue(updated);

    const tag = await updateTag(1, { name: 'renamed' });

    expect(tag).toBe(updated);
    expect(mockPrisma.tag.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'renamed' },
    });
  });

  it('deleteTag deletes by id', async () => {
    mockPrisma.tag.delete.mockResolvedValue({ id: 1 });

    await deleteTag(1);

    expect(mockPrisma.tag.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
