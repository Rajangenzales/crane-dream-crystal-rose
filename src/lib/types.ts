import type { ActivityStatus, PaymentStatus } from "./catalog";

export type Role = "admin" | "viewer";

export type Profile = {
  userId: string;
  role: Role;
  isActive: boolean;
  name: string;
  email: string | null;
};

export type Settings = {
  agencyName: string;
  agencyTagline: string;
  currency: string;
  viewersSeePayments: boolean;
};

export type Client = {
  id: string;
  name: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Service = {
  id: string;
  name: string;
  isActive: boolean;
  isGlobal: boolean;
  sortOrder: number;
};

export type Period = {
  id: string;
  clientId: string;
  year: number;
  month: number;
  title: string;
  status: string;
};

export type Activity = {
  id: string;
  sectionId: string;
  activityDate: string | null;
  title: string;
  description: string;
  quantity: number | null;
  unit: string;
  status: ActivityStatus | string;
  notes: string;
  sortOrder: number;
};

export type Section = {
  id: string;
  periodId: string;
  serviceId: string | null;
  title: string;
  isManual: boolean;
  sortOrder: number;
  activities: Activity[];
};

export type Payment = {
  id: string;
  clientId: string;
  periodId: string | null;
  year: number;
  month: number;
  status: PaymentStatus | string;
  amount: number | null;
  paymentDate: string | null;
  notes: string;
  clientName?: string;
};

export type ClientListItem = Client & {
  serviceCount: number;
  serviceNames: string[];
};

export type Workspace = {
  client: Client;
  period: Period;
  services: Service[];
  assignedServiceIds: string[];
  sections: Section[];
  payments: Payment[];
};

export type Dashboard = {
  year: number;
  month: number;
  activeClients: number;
  clientsThisMonth: number;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  paymentsReceived: number;
  paymentsPending: number;
  clientRows: Array<{
    client: Client;
    activityCount: number;
    completedCount: number;
    workSummary: string;
    paymentStatus: string;
    paymentAmount: number | null;
  }>;
};

export type MonthSummary = {
  year: number;
  month: number;
  clientsServed: number;
  totalActivities: number;
  statusCounts: Record<string, number>;
  paymentsReceived: number;
  paymentsPending: number;
  rows: Array<{
    client: Client;
    workDone: string;
    totalWork: number;
    paymentStatus: string;
    paymentAmount: number | null;
  }>;
};

export type FounderSummary = MonthSummary & {
  activeClients: number;
  clientsWithNoWork: Array<{ id: string; name: string }>;
  clientsWithOutstanding: Array<{ id: string; name: string; amount: number | null }>;
  units: Array<{ unit: string; quantity: number }>;
  services: Array<{ name: string; sections: number }>;
};

export type ClientReport = {
  client: Client;
  period: Period;
  sections: Section[];
  payments: Payment[];
  settings: Settings;
};

export type UserRow = {
  userId: string;
  name: string;
  email: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
};

export type AuditRow = {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  detail: string;
  createdAt: string;
};

export type BackupRow = {
  id: string;
  createdBy: string;
  note: string;
  createdAt: string;
};
