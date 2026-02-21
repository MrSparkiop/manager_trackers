import { Test, TestingModule } from '@nestjs/testing'
import { TagsService } from './tags.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotFoundException } from '@nestjs/common'

const mockPrisma = {
  tag: {
    findMany:  jest.fn(),
    findFirst: jest.fn(),
    create:    jest.fn(),
    update:    jest.fn(),
    delete:    jest.fn(),
  },
  task: {
    update: jest.fn(),
  },
}

const mockTag = {
  id: 'tag-id-1', name: 'Bug', color: '#ef4444',
  userId: 'user-id-1', createdAt: new Date(),
  _count: { tasks: 0 },
}

describe('TagsService', () => {
  let service: TagsService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<TagsService>(TagsService)
    jest.clearAllMocks()
  })

  // ── findAll ─────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return all tags for a user', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([mockTag])

      const result = await service.findAll('user-id-1')

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-id-1' } })
      )
      expect(result).toHaveLength(1)
    })
  })

  // ── create ──────────────────────────────────────────────────────
  describe('create', () => {
    it('should create a tag', async () => {
      mockPrisma.tag.create.mockResolvedValue(mockTag)

      const result = await service.create('user-id-1', { name: 'Bug', color: '#ef4444' })

      expect(mockPrisma.tag.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ name: 'Bug', userId: 'user-id-1' }) })
      )
      expect(result.name).toBe('Bug')
    })
  })

  // ── update ──────────────────────────────────────────────────────
  describe('update', () => {
    it('should update a tag', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(mockTag)
      mockPrisma.tag.update.mockResolvedValue({ ...mockTag, name: 'Feature' })

      const result = await service.update('tag-id-1', 'user-id-1', { name: 'Feature' })

      expect(result.name).toBe('Feature')
    })

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(null)

      await expect(service.update('bad-id', 'user-id-1', { name: 'X' })).rejects.toThrow(NotFoundException)
    })
  })

  // ── remove ──────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a tag', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(mockTag)
      mockPrisma.tag.delete.mockResolvedValue(mockTag)

      const result = await service.remove('tag-id-1', 'user-id-1')

      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({ where: { id: 'tag-id-1' } })
      expect(result).toEqual(mockTag)
    })

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(null)

      await expect(service.remove('bad-id', 'user-id-1')).rejects.toThrow(NotFoundException)
    })
  })

  // ── addToTask ────────────────────────────────────────────────────
  describe('addToTask', () => {
    it('should connect a tag to a task', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(mockTag)
      mockPrisma.task.update.mockResolvedValue({ id: 'task-id-1', tags: [mockTag] })

      const result = await service.addToTask('tag-id-1', 'task-id-1', 'user-id-1')

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tags: { connect: { id: 'tag-id-1' } } } })
      )
      expect(result).toBeDefined()
    })

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(null)

      await expect(service.addToTask('bad-id', 'task-id-1', 'user-id-1')).rejects.toThrow(NotFoundException)
    })
  })

  // ── removeFromTask ───────────────────────────────────────────────
  describe('removeFromTask', () => {
    it('should disconnect a tag from a task', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(mockTag)
      mockPrisma.task.update.mockResolvedValue({ id: 'task-id-1', tags: [] })

      const result = await service.removeFromTask('tag-id-1', 'task-id-1', 'user-id-1')

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { tags: { disconnect: { id: 'tag-id-1' } } } })
      )
      expect(result).toBeDefined()
    })

    it('should throw NotFoundException if tag not found', async () => {
      mockPrisma.tag.findFirst.mockResolvedValue(null)

      await expect(service.removeFromTask('bad-id', 'task-id-1', 'user-id-1')).rejects.toThrow(NotFoundException)
    })
  })
})
