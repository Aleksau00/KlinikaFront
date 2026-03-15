export function formatGenderLabel(value) {
  if (value === 'M') {
    return 'Male';
  }

  if (value === 'F') {
    return 'Female';
  }

  return value || 'Unavailable';
}

export function formatDateLabel(value) {
  if (!value) {
    return 'Unavailable';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
  }).format(parsed);
}

export function formatAppointmentType(value) {
  const labelMap = {
    0: 'Preventive',
    1: 'Treatment',
    Preventive: 'Preventive',
    Treatment: 'Treatment',
  };

  return labelMap[value] || String(value || 'Unknown');
}

export function formatPatientProfileSummary(patient) {
  if (!patient) {
    return 'Profile details unavailable';
  }

  const parts = [];

  if (patient.gender) {
    parts.push(formatGenderLabel(patient.gender));
  }

  if (patient.dateOfBirth) {
    parts.push(`Born ${formatDateLabel(patient.dateOfBirth)}`);
  }

  return parts.join(' · ') || 'Profile details unavailable';
}

export function formatAppointmentReference(appointment) {
  if (!appointment) {
    return 'Appointment';
  }

  const patientName = String(appointment.patientName || '').trim();
  const date = String(appointment.scheduledDate || '').trim();
  const startTime = String(appointment.scheduledStartTime || '').slice(0, 5);

  if (patientName && date && startTime) {
    return `${patientName} on ${date} at ${startTime}`;
  }

  if (patientName) {
    return `Appointment for ${patientName}`;
  }

  return 'Appointment';
}

export function formatSlotReference(slot) {
  if (!slot) {
    return 'None';
  }

  const doctorName = String(slot.doctorName || '').trim();
  const date = String(slot.date || '').trim();
  const startTime = String(slot.startTime || '').slice(0, 5);
  const endTime = String(slot.endTime || '').slice(0, 5);

  if (doctorName && date && startTime && endTime) {
    return `${doctorName} · ${date} ${startTime}-${endTime}`;
  }

  if (date && startTime && endTime) {
    return `${date} ${startTime}-${endTime}`;
  }

  return 'None';
}