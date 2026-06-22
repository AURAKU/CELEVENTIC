import type { RevisionChangeCategory, RevisionType } from "@prisma/client";

export const MINOR_CATEGORIES: RevisionChangeCategory[] = [
  "DATE_CHANGE",
  "TIME_CHANGE",
  "VENUE_CHANGE",
  "PHONE_CHANGE",
  "SPELLING",
];

export const MAJOR_CATEGORIES: RevisionChangeCategory[] = [
  "THEME_CHANGE",
  "LAYOUT_CHANGE",
  "COLOR_OVERHAUL",
  "NEW_ANIMATION",
  "NEW_SECTION",
];

export function categoryToRevisionType(category: RevisionChangeCategory): RevisionType {
  if (MINOR_CATEGORIES.includes(category)) return "MINOR";
  if (MAJOR_CATEGORIES.includes(category)) return "MAJOR";
  return "MINOR";
}

export const WORKFLOW_STAGE_LABELS: Record<string, string> = {
  PACKAGE_SELECTED: "Package Selected",
  ADDONS_SELECTED: "Add-ons Selected",
  PAYMENT_PENDING: "Payment Pending",
  PAYMENT_SUCCESSFUL: "Payment Successful",
  INFORMATION_PENDING: "Information Pending",
  PRODUCTION_STARTED: "Production Started",
  DESIGN_READY: "Design Ready",
  CUSTOMER_REVIEWING: "Customer Reviewing",
  REVISION_REQUESTED: "Revision Requested",
  REVISION_IN_PROGRESS: "Revision In Progress",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
};

export const CHANGE_CATEGORY_LABELS: Record<string, string> = {
  DATE_CHANGE: "Date change",
  TIME_CHANGE: "Time change",
  VENUE_CHANGE: "Venue change",
  PHONE_CHANGE: "Phone change",
  SPELLING: "Spelling correction",
  THEME_CHANGE: "Theme change",
  LAYOUT_CHANGE: "Layout change",
  COLOR_OVERHAUL: "Color overhaul",
  NEW_ANIMATION: "New animation",
  NEW_SECTION: "New section design",
  OTHER: "Other",
};

export const DEFAULT_EXTRA_REVISION_PRICE = 79;
