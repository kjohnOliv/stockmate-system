export type Role = 'ADMIN' | 'STAFF' | 'COOK';

export const ROLE_PERMISSIONS = {
  ADMIN: ["Dashboard", "Inventory", "Meal Directory", "Meal Plan", "Profile", "Accounts"],
  STAFF: ["Dashboard", "Inventory", "Profile"],
  COOK: ["Dashboard", "Meal Directory", "Meal Plan", "Profile"],
};