import { Test, TestingModule } from '@nestjs/testing'
import { AuthService } from './auth.service'
import { PrismaService } from '../prisma/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { MailService } from '../mail/mail.service'
import { ConflictException, UnauthorizedException } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

// ── Mocks ──────────────────────────────────────────────────────────
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst:  jest.fn(),
    create:     jest.fn(),
    update:     jest.fn(),
  }
}

const mockJwt = {
  sign:   jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ sub: 'user-id-1' }),
}

const mockMail = {
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
}

const mockRes: any = {
  cookie:      jest.fn(),
  clearCookie: jest.fn(),
}

// ── Test Suite ────────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService,    useValue: mockJwt },
        { provide: MailService,   useValue: mockMail },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
    jest.clearAllMocks()
  })

  // ── register ────────────────────────────────────────────────────
  describe('register', () => {
    const dto = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
    }

    it('should register a new user and set cookies', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-id-1',
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      })
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.register(dto, mockRes)

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: dto.email } })
      expect(mockPrisma.user.create).toHaveBeenCalled()
      expect(mockRes.cookie).toHaveBeenCalledTimes(2)
      expect(result.user.email).toBe(dto.email)
    })

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' })

      await expect(service.register(dto, mockRes)).rejects.toThrow(ConflictException)
    })

    it('should hash the password before saving', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-id-1', email: dto.email,
        firstName: dto.firstName, lastName: dto.lastName,
      })
      mockPrisma.user.update.mockResolvedValue({})

      await service.register(dto, mockRes)

      const createCall = mockPrisma.user.create.mock.calls[0][0]
      expect(createCall.data.password).not.toBe(dto.password)
      const isHashed = await bcrypt.compare(dto.password, createCall.data.password)
      expect(isHashed).toBe(true)
    })
  })

  // ── login ───────────────────────────────────────────────────────
  describe('login', () => {
    const dto = { email: 'test@example.com', password: 'password123' }
    const hashedPassword = bcrypt.hashSync('password123', 10)

    const mockUser = {
      id: 'user-id-1',
      email: dto.email,
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Doe',
    }

    it('should login successfully and set cookies', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.login(dto, mockRes)

      expect(mockRes.cookie).toHaveBeenCalledTimes(2)
      expect(result.user.email).toBe(dto.email)
      expect(result.user.id).toBe('user-id-1')
    })

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      await expect(service.login(dto, mockRes)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: bcrypt.hashSync('different-password', 10),
      })

      await expect(service.login(dto, mockRes)).rejects.toThrow(UnauthorizedException)
    })

    it('should not expose password in response', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.login(dto, mockRes)

      expect((result.user as any).password).toBeUndefined()
    })
  })

  // ── logout ──────────────────────────────────────────────────────
  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.logout(mockRes, 'user-id-1')

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token', { path: '/' })
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refresh_token', { path: '/' })
      expect(result.message).toBe('Logged out')
    })

    it('should clear refresh token from DB on logout', async () => {
      mockPrisma.user.update.mockResolvedValue({})

      await service.logout(mockRes, 'user-id-1')

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        data: { refreshToken: null },
      })
    })

    it('should still logout even without userId', async () => {
      const result = await service.logout(mockRes)

      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2)
      expect(result.message).toBe('Logged out')
    })
  })

  // ── getMe ───────────────────────────────────────────────────────
  describe('getMe', () => {
    it('should return user data without password', async () => {
      const mockUser = { id: 'user-id-1', email: 'test@example.com', firstName: 'John', lastName: 'Doe' }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)

      const result = await service.getMe('user-id-1')

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id-1' },
        select: { id: true, email: true, firstName: true, lastName: true }
      })
      expect(result).toEqual(mockUser)
    })
  })

  // ── refresh ─────────────────────────────────────────────────────
  describe('refresh', () => {
    it('should throw UnauthorizedException if no refresh token cookie', async () => {
      const req = { cookies: {} }
      await expect(service.refresh(req, mockRes)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if token is invalid', async () => {
      mockJwt.verify.mockImplementationOnce(() => { throw new Error('invalid') })
      const req = { cookies: { refresh_token: 'bad-token' } }

      await expect(service.refresh(req, mockRes)).rejects.toThrow(UnauthorizedException)
    })

    it('should throw UnauthorizedException if user not found', async () => {
      mockJwt.verify.mockReturnValueOnce({ sub: 'user-id-1' })
      mockPrisma.user.findUnique.mockResolvedValue(null)
      const req = { cookies: { refresh_token: 'valid-token' } }

      await expect(service.refresh(req, mockRes)).rejects.toThrow(UnauthorizedException)
    })

    it('should rotate tokens and set new cookies on valid refresh', async () => {
      const refreshToken = 'valid-refresh-token'
      const hashedRefresh = await bcrypt.hash(refreshToken, 10)

      mockJwt.verify.mockReturnValueOnce({ sub: 'user-id-1' })
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1', refreshToken: hashedRefresh
      })
      mockPrisma.user.update.mockResolvedValue({})

      const req = { cookies: { refresh_token: refreshToken } }
      const result = await service.refresh(req, mockRes)

      expect(mockRes.cookie).toHaveBeenCalledTimes(2)
      expect(result.success).toBe(true)
    })
  })

  // ── forgotPassword ──────────────────────────────────────────────
  describe('forgotPassword', () => {
    it('should return success message even if email does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)

      const result = await service.forgotPassword('unknown@example.com')

      expect(result.message).toBe('If that email exists, a reset link has been sent')
      expect(mockMail.sendPasswordReset).not.toHaveBeenCalled()
    })

    it('should send reset email if user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1', email: 'test@example.com', firstName: 'John'
      })
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.forgotPassword('test@example.com')

      expect(mockMail.sendPasswordReset).toHaveBeenCalledWith(
        'test@example.com', 'John', expect.any(String)
      )
      expect(result.message).toBe('If that email exists, a reset link has been sent')
    })

    it('should save reset token to DB with expiry', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id-1', email: 'test@example.com', firstName: 'John'
      })
      mockPrisma.user.update.mockResolvedValue({})

      await service.forgotPassword('test@example.com')

      const updateCall = mockPrisma.user.update.mock.calls[0][0]
      expect(updateCall.data.resetPasswordToken).toBeDefined()
      expect(updateCall.data.resetPasswordExpiry).toBeInstanceOf(Date)
    })
  })

  // ── resetPassword ───────────────────────────────────────────────
  describe('resetPassword', () => {
    it('should throw UnauthorizedException if token is invalid or expired', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null)

      await expect(service.resetPassword('bad-token', 'newpass123')).rejects.toThrow(UnauthorizedException)
    })

    it('should reset password and invalidate all sessions', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-id-1' })
      mockPrisma.user.update.mockResolvedValue({})

      const result = await service.resetPassword('valid-token', 'newpassword123')

      const updateCall = mockPrisma.user.update.mock.calls[0][0]
      expect(updateCall.data.resetPasswordToken).toBeNull()
      expect(updateCall.data.resetPasswordExpiry).toBeNull()
      expect(updateCall.data.refreshToken).toBeNull()
      expect(result.message).toBe('Password reset successfully')
    })

    it('should hash the new password before saving', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-id-1' })
      mockPrisma.user.update.mockResolvedValue({})

      await service.resetPassword('valid-token', 'newpassword123')

      const updateCall = mockPrisma.user.update.mock.calls[0][0]
      expect(updateCall.data.password).not.toBe('newpassword123')
      const isHashed = await bcrypt.compare('newpassword123', updateCall.data.password)
      expect(isHashed).toBe(true)
    })
  })
})