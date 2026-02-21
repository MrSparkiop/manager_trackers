import { Test, TestingModule } from '@nestjs/testing'
import { TasksService } from './tasks.service'
import { PrismaService } from '../prisma/prisma.service'
import { NotFoundException } from '@nestjs/common'
import { TaskStatus, Priority } from '@prisma/client'

const mockPrisma = {
  task: {
    findMany:  jest.fn(),
    findFirst: jest.fn(),
    create:    jest.fn(),
    update:    jest.fn(),
    delete:    jest.fn(),
  }
}

const mockTask = {
  id: 'task-id-1', title: 'Test Task',
  description: 'Test description',
  status: TaskStatus.TODO, priority: Priority.MEDIUM,
  userId: 'user-id-1', projectId: null,
  dueDate: null, parentId: null,
  tags: [], subtasks: [], timeEntries: [],
  project: null,
}

describe('TasksService', () => {
  let service: TasksService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile()

    service = module.get<TasksService>(TasksService)
    jest.clearAllMocks()
  })

  // ── findAll ─────────────────────────────────────────────────────
  describe('findAll', () => {
    it('should return all tasks for a user', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask])

      const result = await service.findAll('user-id-1')

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-id-1', parentId: null }) })
      )
      expect(result).toHaveLength(1)
    })

    it('should filter by status', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await service.findAll('user-id-1', { status: TaskStatus.DONE })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: TaskStatus.DONE }) })
      )
    })

    it('should filter by priority', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await service.findAll('user-id-1', { priority: Priority.HIGH })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ priority: Priority.HIGH }) })
      )
    })

    it('should filter by projectId', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await service.findAll('user-id-1', { projectId: 'project-id-1' })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ projectId: 'project-id-1' }) })
      )
    })

    it('should filter by tagId', async () => {
      mockPrisma.task.findMany.mockResolvedValue([])

      await service.findAll('user-id-1', { tagId: 'tag-id-1' })

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ tags: { some: { id: 'tag-id-1' } } }) })
      )
    })
  })

  // ── findOne ─────────────────────────────────────────────────────
  describe('findOne', () => {
    it('should return a task by id', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)

      const result = await service.findOne('task-id-1', 'user-id-1')

      expect(result).toEqual(mockTask)
    })

    it('should throw NotFoundException if task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      await expect(service.findOne('bad-id', 'user-id-1')).rejects.toThrow(NotFoundException)
    })
  })

  // ── create ──────────────────────────────────────────────────────
  describe('create', () => {
    const dto = { title: 'New Task', priority: Priority.HIGH }

    it('should create a task', async () => {
      mockPrisma.task.create.mockResolvedValue({ ...mockTask, ...dto })

      const result = await service.create('user-id-1', dto)

      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 'user-id-1', title: 'New Task' }) })
      )
      expect(result.title).toBe('New Task')
    })

    it('should parse dueDate string to Date', async () => {
      const dtoWithDate = { title: 'Task', dueDate: '2026-12-31' }
      mockPrisma.task.create.mockResolvedValue(mockTask)

      await service.create('user-id-1', dtoWithDate as any)

      const createCall = mockPrisma.task.create.mock.calls[0][0]
      expect(createCall.data.dueDate).toBeInstanceOf(Date)
    })

    it('should connect tags if tagIds provided', async () => {
      const dtoWithTags = { title: 'Task', tagIds: ['tag-id-1', 'tag-id-2'] }
      mockPrisma.task.create.mockResolvedValue(mockTask)

      await service.create('user-id-1', dtoWithTags as any)

      const createCall = mockPrisma.task.create.mock.calls[0][0]
      expect(createCall.data.tags.connect).toHaveLength(2)
    })
  })

  // ── update ──────────────────────────────────────────────────────
  describe('update', () => {
    it('should update a task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, title: 'Updated' })

      const result = await service.update('task-id-1', 'user-id-1', { title: 'Updated' } as any)

      expect(result.title).toBe('Updated')
    })

    it('should set completedAt when status is DONE', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)
      mockPrisma.task.update.mockResolvedValue({ ...mockTask, status: TaskStatus.DONE })

      await service.update('task-id-1', 'user-id-1', { status: TaskStatus.DONE } as any)

      const updateCall = mockPrisma.task.update.mock.calls[0][0]
      expect(updateCall.data.completedAt).toBeInstanceOf(Date)
    })

    it('should throw NotFoundException if task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      await expect(service.update('bad-id', 'user-id-1', {} as any)).rejects.toThrow(NotFoundException)
    })

    it('should update tags with set when tagIds provided', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)
      mockPrisma.task.update.mockResolvedValue(mockTask)

      await service.update('task-id-1', 'user-id-1', { tagIds: ['tag-id-1'] } as any)

      const updateCall = mockPrisma.task.update.mock.calls[0][0]
      expect(updateCall.data.tags.set).toEqual([{ id: 'tag-id-1' }])
    })
  })

  // ── remove ──────────────────────────────────────────────────────
  describe('remove', () => {
    it('should delete a task', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(mockTask)
      mockPrisma.task.delete.mockResolvedValue(mockTask)

      const result = await service.remove('task-id-1', 'user-id-1')

      expect(mockPrisma.task.delete).toHaveBeenCalledWith({ where: { id: 'task-id-1' } })
      expect(result).toEqual(mockTask)
    })

    it('should throw NotFoundException if task not found', async () => {
      mockPrisma.task.findFirst.mockResolvedValue(null)

      await expect(service.remove('bad-id', 'user-id-1')).rejects.toThrow(NotFoundException)
    })
  })

  // ── getTodayTasks ───────────────────────────────────────────────
  describe('getTodayTasks', () => {
    it('should return tasks due today', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask])

      const result = await service.getTodayTasks('user-id-1')

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id-1',
            status: { not: TaskStatus.DONE },
          })
        })
      )
      expect(result).toHaveLength(1)
    })
  })

  // ── getOverdueTasks ─────────────────────────────────────────────
  describe('getOverdueTasks', () => {
    it('should return overdue tasks excluding done and cancelled', async () => {
      mockPrisma.task.findMany.mockResolvedValue([mockTask])

      const result = await service.getOverdueTasks('user-id-1')

      expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-id-1',
            status: { notIn: [TaskStatus.DONE, TaskStatus.CANCELLED] },
          })
        })
      )
      expect(result).toHaveLength(1)
    })
  })
})