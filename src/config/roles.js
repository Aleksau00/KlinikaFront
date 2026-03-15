export const roleConfig = {
  admin: {
    label: 'Administrator',
    themeClass: 'theme-admin',
    eyebrow: 'Administrative Portal',
    title: 'Control the clinic workspace.',
    description: 'Authenticate as an administrator to manage staff access and operations for the pediatric clinic.',
    helper: 'Only administrators can create staff accounts in the current backend.',
    loginPath: '/login/admin',
    portalPath: '/portal/admin',
    sampleEmail: 'admin@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Create and assign staff accounts', 'Manage pediatric clinic staff and access', 'Review clinic-level operational data'],
    sections: ['overview', 'account', 'admin-desk', 'staff', 'clinics'],
  },
  doctor: {
    label: 'Doctor',
    themeClass: 'theme-doctor',
    eyebrow: 'Doctor Portal',
    title: 'Enter the pediatric clinical workspace.',
    description: 'Authenticate as a pediatric doctor to access the consultation and appointment workspace for patients aged 0–25.',
    helper: 'Doctor accounts are created by an administrator. Specialties include General Pediatrics and subspecialties such as Neonatology, Developmental-Behavioral Pediatrics, and Pediatric Neurology.',
    loginPath: '/login/doctor',
    portalPath: '/portal/doctor',
    sampleEmail: 'dr.nikolic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['View and manage pediatric patient appointments', 'Complete treatment and preventive visit notes', 'Access patient allergen and vaccination context'],
    sections: ['overview', 'account', 'my-slots', 'my-appointments'],
  },
  secretary: {
    label: 'Secretary',
    themeClass: 'theme-secretary',
    eyebrow: 'Secretary Portal',
    title: 'Open the front-desk workspace.',
    description: 'Authenticate as a secretary to manage pediatric patient intake, guardian linking, booking, and front-desk operations.',
    helper: 'Secretary accounts also use the worker JWT flow and are provisioned by administrators.',
    loginPath: '/login/secretary',
    portalPath: '/portal/secretary',
    sampleEmail: 'jovana.simic@klinika.rs',
    samplePassword: 'Admin123!',
    tasks: ['Register pediatric patients and link guardians for minors', 'Handle booking and check-in flows', 'Manage front-office appointment and scheduling workflows'],
    sections: ['overview', 'account', 'desk-scheduling', 'desk-patients', 'desk-appointments'],
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