export const roleConfig = {
  admin: {
    label: 'Administrator',
    themeClass: 'theme-admin',
    eyebrow: 'Administration',
    title: 'Manage clinic staff and daily operations.',
    description: 'Sign in as an administrator to manage staff accounts, clinics, and access permissions.',
    helper: 'If you need a new staff account or role change, contact clinic administration.',
    loginPath: '/login',
    portalPath: '/portal/admin',
    sampleEmail: 'admin@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Create and assign staff accounts', 'Manage pediatric clinic staff and access', 'Review clinic-level operational data'],
    sections: ['overview', 'account', 'staff', 'clinics'],
  },
  doctor: {
    label: 'Doctor',
    themeClass: 'theme-doctor',
    eyebrow: 'Doctor Workspace',
    title: 'Open your appointments and patient records.',
    description: 'Sign in as a doctor to review schedules, patient details, and visit notes.',
    helper: 'Doctor accounts are provided by clinic administration.',
    loginPath: '/login',
    portalPath: '/portal/doctor',
    sampleEmail: 'dr.nikolic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['View and manage pediatric patient appointments', 'Complete treatment and preventive visit notes', 'Access patient allergen and vaccination context'],
    sections: ['overview', 'account', 'my-slots', 'my-patients', 'my-appointments'],
  },
  secretary: {
    label: 'Secretary',
    themeClass: 'theme-secretary',
    eyebrow: 'Front Desk',
    title: 'Manage intake, guardians, and bookings.',
    description: 'Sign in as a secretary to register patients, link guardians, and book appointments.',
    helper: 'Secretary accounts are provided by clinic administration.',
    loginPath: '/login',
    portalPath: '/portal/secretary',
    sampleEmail: 'jovana.simic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Register pediatric patients and link guardians for minors', 'Handle booking and check-in flows', 'Manage front-office appointment and scheduling workflows'],
    sections: ['overview', 'account', 'desk-scheduling', 'desk-patients', 'desk-guardians', 'desk-appointments'],
  },
};

export const roleSlugByApiRole = {
  Administrator: 'admin',
  Doctor: 'doctor',
  Secretary: 'secretary',
};

export const workerRoleOptions = ['Administrator', 'Doctor', 'Secretary'];

export const initialWorkerForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  gender: 'F',
  dateOfBirth: '1990-01-01',
  jmbg: '',
  temporaryPassword: 'Admin123!',
  role: 'Secretary',
  clinicId: '',
  seniorityLevel: '',
  specialty: '',
  licenseNumber: '',
  qualification: '',
};

export const initialPatientForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  jmbg: '',
  gender: 'F',
  dateOfBirth: '2006-01-01',
  bloodType: 'A+',
};