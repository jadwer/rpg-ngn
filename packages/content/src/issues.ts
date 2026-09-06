import type { ZodError } from 'zod'

export type IssueLevel = 'error' | 'warning'

export interface Issue {
  level: IssueLevel
  /** Archivo o `archivo:linea` al que aplica. */
  path: string
  message: string
}

export function zodIssues(error: ZodError, path: string): Issue[] {
  return error.issues.map((issue) => ({
    level: 'error',
    path,
    message: issue.path.length ? `${issue.path.map(String).join('.')}: ${issue.message}` : issue.message,
  }))
}

export function hasErrors(issues: Issue[]): boolean {
  return issues.some((issue) => issue.level === 'error')
}
