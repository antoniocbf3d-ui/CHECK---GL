
export enum AttendanceStatus {
  PRESENT = 'Presente',
  ABSENT = 'Ausente',
  JUSTIFIED = 'Justificado'
}

export interface Attendee {
  id: string;
  name: string;
  status: AttendanceStatus;
}

export interface Person {
  id: string;
  name: string;
}

export interface Event {
  id: string;
  name: string;
  date: string;
  attendees: Attendee[];
}

export type ViewState = 'events' | 'create' | 'details' | 'stats' | 'database' | 'reports' | 'global';
