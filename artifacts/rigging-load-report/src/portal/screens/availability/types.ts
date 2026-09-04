export type CalendarEntry = {
  id: string;
  ruleId?: string;
  status: "available" | "unavailable" | "tentative";
  startAt: string;
  endAt: string;
  allDay: boolean;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  virtual?: boolean;
};

export type ExternalBusy = {
  id: string;
  startAt: string;
  endAt: string;
  provider: string;
};

export type CalendarConnection = {
  id: string;
  provider: "google" | "microsoft" | "ics";
  configured: boolean;
  connected: boolean;
  accountLabel?: string;
  lastSyncedAt?: string;
  lastError?: string;
};

export type CalendarFeed = {
  enabled: boolean;
  url: string;
  updatedAt?: string;
};

export type CalendarHold = {
  id: string;
  status: 'hold';
  startAt: string;
  endAt: string;
  expiresAt?: string;
};
