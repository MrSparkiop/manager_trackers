import type { AuthUser } from './current-user.decorator'

// Augment Express Request so req.user is always typed
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface User extends AuthUser {}
  }
}
