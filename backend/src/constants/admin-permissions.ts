export const ADMIN_PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard:view',
  USERS_VIEW: 'users:view',
  USERS_MANAGE: 'users:manage',
  OFFERS_VIEW: 'offers:view',
  OFFERS_MODERATE: 'offers:moderate',
  BOOKINGS_VIEW: 'bookings:view',
  PROMOS_REVIEW: 'promos:review',
  COINS_VIEW: 'coins:view',
  FEEDBACK_VIEW: 'feedback:view',
  FEEDBACK_MANAGE: 'feedback:manage',
  ANALYTICS_VIEW: 'analytics:view',
  WITHDRAWALS_VIEW: 'withdrawals:view',
  WITHDRAWALS_MANAGE: 'withdrawals:manage',
  CONTENT_VIEW: 'content:view',
  CONTENT_MANAGE: 'content:manage',
  MASTER_DATA_VIEW: 'master_data:view',
  MASTER_DATA_MANAGE: 'master_data:manage',
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
  ROLES_VIEW: 'roles:view',
  ROLES_MANAGE: 'roles:manage',
  ADMINS_VIEW: 'admins:view',
  ADMINS_MANAGE: 'admins:manage',
} as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[keyof typeof ADMIN_PERMISSIONS];

