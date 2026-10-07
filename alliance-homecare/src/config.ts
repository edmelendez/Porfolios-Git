// Seed data shown on first launch. Everything here can be changed inside the
// app after unlocking with the PIN, and edits are stored on the device only.

export type MedicalProfile = {
  firstName: string;
  lastName: string;
  age: string;
  pregnancy: string;
  medications: string;
  allergies: string;
  contactRelation: string;
  contactName: string;
  contactPhone: string;
};

export const DEFAULT_PROFILE: MedicalProfile = {
  firstName: 'Edwin',
  lastName: 'Melendez',
  age: '63 years old',
  pregnancy: '--',
  medications: 'Amlodipine Besylate 10mg Tab',
  allergies: 'No Allergies',
  contactRelation: 'spouse',
  contactName: 'Millie Melendez',
  contactPhone: '(646) 246-8818',
};

export const DEFAULT_TARGET_NUMBER = '+1 (646) 246-8818';
export const DEFAULT_PIN = '9999';

export const VERIFIED_LOCATION = {
  street: '160 Pehle Ave',
  cityLine: 'Saddle Brook, NJ 07663',
  spoken: '160 Pehle Avenue, Saddle Brook, New Jersey',
  mapsUrl:
    'https://maps.google.com/?cid=5792195504817767442&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQ',
};

export const DEFAULT_SMS_TEMPLATE = `EMERGENCY: Assistance requested immediately at ${VERIFIED_LOCATION.street}, ${VERIFIED_LOCATION.cityLine}.`;

// Seconds between pressing GET HELP and the dialer opening. Pressing the
// button again during this window cancels the call.
export const CALL_COUNTDOWN_SECONDS = 5;

// Idle time before the app returns to the dialer and closes any open panel.
export const INACTIVITY_MS = 5000;
