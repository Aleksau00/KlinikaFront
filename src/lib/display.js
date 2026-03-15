export function formatGenderLabel(value) {
  if (value === 'M') {
    return 'Male';
  }

  if (value === 'F') {
    return 'Female';
  }

  return value || 'Unavailable';
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