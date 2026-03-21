import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import { queryKeys } from '../lib/queryKeys'
import type { Task } from '../types'

/**
 * Fetch all tasks (up to limit) with defensive handling for
 * both paginated `{ tasks, total }` and plain array responses.
 */
export function useTasks(limit = 200) {
  const { data: raw, ...rest } = useQuery<any>({
    queryKey: queryKeys.tasks.all,
    queryFn: () => api.get(`/tasks?limit=${limit}`).then(r => r.data.tasks ?? r.data),
  })

  const tasks: Task[] = Array.isArray(raw) ? raw : (raw?.tasks ?? [])

  return { tasks, ...rest }
}

export function useTodayTasks() {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.today,
    queryFn: () => api.get('/tasks/today').then(r => r.data),
  })
}

export function useOverdueTasks() {
  return useQuery<Task[]>({
    queryKey: queryKeys.tasks.overdue,
    queryFn: () => api.get('/tasks/overdue').then(r => r.data),
  })
}
