import { canCancelAppointment, formatAppointmentStatus, isInProgressStatus, isScheduledStatus } from '../../lib/appointments';
import { formatAppointmentReference, formatAppointmentType } from '../../lib/display';

function AppointmentLifecycleList({ appointments, actionAppointmentId, onCheckIn, onCancel, onNoShow }) {
  return (
    <div className="data-list data-list-scroll appointments-list">
      {appointments.map((appointment) => (
        <article className="data-row" key={appointment.id}>
          <div>
            <strong>{appointment.scheduledDate} {String(appointment.scheduledStartTime).slice(0, 5)}</strong>
            <p>Patient: {appointment.patientName || 'Unknown patient'}</p>
            <p>{appointment.doctorName || 'Doctor unavailable'} · {formatAppointmentType(appointment.appointmentType)}</p>
          </div>
          <div className="data-meta">
            <span>{formatAppointmentReference(appointment)}</span>
            <span>Status: {formatAppointmentStatus(appointment.status)}</span>
            <small>Booked by: {appointment.bookedByWorkerName || 'N/A'}</small>
            <small>Clinic: {appointment.clinicName}</small>
          </div>
          <div className="row-actions">
            {isScheduledStatus(appointment.status) ? (
              <button className="ghost-button" disabled={actionAppointmentId === appointment.id} onClick={() => onCheckIn(appointment.id)} type="button">
                Check in
              </button>
            ) : null}
            {isScheduledStatus(appointment.status) && canCancelAppointment(appointment.scheduledDate, appointment.scheduledStartTime) ? (
              <button className="danger-button-outline" disabled={actionAppointmentId === appointment.id} onClick={() => onCancel(appointment.id)} type="button">
                Cancel
              </button>
            ) : null}
            {isScheduledStatus(appointment.status) || isInProgressStatus(appointment.status) ? (
              <button className="danger-button-outline" disabled={actionAppointmentId === appointment.id} onClick={() => onNoShow(appointment.id)} type="button">
                No-show
              </button>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}

export default AppointmentLifecycleList;