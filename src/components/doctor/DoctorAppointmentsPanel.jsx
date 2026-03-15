import { useEffect, useState } from 'react';
import {
  checkInAppointment,
  completeTreatmentAppointment,
  completePreventiveAppointment,
  fetchPatientAllergens,
  fetchPatientVaccinationRecords,
  fetchVaccinations,
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

const INITIAL_PREVENTIVE_FORM = {
  preventiveNotes: '',
  childDevelopmentNotes: '',
  isVaccination: false,
  vaccinationId: '',
  vaccinationNotes: '',
};

function DoctorAppointmentsPanel({ session }) {
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const [actionId, setActionId] = useState(null);
  const [completeMode, setCompleteMode] = useState(null);
  const [treatmentForm, setTreatmentForm] = useState(INITIAL_TREATMENT_FORM);
  const [preventiveForm, setPreventiveForm] = useState(INITIAL_PREVENTIVE_FORM);
  const [isCompleting, setIsCompleting] = useState(false);

  const [vaccinations, setVaccinations] = useState([]);
  const [patientAllergens, setPatientAllergens] = useState([]);
  const [patientVaccinationHistory, setPatientVaccinationHistory] = useState([]);
  const [isLoadingPatientContext, setIsLoadingPatientContext] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadVaccinations() {
      try {
        const data = await fetchVaccinations(session.token);
        if (!ignore) {
          setVaccinations(data);
        }
      } catch {
        if (!ignore) {
          setVaccinations([]);
        }
      }
    }

    loadVaccinations();

    return () => {
      ignore = true;
    };
  }, [session.token]);

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

  useEffect(() => {
    let ignore = false;

    async function loadPatientContext() {
      const patientId = completeMode?.patientId;

      if (!patientId) {
        setPatientAllergens([]);
        setPatientVaccinationHistory([]);
        return;
      }

      setIsLoadingPatientContext(true);

      try {
        const [allergens, vaccinationsHistory] = await Promise.all([
          fetchPatientAllergens(session.token, patientId),
          fetchPatientVaccinationRecords(session.token, patientId),
        ]);

        if (!ignore) {
          setPatientAllergens(allergens);
          setPatientVaccinationHistory(vaccinationsHistory);
        }
      } catch {
        if (!ignore) {
          setPatientAllergens([]);
          setPatientVaccinationHistory([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingPatientContext(false);
        }
      }
    }

    loadPatientContext();

    return () => {
      ignore = true;
    };
  }, [completeMode?.patientId, session.token]);

  async function handleStartAppointment(appointmentId) {
    setActionId(appointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await checkInAppointment(session.token, appointmentId);
      setStatusMessage('Appointment moved to In Progress.');
      playUiFeedbackSound('edited');
      refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to start appointment.');
    } finally {
      setActionId(null);
    }
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
      const payload = {
        preventiveNotes: preventiveForm.preventiveNotes,
        childDevelopmentNotes: preventiveForm.childDevelopmentNotes,
        isVaccination: preventiveForm.isVaccination,
        vaccinationId: preventiveForm.isVaccination && preventiveForm.vaccinationId
          ? Number(preventiveForm.vaccinationId)
          : null,
        vaccinationNotes: preventiveForm.vaccinationNotes,
      };

      await completePreventiveAppointment(session.token, completeMode.id, payload);
      setStatusMessage('Appointment completed with preventive notes.');
      playUiFeedbackSound('created');
      setCompleteMode(null);
      setPreventiveForm(INITIAL_PREVENTIVE_FORM);
      refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete appointment.');
    } finally {
      setIsCompleting(false);
    }
  }

  function openComplete(appointment) {
    const type = appointment.appointmentType === 0 || appointment.appointmentType === 'Treatment' ? 'treatment' : 'preventive';

    setCompleteMode({
      id: appointment.id,
      type,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
    });
    setTreatmentForm(INITIAL_TREATMENT_FORM);
    setPreventiveForm(INITIAL_PREVENTIVE_FORM);
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

          <div className="secretary-grid compact-grid" style={{ marginBottom: '1rem' }}>
            <article className="workspace-panel" style={{ margin: 0 }}>
              <p className="eyebrow">Patient safety</p>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Known allergens</h3>
              {isLoadingPatientContext ? <p>Loading allergens...</p> : null}
              {!isLoadingPatientContext && patientAllergens.length === 0 ? <p className="muted-hint">No known allergens.</p> : null}
              {!isLoadingPatientContext && patientAllergens.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {patientAllergens.map((item) => (
                    <li key={`${item.patientId}-${item.allergenId}`}>
                      <strong>{item.allergenName}</strong>{item.notes ? ` - ${item.notes}` : ''}
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>

            <article className="workspace-panel" style={{ margin: 0 }}>
              <p className="eyebrow">Immunization context</p>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Vaccination history</h3>
              {isLoadingPatientContext ? <p>Loading records...</p> : null}
              {!isLoadingPatientContext && patientVaccinationHistory.length === 0 ? <p className="muted-hint">No vaccination records found.</p> : null}
              {!isLoadingPatientContext && patientVaccinationHistory.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                  {patientVaccinationHistory.slice(0, 6).map((item) => (
                    <li key={item.id}>
                      <strong>{item.vaccinationName}</strong> ({new Date(item.administeredDate).toLocaleDateString('en-GB')})
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </div>

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
              <div className="form-grid">
                <label>
                  <span>Preventive notes</span>
                  <textarea
                    onChange={(e) => setPreventiveForm((f) => ({ ...f, preventiveNotes: e.target.value }))}
                    rows={3}
                    value={preventiveForm.preventiveNotes}
                  />
                </label>
                <label>
                  <span>Growth / development notes</span>
                  <textarea
                    onChange={(e) => setPreventiveForm((f) => ({ ...f, childDevelopmentNotes: e.target.value }))}
                    rows={3}
                    value={preventiveForm.childDevelopmentNotes}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    checked={preventiveForm.isVaccination}
                    onChange={(e) => setPreventiveForm((f) => ({ ...f, isVaccination: e.target.checked, vaccinationId: '' }))}
                    type="checkbox"
                  />
                  <span>This preventive visit includes vaccination</span>
                </label>
              </div>

              {preventiveForm.isVaccination ? (
                <div className="form-grid" style={{ marginTop: '0.5rem' }}>
                  <label>
                    <span>Vaccination</span>
                    <select
                      onChange={(e) => setPreventiveForm((f) => ({ ...f, vaccinationId: e.target.value }))}
                      required
                      value={preventiveForm.vaccinationId}
                    >
                      <option value="">Select vaccination</option>
                      {vaccinations.map((vaccination) => (
                        <option key={vaccination.id} value={vaccination.id}>{vaccination.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Vaccination notes</span>
                    <textarea
                      onChange={(e) => setPreventiveForm((f) => ({ ...f, vaccinationNotes: e.target.value }))}
                      rows={2}
                      value={preventiveForm.vaccinationNotes}
                    />
                  </label>
                </div>
              ) : null}

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
                  {isScheduledStatus(appt.status) ? (
                    <button
                      className="ghost-button"
                      disabled={actionId === appt.id}
                      onClick={() => handleStartAppointment(appt.id)}
                      type="button"
                    >
                      Start
                    </button>
                  ) : null}
                  {isInProgressStatus(appt.status) ? (
                    <button
                      className="primary-button"
                      disabled={actionId === appt.id}
                      onClick={() => openComplete(appt)}
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
