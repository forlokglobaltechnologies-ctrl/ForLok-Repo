export const ADMIN_PERMISSION_KEYS = [
  'dashboard:view',
  'users:view',
  'users:manage',
  'offers:view',
  'offers:moderate',
  'bookings:view',
  'promos:review',
  'coins:view',
  'feedback:view',
  'feedback:manage',
  'analytics:view',
  'withdrawals:view',
  'withdrawals:manage',
  'content:view',
  'content:manage',
  'master_data:view',
  'master_data:manage',
  'settings:view',
  'settings:manage',
  'roles:view',
  'roles:manage',
  'admins:view',
  'admins:manage',
];

export const hasPermission = (
  role: string | undefined,
  permissions: string[] | undefined,
  required: string | string[]
) => {
  const requiredList = Array.isArray(required) ? required : [required];
  if (role === 'super_admin') return true;
  if (!permissions) return false;
  if (permissions.includes('*')) return true;
  return requiredList.every((item) => permissions.includes(item));
};
