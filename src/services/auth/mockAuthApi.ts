import type { AuthSession, Role } from '../../types';

/**
 * Stand-in for the backend auth endpoint, ported from mobile_app so
 * both clients behave identically until the Node API exists. Replace
 * with a real fetch() call to `/api/auth/login` once it exists; the
 * return shape (AuthSession) should not need to change.
 */
export async function mockLogin(
  identifier: string,
  _password: string,
): Promise<AuthSession> {
  await new Promise<void>(resolve => setTimeout(resolve, 400));

  const role = inferRoleFromIdentifier(identifier);
  return {
    token: `mock-jwt.${role}.${Date.now()}`,
    expiresAt: Date.now() + 1000 * 60 * 60, // 1 hour
    user: {
      id: `${role}-1`,
      fullName: mockNameForRole(role),
      email: identifier,
      role,
    },
  };
}

/** Dev convenience only: type "teacher@..." / "admin@..." to preview that role. */
function inferRoleFromIdentifier(identifier: string): Role {
  const lower = identifier.toLowerCase();
  if (lower.includes('admin')) return 'admin';
  if (lower.includes('teacher')) return 'teacher';
  return 'parent';
}

function mockNameForRole(role: Role): string {
  switch (role) {
    case 'admin':
      return 'Alex Admin';
    case 'teacher':
      return 'Taylor Teacher';
    default:
      return 'Parker Parent';
  }
}
