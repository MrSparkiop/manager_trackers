import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import { queryKeys } from '../lib/queryKeys'
import type { Project } from '../types'

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: queryKeys.projects.all,
    queryFn: () => api.get('/projects').then(r => r.data),
  })
}
