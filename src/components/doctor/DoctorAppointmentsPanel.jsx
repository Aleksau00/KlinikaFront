import { useEffect, useState } from 'react';
import {
  completeTreatmentAppointment,
  completePreventiveAppointment,
  fetchDoctorScheduleForDate,
  markAppointmentNoShow,
} from '../../lib/api';
import {
  formatAppointmentStatus,
  formatDateForInput,
  isInProgressStatus,
  isScheduledStatus,
} from '../../lib/appointments';
import { playUiFeedbackSound } from '../../lib/ui-feedback';

const INITIAL_TREATMENT_FORM = {
  anamnesis: '',
  statusObservation: '',
  therapy: '',
  diagnosedCondition: '',
};

function DoctorAppointmentsPanel({ session }) {
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const [actionId, setActionId] = useState(null);
  const [completeMode, setCompleteMode] = useState(null);
  const [treatmentForm, setTreatmentForm] = useState(INITIAL_TREATMENT_FORM);
  const [preventiveNotes, setPreventiveNotes] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const data = await fetchDoctorScheduleForDate(session.token, session.worker?.id, selectedDate);

        if (!ignore) {
          setAppointments(data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load appointments.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [session.token, session.worker?.id, selectedDate, version]);

  function refresh() {
    setVersion((v) => v + 1);
  }

  async function handleNoShow(appointmentId) {
    setActionId(appointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await markAppointmentNoShow(session.token, appointmentId);
      setStatusMessage('Patient marked as no-show.');
      playUiFeedbackSound('select');
      refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark no-show.');
    } finally {
      setActionId(null);
    }
  }

  async function handleCompleteTreatment(event) {
    event.preventDefault();

    if (!completeMode) {
      return;
    }

    setIsCompleting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await completeTreatmentAppointment(session.token, completeMode.id, treatmentForm);
      setStatusMessage('Appointment completed with treatment notes.');
      playUiFeedbackSound('created');
      setCompleteMode(null);
      setTreatmentForm(INITIAL_TREATMENT_FORM);
      refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete appointment.');
    } finally {
      setIsCompleting(false);
    }
  }

  async function handleCompletePreventive(event) {
    event.preventDefault();

    if (!completeMode) {
      return;
    }

    setIsCompleting(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await completePreventiveAppointment(session.token, completeMode.id, { preventiveNotes });
      setStatusMessage('Appointment completed with preventive notes.');
      playUiFeedbackSound('created');
      setCompleteMode(null);
      setPreventiveNotes('');
      refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete appointment.');
    } finally {
      setIsCompleting(false);
    }
  }

  function openComplete(id, type) {
    setCompleteMode({ id, type });
    setTreatmentForm(INITIAL_TREATMENT_FORM);
    setPreventiveNotes('');
    setErrorMessage('');
    setStatusMessage('');
    playUiFeedbackSound('select');
  }

  function getAppointmentType(appt) {
    return appt.appointmentType === 0 || appt.appointmentType === 'Treatment' ? 'Treatment' : 'Preventive';
  }

  const activeAppointments = appointments.filter(
    (a) => isInProgressStatus(a.status) || isScheduledStatus(a.status),
  );
  const closedAppointments = appointments.filter(
    (a) => !isInProgressStatus(a.status) && !isScheduledStatus(a.status),
  );

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-doctor">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">My schedule</p>
            <h2>Appointments</h2>
          </div>
          <span className="status-chip">{appointments.length} for {selectedDate}</span>
        </div>
        <p>
          View and action your appointments. Complete treatment or preventive notes for in-progress appointments, or mark no-shows.
        </p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <div className="admin-form">
          <div className="form-grid">
            <label>
              <span>Date</span>
              <input
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCompleteMode(null);
                }}
                type="date"
                value={selectedDate}
              />
            </label>
          </div>
        </div>
      </article>

      {isLoading ? <p>Loading appointments…</p> : null}

      {!isLoading && appointments.length === 0 ? (
        <p className="muted-hint">No appointments found for {selectedDate}.</p>
      ) : null}

      {completeMode ? (
        <article className="workspace-panel">
          <p className="eyebrow">Complete appointment #{completeMode.id}</p>
          <h2>{completeMode.type === 'treatment' ? 'Treatment notes' : 'Preventive notes'}</h2>

          {completeMode.type === 'treatment' ? (
            <form className="admin-form" onSubmit={handleCompleteTreatment}>
              <div className="form-grid">
                <label>
                  <span>Anamnesis</span>
                  <textarea
                    onChange={(e) => setTreatmentForm((f) => ({ ...f, anamnesis: e.target.value }))}
                    required
                    rows={3}
                    value={treatmentForm.anamnesis}
                  />
                </label>
                <label>
                  <span>Status observation</span>
                  <textarea
                    onChange={(e) => setTreatmentForm((f) => ({ ...f, statusObservation: e.target.value }))}
                    required
                    rows={3}
                    value={treatmentForm.statusObservation}
                  />
                </label>
                <label>
                  <span>Therapy</span>
                  <textarea
                    onChange={(e) => setTreatmentForm((f) => ({ ...f, therapy: e.target.value }))}
                    required
                    rows={3}
                    value={treatmentForm.therapy}
                  />
                </label>
                <label>
                  <span>Diagnosed condition</span>
                  <textarea
                    onChange={(e) => setTreatmentForm((f) => ({ ...f, diagnosedCondition: e.target.value }))}
                    required
                    rows={2}
                    value={treatmentForm.diagnosedCondition}
                  />
                </label>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="primary-button" disabled={isCompleting} type="submit">
                  {isCompleting ? 'Saving…' : 'Save treatment'}
                </button>
                <button className="ghost-button" onClick={() => setCompleteMode(null)} type="button">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form className="admin-form" onSubmit={handleCompletePreventive}>
              <label>
                <span>Preventive notes</span>
                <textarea
                  onChange={(e) => setPreventiveNotes(e.target.value)}
                  required
                  rows={4}
                  value={preventiveNotes}
                />
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button className="primary-button" disabled={isCompleting} type="submit">
                  {isCompleting ? 'Saving…' : 'Save notes'}
                </button>
                <button className="ghost-button" onClick={() => setCompleteMode(null)} type="button">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </article>
      ) : null}

      {!isLoading && activeAppointments.length > 0 ? (
        <article className="workspace-panel">
          <p className="eyebrow">Active</p>
          <h2>In progress &amp; scheduled</h2>
          <div className="data-list data-list-scroll">
            {activeAppointments.map((appt) => (
              <article className="data-row" key={appt.id}>
                <div>
                  <strong>{String(appt.scheduledStartTime).slice(0, 5)} – {String(appt.scheduledEndTime).slice(0, 5)}</strong>
                  <p>Patient: {appt.patientName}</p>
                  <p>Type: {getAppointmentType(appt)}</p>
                </div>
                <div className="data-meta">
                  <span>#{appt.id}</span>
                  <span>Status: {formatAppointmentStatus(appt.status)}</span>
                  <small>Clinic: {appt.clinicName}</small>
                </div>
                <div className="row-actions">
                  {isInProgressStatus(appt.status) ? (
                    <button
                      className="primary-button"
                      disabled={actionId === appt.id}
                      onClick={() => openComplete(
                        appt.id,
                        appt.appointmentType === 0 || appt.appointmentType === 'Treatment' ? 'treatment' : 'preventive',
                      )}
                      type="button"
                    >
                      Complete
                    </button>
                  ) : null}
                  <button
                    className="danger-button-outline"
                    disabled={actionId === appt.id}
                    onClick={() => handleNoShow(appt.id)}
                    type="button"
                  >
                    No-show
                  </button>
                </div>
              </article>
            ))}
          </div>
        </article>
      ) : null}

      {!isLoading && closedAppointments.length > 0 ? (
        <article className="workspace-panel">
          <p className="eyebrow">Completed / cancelled</p>
          <h2>Past &amp; closed</h2>
          <div className="data-list data-list-scroll">
            {closedAppointments.map((appt) => (
              <article className="data-row" key={appt.id}>
                <div>
                  <strong>{String(appt.scheduledStartTime).slice(0, 5)} – {String(appt.scheduledEndTime).slice(0, 5)}</strong>
                  <p>Patient: {appt.patientName}</p>
                  <p>Type: {getAppointmentType(appt)}</p>
                </div>
                <div className="data-meta">
                  <span>#{appt.id}</span>
                  <span>Status: {formatAppointmentStatus(appt.status)}</span>
                  {appt.cancellationReason ? <small>Reason: {appt.cancellationReason}</small> : null}
                </div>
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}

export default DoctorAppointmentsPanel;
