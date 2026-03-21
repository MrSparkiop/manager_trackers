export function getNextDueDate(currentDue: Date | null, recurrence: string): Date {
  const base = currentDue ? new Date(currentDue) : new Date()
  switch (recurrence) {
    case 'DAILY':    base.setDate(base.getDate() + 1);         break
    case 'WEEKLY':   base.setDate(base.getDate() + 7);         break
    case 'BIWEEKLY': base.setDate(base.getDate() + 14);        break
    case 'MONTHLY':  base.setMonth(base.getMonth() + 1);       break
    case 'YEARLY':   base.setFullYear(base.getFullYear() + 1); break
  }
  return base
}
