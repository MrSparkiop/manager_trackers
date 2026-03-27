// ── Shared entity types ──────────────────────────────────────────

export type UserRole = 'USER' | 'PRO' | 'ADMIN'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  onboardingCompleted?: boolean
  trialEndsAt?: string | null
  referralCode?: string | null
  lastSeenChangelog?: string | null
  deletionRequestedAt?: string | null
  deletionScheduledFor?: string | null
  createdAt?: string
}

export interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  estimatedTime?: number
  projectId?: string
  project?: { id: string; name: string; color: string }
  parentId?: string
  subtasks?: Task[]
  recurrence?: string
  recurrenceEndDate?: string
  tags?: { id: string; name: string; color: string }[]
  timeEntries?: { duration: number | null }[]
  assigneeId?: string
  assignee?: { id: string; firstName: string; lastName: string }
}

export interface Project {
  id: string
  name: string
  description?: string
  color: string
  status: string
  deadline?: string
  createdAt: string
  deletedAt?: string
  _count?: { tasks: number }
  tasks?: Task[]
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startTime: string
  endTime: string
  allDay: boolean
  color: string
  taskId?: string
  task?: { id: string; title: string }
}

export interface TimeEntry {
  id: string
  description?: string
  startTime: string
  endTime?: string
  duration?: number
  taskId?: string
  task?: { id: string; title: string }
}

export interface Tag {
  id: string
  name: string
  color: string
}

// ── Chat ─────────────────────────────────────────────────────────

export interface ChatUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  lastSeenAt?: string | null
}

export interface ChatMessage {
  id: string
  content?: string
  type: 'TEXT' | 'VOICE' | 'CALL'
  audioData?: string
  audioDuration?: number
  createdAt: string
  conversationId: string
  senderId: string
  sender: { id: string; firstName: string; lastName: string }
}

export interface Conversation {
  id: string
  createdAt: string
  updatedAt: string
  participants: { id: string; userId: string; lastReadAt: string; user: ChatUser }[]
  lastMessage?: ChatMessage | null
  unreadCount: number
}
