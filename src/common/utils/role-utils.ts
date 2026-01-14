export function resolveActorRole(roles: string[]): 'admin' | 'supervisor' | 'user' {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('supervisor')) return 'supervisor';
  return 'user';
}

