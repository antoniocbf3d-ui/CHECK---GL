
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

// Added 'edit' to the ViewState union type to resolve type errors in App.tsx (lines 421 and 445)
export type ViewState = 'events' | 'create' | 'details' | 'stats' | 'database' | 'reports' | 'global' | 'edit';
