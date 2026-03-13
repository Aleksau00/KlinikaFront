export function formatDateForInput(value) {
  return value.toISOString().split('T')[0];
}

export function isScheduledStatus(status) {
  return status === 0 || status === 'Scheduled';
}

export function isInProgressStatus(status) {
  return status === 1 || status === 'InProgress';
}

export function formatAppointmentStatus(status) {
  const statusMap = {
    0: 'Scheduled',
    1: 'In Progress',
    2: 'Completed',
    3: 'Cancelled',
    4: 'No-show',
    Scheduled: 'Scheduled',
    InProgress: 'In Progress',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
    NoShow: 'No-show',
  };

  return statusMap[status] || String(status);
}

export function canCancelAppointment(scheduledDate, scheduledStartTime) {
  try {
    const appointmentDateTime = new Date(`${scheduledDate}T${scheduledStartTime}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime - now) / (1000 * 60 * 60);

    return hoursUntilAppointment > 48;
  } catch {
    return true;
  }
}