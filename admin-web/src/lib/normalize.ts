export const readItems = (response: any): any[] => {
  const base = response?.data ?? response;
  if (Array.isArray(base)) return base;
  if (Array.isArray(base?.items)) return base.items;
  if (Array.isArray(base?.rows)) return base.rows;
  if (Array.isArray(base?.list)) return base.list;
  if (Array.isArray(base?.users)) return base.users;
  if (Array.isArray(base?.offers)) return base.offers;
  if (Array.isArray(base?.bookings)) return base.bookings;
  if (Array.isArray(base?.submissions)) return base.submissions;
  if (Array.isArray(base?.feedback)) return base.feedback;
  if (Array.isArray(base?.pages)) return base.pages;
  if (Array.isArray(base?.roles)) return base.roles;
  if (Array.isArray(base?.admins)) return base.admins;
  if (Array.isArray(base?.withdrawals)) return base.withdrawals;
  return [];
};
