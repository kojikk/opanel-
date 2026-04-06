/**
 * Re-export from the new auth module for backward compatibility.
 * All existing imports like `import { requireAuth } from "@/lib/auth"` continue to work.
 */
export {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  createSession,
  validateSession,
  destroySession,
  revokeSession,
  revokeAllUserSessions,
  requireAuth,
  hasPermission,
  canViewServer,
  getAccessibleServerIds,
  requirePermission,
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  P,
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  type Permission,
  type AuthSession,
} from "./auth/index";
