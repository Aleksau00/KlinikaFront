export const roleConfig = {
  admin: {
    label: 'Administrator',
    themeClass: 'theme-admin',
    eyebrow: 'Administrative Portal',
    title: 'Control the clinic workspace.',
    description: 'Authenticate as an administrator to manage staff access and clinic-wide operations.',
    helper: 'Only administrators can create staff accounts in the current backend.',
    loginPath: '/login/admin',
    portalPath: '/portal/admin',
    sampleEmail: 'admin@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Create and assign staff accounts', 'Review clinic-level operational data', 'Access administrator-only endpoints'],
    sections: ['overview', 'account', 'admin-desk', 'staff', 'clinics'],
  },
  doctor: {
    label: 'Doctor',
    themeClass: 'theme-doctor',
    eyebrow: 'Doctor Portal',
    title: 'Enter the clinical workspace.',
    description: 'Authenticate as a doctor to continue into the consultation and appointment area.',
    helper: 'Doctor accounts are created by an administrator and authenticated through the shared worker login endpoint.',
    loginPath: '/login/doctor',
    portalPath: '/portal/doctor',
    sampleEmail: 'dr.nikolic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['View assigned appointments', 'Open doctor-only clinical workflows', 'Access protected medical endpoints'],
    sections: ['overview', 'account', 'my-slots', 'my-appointments'],
  },
  secretary: {
    label: 'Secretary',
    themeClass: 'theme-secretary',
    eyebrow: 'Secretary Portal',
    title: 'Open the front-desk workspace.',
    description: 'Authenticate as a secretary to continue into booking, intake, and front office workflows.',
    helper: 'Secretary accounts also use the worker JWT flow and are provisioned by administrators.',
    loginPath: '/login/secretary',
    portalPath: '/portal/secretary',
    sampleEmail: 'jovana.simic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Handle booking and check-in flows', 'Use secretary-authorized scheduling endpoints', 'Manage front-office patient intake'],
    sections: ['overview', 'account', 'desk-scheduling', 'desk-appointments'],
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
  dateOfBirth: '1990-01-01',
  bloodType: 'A+',
};