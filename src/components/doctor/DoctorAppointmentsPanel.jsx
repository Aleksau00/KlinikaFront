import { useEffect, useState } from 'react';
import {
  addPatientAllergen,
  checkInAppointment,
  completeTreatmentAppointment,
  completePreventiveAppointment,
  fetchAllergens,
  fetchDoctorAppointments,
  fetchPatientAllergens,
  fetchPatientAppointments,
  fetchPatientVaccinationRecords,
  fetchVaccinations,
  markAppointmentNoShow,
  removePatientAllergen,
} from '../../lib/api';
import {
  formatAppointmentStatus,
  formatDateForInput,
  isInProgressStatus,
  isScheduledStatus,
} from '../../lib/appointments';
import { formatAppointmentReference, formatAppointmentType, formatDateLabel } from '../../lib/display';
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
  const [rangeMode, setRangeMode] = useState('today');
  const [customFromDate, setCustomFromDate] = useState(formatDateForInput(new Date()));
  const [customToDate, setCustomToDate] = useState(formatDateForInput(new Date()));
  const [patientQuery, setPatientQuery] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [version, setVersion] = useState(0);

  const [actionId, setActionId] = useState(null);
  const [completeMode, setCompleteMode] = useState(null);
  const [treatmentForm, setTreatmentForm] = useState(INITIAL_TREATMENT_FORM);
  const [preventiveForm, setPreventiveForm] = useState(INITIAL_PREVENTIVE_FORM);
  const [isCompleting, setIsCompleting] = useState(false);

  const [vaccinations, setVaccinations] = useState([]);
  const [allAllergens, setAllAllergens] = useState([]);
  const [patientAllergens, setPatientAllergens] = useState([]);
  const [patientVaccinationHistory, setPatientVaccinationHistory] = useState([]);
  const [patientAppointmentHistory, setPatientAppointmentHistory] = useState([]);
  const [isLoadingPatientContext, setIsLoadingPatientContext] = useState(false);

  const [allergenAddForm, setAllergenAddForm] = useState({ allergenId: '', diagnosedDate: formatDateForInput(new Date()), notes: '' });
  const [isAddingAllergen, setIsAddingAllergen] = useState(false);
  const [allergenError, setAllergenError] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedAppointmentId, setExpandedAppointmentId] = useState(null);

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

    async function loadAllAllergens() {
      try {
        const data = await fetchAllergens(session.token);
        if (!ignore) {
          setAllAllergens(data);
        }
      } catch {
        if (!ignore) {
          setAllAllergens([]);
        }
      }
    }

    loadAllAllergens();

    return () => {
      ignore = true;
    };
  }, [session.token]);

  useEffect(() => {
    let ignore = false;

    function addDays(baseDate, daysDelta) {
      const next = new Date(baseDate);
      next.setDate(next.getDate() + daysDelta);
      return next;
    }

    function resolveRange() {
      if (rangeMode === 'today') {
        return {
          fromDate: selectedDate,
          toDate: selectedDate,
        };
      }

      if (rangeMode === 'last7') {
        const end = new Date();
        const start = addDays(end, -6);
        return {
          fromDate: formatDateForInput(start),
          toDate: formatDateForInput(end),
        };
      }

      if (rangeMode === 'last30') {
        const end = new Date();
        const start = addDays(end, -29);
        return {
          fromDate: formatDateForInput(start),
          toDate: formatDateForInput(end),
        };
      }

      return {
        fromDate: customFromDate,
        toDate: customToDate,
      };
    }

    async function load() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const { fromDate, toDate } = resolveRange();

        if (!fromDate || !toDate) {
          throw new Error('Both custom range dates are required.');
        }

        if (fromDate > toDate) {
          throw new Error('From date must be less than or equal to To date.');
        }

        const data = await fetchDoctorAppointments(session.token, session.worker?.id, fromDate, toDate);

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
  }, [session.token, session.worker?.id, selectedDate, rangeMode, customFromDate, customToDate, version]);

  function refresh() {
    setVersion((v) => v + 1);
  }

  const selectedContextAppointment = completeMode
    ? appointments.find((appointment) => appointment.id === completeMode.id) || completeMode
    : appointments.find((appointment) => appointment.id === expandedAppointmentId) || null;

  const selectedContextPatientId = completeMode?.patientId || selectedContextAppointment?.patientId || null;

  useEffect(() => {
    let ignore = false;

    async function loadPatientContext() {
      const patientId = selectedContextPatientId;

      if (!patientId) {
        setPatientAllergens([]);
        setPatientVaccinationHistory([]);
        setPatientAppointmentHistory([]);
        return;
      }

      setIsLoadingPatientContext(true);

      try {
        const [allergens, vaccinationsHistory, appointmentHistory] = await Promise.all([
          fetchPatientAllergens(session.token, patientId),
          fetchPatientVaccinationRecords(session.token, patientId),
          fetchPatientAppointments(session.token, patientId),
        ]);

        if (!ignore) {
          setPatientAllergens(allergens);
          setPatientVaccinationHistory(vaccinationsHistory);
          setPatientAppointmentHistory(appointmentHistory);
        }
      } catch {
        if (!ignore) {
          setPatientAllergens([]);
          setPatientVaccinationHistory([]);
          setPatientAppointmentHistory([]);
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
  }, [selectedContextPatientId, session.token]);

  function isTreatmentAppointmentType(value) {
    return value === 1 || value === '1' || value === 'Treatment';
  }

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
      try {
        await completeTreatmentAppointment(session.token, completeMode.id, treatmentForm);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('status: Scheduled')) {
          throw error;
        }

        await checkInAppointment(session.token, completeMode.id);
        await completeTreatmentAppointment(session.token, completeMode.id, treatmentForm);
      }

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
      const hasPreventiveNotes = Boolean(preventiveForm.preventiveNotes.trim());
      const hasDevelopmentNotes = Boolean(preventiveForm.childDevelopmentNotes.trim());
      const hasVaccinationData = Boolean(preventiveForm.isVaccination && preventiveForm.vaccinationId);

      if (!hasPreventiveNotes && !hasDevelopmentNotes && !hasVaccinationData) {
        throw new Error('Enter preventive notes, growth/development notes, or vaccination details before saving.');
      }

      const payload = {
        preventiveNotes: preventiveForm.preventiveNotes,
        childDevelopmentNotes: preventiveForm.childDevelopmentNotes,
        isVaccination: preventiveForm.isVaccination,
        vaccinationId: preventiveForm.isVaccination && preventiveForm.vaccinationId
          ? Number(preventiveForm.vaccinationId)
          : null,
        vaccinationNotes: preventiveForm.vaccinationNotes,
      };

      try {
        await completePreventiveAppointment(session.token, completeMode.id, payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        if (!message.includes('status: Scheduled')) {
          throw error;
        }

        await checkInAppointment(session.token, completeMode.id);
        await completePreventiveAppointment(session.token, completeMode.id, payload);
      }

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

  async function handleAddAllergen() {
    const { allergenId, diagnosedDate, notes } = allergenAddForm;
    if (!allergenId || !selectedContextPatientId) {
      return;
    }

    setIsAddingAllergen(true);
    setAllergenError('');

    try {
      await addPatientAllergen(session.token, selectedContextPatientId, Number(allergenId), diagnosedDate, notes);
      const updated = await fetchPatientAllergens(session.token, selectedContextPatientId);
      setPatientAllergens(updated);
      setAllergenAddForm((f) => ({ ...f, allergenId: '', notes: '' }));
      playUiFeedbackSound('created');
    } catch (error) {
      setAllergenError(error instanceof Error ? error.message : 'Unable to add allergen.');
    } finally {
      setIsAddingAllergen(false);
    }
  }

  async function handleRemoveAllergen(allergenId) {
    if (!selectedContextPatientId) {
      return;
    }

    setAllergenError('');

    try {
      await removePatientAllergen(session.token, selectedContextPatientId, allergenId);
      setPatientAllergens((prev) => prev.filter((a) => a.allergenId !== allergenId));
      playUiFeedbackSound('select');
    } catch (error) {
      setAllergenError(error instanceof Error ? error.message : 'Unable to remove allergen.');
    }
  }

  function openComplete(appointment) {
    const type = isTreatmentAppointmentType(appointment.appointmentType) ? 'treatment' : 'preventive';

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

  function isPastScheduledAppointment(appt) {
    if (!isScheduledStatus(appt.status)) {
      return false;
    }

    try {
      const dateText = String(appt.scheduledDate || '').trim();
      const startText = String(appt.scheduledStartTime || '').slice(0, 8);

      if (!dateText || !startText) {
        return false;
      }

      const localDateTime = new Date(`${dateText}T${startText}`);

      if (Number.isNaN(localDateTime.getTime())) {
        return false;
      }

      return localDateTime < new Date();
    } catch {
      return false;
    }
  }

  function formatDateTime(value) {
    if (!value) {
      return 'Unavailable';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unavailable';
    }

    return parsed.toLocaleString('en-GB');
  }

  function matchesPatientFilter(appt) {
    const query = patientQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    const patientName = String(appt.patientName || '').toLowerCase();
    return patientName.includes(query);
  }

  function toggleExpanded(appointmentId) {
    setCompleteMode(null);
    setExpandedAppointmentId((current) => (current === appointmentId ? null : appointmentId));
  }

  function getAppointmentSortValue(appointment) {
    const candidates = [
      appointment.completedAt,
      appointment.cancelledAt,
      appointment.checkedInAt,
      appointment.scheduledDate && appointment.scheduledStartTime
        ? `${appointment.scheduledDate}T${String(appointment.scheduledStartTime).slice(0, 8)}`
        : null,
    ].filter(Boolean);

    if (candidates.length === 0) {
      return 0;
    }

    const parsed = new Date(candidates[0]);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }

  function getRelatedAppointments(currentAppointmentId) {
    return [...patientAppointmentHistory]
      .filter((appointment) => appointment.id !== currentAppointmentId)
      .sort((left, right) => getAppointmentSortValue(right) - getAppointmentSortValue(left))
      .slice(0, 5);
  }

  function renderAllergenEditorCard() {
    const assignedIds = new Set(patientAllergens.map((a) => a.allergenId));
    const available = allAllergens.filter((a) => !assignedIds.has(a.id));

    return (
      <section className="clinical-card">
        <p className="eyebrow">Patient safety</p>
        <h3>Known allergens</h3>
        {isLoadingPatientContext ? <p>Loading allergens...</p> : null}
        {!isLoadingPatientContext && patientAllergens.length === 0 ? (
          <p className="muted-hint">No known allergens recorded.</p>
        ) : null}
        {!isLoadingPatientContext && patientAllergens.length > 0 ? (
          <ul>
            {patientAllergens.map((item) => (
              <li key={`${item.patientId}-${item.allergenId}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0' }}>
                <span>
                  <strong>{item.allergenName}</strong>
                  {item.notes ? <small style={{ marginLeft: '0.4rem', opacity: 0.7 }}>{item.notes}</small> : null}
                </span>
                <button
                  className="danger-button-outline"
                  onClick={() => handleRemoveAllergen(item.allergenId)}
                  style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                  type="button"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {allergenError ? <p className="error-banner" style={{ marginTop: '0.5rem' }}>{allergenError}</p> : null}
        {available.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'flex-end' }}>
            <label style={{ flex: '1 1 140px' }}>
              <span style={{ fontSize: '0.75rem' }}>Add allergen</span>
              <select
                onChange={(e) => setAllergenAddForm((f) => ({ ...f, allergenId: e.target.value }))}
                value={allergenAddForm.allergenId}
              >
                <option value="">Select...</option>
                {available.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: '1 1 130px' }}>
              <span style={{ fontSize: '0.75rem' }}>Diagnosed date</span>
              <input
                onChange={(e) => setAllergenAddForm((f) => ({ ...f, diagnosedDate: e.target.value }))}
                type="date"
                value={allergenAddForm.diagnosedDate}
              />
            </label>
            <label style={{ flex: '2 1 160px' }}>
              <span style={{ fontSize: '0.75rem' }}>Notes (optional)</span>
              <input
                onChange={(e) => setAllergenAddForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. causes hives"
                type="text"
                value={allergenAddForm.notes}
              />
            </label>
            <button
              className="primary-button"
              disabled={!allergenAddForm.allergenId || isAddingAllergen}
              onClick={handleAddAllergen}
              style={{ alignSelf: 'flex-end' }}
              type="button"
            >
              {isAddingAllergen ? 'Adding…' : 'Add'}
            </button>
          </div>
        ) : (
          <p className="muted-hint" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>All known allergens are already recorded.</p>
        )}
      </section>
    );
  }

  function renderPatientContextCards(currentAppointmentId, options = {}) {
    const recentAppointments = getRelatedAppointments(currentAppointmentId);

    return (
      <>
        {!options.skipAllergens ? (
          <section className="clinical-card">
            <p className="eyebrow">Patient safety</p>
            <h3>Known allergens</h3>
            {isLoadingPatientContext ? <p>Loading allergens...</p> : null}
            {!isLoadingPatientContext && patientAllergens.length === 0 ? <p className="muted-hint">No known allergens.</p> : null}
            {!isLoadingPatientContext && patientAllergens.length > 0 ? (
              <ul>
                {patientAllergens.map((item) => (
                  <li key={`${item.patientId}-${item.allergenId}`}>
                    <strong>{item.allergenName}</strong>{item.notes ? ` - ${item.notes}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        <section className="clinical-card">
          <p className="eyebrow">Immunization context</p>
          <h3>Vaccination history</h3>
          {isLoadingPatientContext ? <p>Loading records...</p> : null}
          {!isLoadingPatientContext && patientVaccinationHistory.length === 0 ? <p className="muted-hint">No vaccination records found.</p> : null}
          {!isLoadingPatientContext && patientVaccinationHistory.length > 0 ? (
            <ul>
              {patientVaccinationHistory.slice(0, 6).map((item) => (
                <li key={item.id}>
                  <strong>{item.vaccinationName}</strong> ({formatDateLabel(item.administeredDate)})
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="clinical-card">
          <p className="eyebrow">Visit history</p>
          <h3>Recent appointments</h3>
          {isLoadingPatientContext ? <p>Loading prior visits...</p> : null}
          {!isLoadingPatientContext && recentAppointments.length === 0 ? <p className="muted-hint">No earlier appointments found.</p> : null}
          {!isLoadingPatientContext && recentAppointments.length > 0 ? (
            <ul>
              {recentAppointments.map((item) => (
                <li key={item.id}>
                  <strong>{formatAppointmentType(item.appointmentType)}</strong>
                  {' '}
                  <span>{item.scheduledDate} at {String(item.scheduledStartTime || '').slice(0, 5)}</span>
                  <small className="clinical-inline-meta">{formatAppointmentStatus(item.status)}</small>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </>
    );
  }

  function renderClinicalSummaryCard(appt) {
    return isTreatmentAppointmentType(appt.appointmentType) ? (
      <section className="clinical-card">
        <p className="eyebrow">Treatment record</p>
        <h3>Clinical notes</h3>
        <div className="clinical-note-list">
          <p><strong>Anamnesis:</strong> {appt.anamnesis || 'Unavailable'}</p>
          <p><strong>Status observation:</strong> {appt.statusObservation || 'Unavailable'}</p>
          <p><strong>Therapy:</strong> {appt.therapy || 'Unavailable'}</p>
          <p><strong>Diagnosed condition:</strong> {appt.diagnosedCondition || 'Unavailable'}</p>
        </div>
      </section>
    ) : (
      <section className="clinical-card">
        <p className="eyebrow">Preventive record</p>
        <h3>Clinical notes</h3>
        <div className="clinical-note-list">
          <p><strong>Preventive notes:</strong> {appt.preventiveNotes || 'Unavailable'}</p>
          <p><strong>Growth/development:</strong> {appt.childDevelopmentNotes || 'Unavailable'}</p>
          <p><strong>Vaccination:</strong> {appt.isVaccination ? 'Yes' : 'No'}</p>
          {appt.isVaccination ? <p><strong>Vaccine:</strong> {appt.vaccinationName || 'Unavailable'}</p> : null}
          {appt.vaccinationNotes ? <p><strong>Vaccination notes:</strong> {appt.vaccinationNotes}</p> : null}
        </div>
      </section>
    );
  }

  function renderAppointmentInsight(appt) {
    return (
      <div className="appointment-insight">
        <div className="clinical-context-grid appointment-insight-grid">
          <section className="clinical-card">
            <p className="eyebrow">Visit summary</p>
            <h3>{formatAppointmentReference(appt)}</h3>
            <div className="clinical-note-list">
              <p><strong>Status:</strong> {formatAppointmentStatus(appt.status)}</p>
              <p><strong>Clinic:</strong> {appt.clinicName || 'Unavailable'}</p>
              <p><strong>Checked in:</strong> {formatDateTime(appt.checkedInAt)}</p>
              <p><strong>Completed:</strong> {formatDateTime(appt.completedAt)}</p>
              <p><strong>Cancelled:</strong> {formatDateTime(appt.cancelledAt)}</p>
              {appt.cancellationReason ? <p><strong>Cancellation reason:</strong> {appt.cancellationReason}</p> : null}
            </div>
          </section>

          {renderClinicalSummaryCard(appt)}
          {renderPatientContextCards(appt.id)}
        </div>
      </div>
    );
  }

  function getRangeLabel() {
    if (rangeMode === 'today') {
      return selectedDate;
    }

    if (rangeMode === 'last7') {
      return 'last 7 days';
    }

    if (rangeMode === 'last30') {
      return 'last 30 days';
    }

    return `${customFromDate} to ${customToDate}`;
  }

  const filteredAppointments = appointments.filter(matchesPatientFilter);

  const activeAppointments = filteredAppointments.filter(
    (a) => isInProgressStatus(a.status) || isScheduledStatus(a.status),
  );
  const closedAppointments = filteredAppointments.filter(
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
          <span className="status-chip">{filteredAppointments.length} shown for {getRangeLabel()}</span>
        </div>
        <p>
          View and action your appointments. You can switch between daily and historical ranges, then search by patient name.
        </p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <div className="admin-form">
          <div className="mode-toggle" role="tablist" aria-label="Appointment range mode">
            <button
              className={`ghost-button${rangeMode === 'today' ? ' is-active' : ''}`}
              onClick={() => {
                setRangeMode('today');
                setExpandedAppointmentId(null);
              }}
              type="button"
            >
              Today
            </button>
            <button
              className={`ghost-button${rangeMode === 'last7' ? ' is-active' : ''}`}
              onClick={() => {
                setRangeMode('last7');
                setExpandedAppointmentId(null);
              }}
              type="button"
            >
              Last 7 days
            </button>
            <button
              className={`ghost-button${rangeMode === 'last30' ? ' is-active' : ''}`}
              onClick={() => {
                setRangeMode('last30');
                setExpandedAppointmentId(null);
              }}
              type="button"
            >
              Last 30 days
            </button>
            <button
              className={`ghost-button${rangeMode === 'custom' ? ' is-active' : ''}`}
              onClick={() => {
                setRangeMode('custom');
                setExpandedAppointmentId(null);
              }}
              type="button"
            >
              Custom range
            </button>
          </div>

          <div className="form-grid">
            {rangeMode === 'today' ? (
              <label>
                <span>Date</span>
                <input
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setCompleteMode(null);
                    setExpandedAppointmentId(null);
                  }}
                  type="date"
                  value={selectedDate}
                />
              </label>
            ) : null}

            {rangeMode === 'custom' ? (
              <>
                <label>
                  <span>From date</span>
                  <input
                    onChange={(e) => {
                      setCustomFromDate(e.target.value);
                      setCompleteMode(null);
                      setExpandedAppointmentId(null);
                    }}
                    type="date"
                    value={customFromDate}
                  />
                </label>
                <label>
                  <span>To date</span>
                  <input
                    onChange={(e) => {
                      setCustomToDate(e.target.value);
                      setCompleteMode(null);
                      setExpandedAppointmentId(null);
                    }}
                    type="date"
                    value={customToDate}
                  />
                </label>
              </>
            ) : null}

            <label>
              <span>Patient / appointment search</span>
              <input
                onChange={(e) => setPatientQuery(e.target.value)}
                placeholder="Search by patient name"
                type="text"
                value={patientQuery}
              />
            </label>
          </div>
        </div>
      </article>

      {isLoading ? <p>Loading appointments…</p> : null}

      {!isLoading && filteredAppointments.length === 0 ? (
        <p className="muted-hint">No appointments found for current range/search filters.</p>
      ) : null}

      {completeMode ? (
        <article className="workspace-panel">
          <p className="eyebrow">Complete notes</p>
          <h2>{completeMode.type === 'treatment' ? 'Treatment notes' : 'Preventive notes'}</h2>
          <p className="muted-hint">{completeMode.patientName ? `Patient: ${completeMode.patientName}` : 'Patient unavailable'}</p>

          <div className="clinical-context-grid clinical-context-grid-compact">
            {renderAllergenEditorCard()}
            {renderPatientContextCards(completeMode.id, { skipAllergens: true })}
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
              <div className="clinical-context-grid clinical-context-grid-compact">
                <section className="clinical-card clinical-form-card">
                  <p className="eyebrow">Preventive notes</p>
                  <label>
                    <span>Preventive notes</span>
                    <textarea
                      onChange={(e) => setPreventiveForm((f) => ({ ...f, preventiveNotes: e.target.value }))}
                      rows={4}
                      value={preventiveForm.preventiveNotes}
                    />
                  </label>
                  <label>
                    <span>Growth / development notes</span>
                    <textarea
                      onChange={(e) => setPreventiveForm((f) => ({ ...f, childDevelopmentNotes: e.target.value }))}
                      rows={4}
                      value={preventiveForm.childDevelopmentNotes}
                    />
                  </label>
                  <label className="checkbox-inline-toggle">
                    <input
                      checked={preventiveForm.isVaccination}
                      onChange={(e) => setPreventiveForm((f) => ({ ...f, isVaccination: e.target.checked, vaccinationId: '' }))}
                      type="checkbox"
                    />
                    <span>
                      <strong>This preventive visit includes vaccination</strong>
                      <small>Enable this when the visit includes administering a vaccine during the same encounter.</small>
                    </span>
                  </label>
                </section>

                {renderPatientContextCards(completeMode.id, { skipAllergens: true })}
              </div>

              {preventiveForm.isVaccination ? (
                <div className="form-grid clinical-followup-grid">
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
                  <p>Type: {formatAppointmentType(appt.appointmentType)}</p>
                </div>
                <div className="data-meta">
                  <span>{formatAppointmentReference(appt)}</span>
                  <span>Status: {formatAppointmentStatus(appt.status)}</span>
                  <small>Clinic: {appt.clinicName}</small>
                </div>
                <div className="row-actions">
                  {isScheduledStatus(appt.status) && !isPastScheduledAppointment(appt) ? (
                    <button
                      className="ghost-button"
                      disabled={actionId === appt.id}
                      onClick={() => handleStartAppointment(appt.id)}
                      type="button"
                    >
                      Start
                    </button>
                  ) : null}
                  {isInProgressStatus(appt.status) || isScheduledStatus(appt.status) ? (
                    <button
                      className="primary-button"
                      disabled={actionId === appt.id}
                      onClick={() => openComplete(appt)}
                      type="button"
                    >
                      Complete notes
                    </button>
                  ) : null}
                  <button
                    className="ghost-button"
                    onClick={() => toggleExpanded(appt.id)}
                    type="button"
                  >
                    {expandedAppointmentId === appt.id ? 'Hide context' : 'View context'}
                  </button>
                  <button
                    className="danger-button-outline"
                    disabled={actionId === appt.id}
                    onClick={() => handleNoShow(appt.id)}
                    type="button"
                  >
                    No-show
                  </button>
                </div>

                {expandedAppointmentId === appt.id ? renderAppointmentInsight(appt) : null}
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
                  <p>Type: {formatAppointmentType(appt.appointmentType)}</p>
                </div>
                <div className="data-meta">
                  <span>{formatAppointmentReference(appt)}</span>
                  <span>Status: {formatAppointmentStatus(appt.status)}</span>
                  {appt.cancellationReason ? <small>Reason: {appt.cancellationReason}</small> : null}
                </div>
                <div className="row-actions">
                  <button
                    className="ghost-button"
                    onClick={() => toggleExpanded(appt.id)}
                    type="button"
                  >
                    {expandedAppointmentId === appt.id ? 'Hide details' : 'View details'}
                  </button>
                </div>

                {expandedAppointmentId === appt.id ? (
                  renderAppointmentInsight(appt)
                ) : null}
              </article>
            ))}
          </div>
        </article>
      ) : null}
    </div>
  );
}

export default DoctorAppointmentsPanel;
