import { useEffect, useMemo, useState } from 'react';
import {
  fetchPatientAllergens,
  fetchPatientAppointments,
  fetchPatientVaccinationRecords,
  searchPatients,
} from '../../lib/api';
import { formatAppointmentStatus } from '../../lib/appointments';
import {
  formatAppointmentType,
  formatDateLabel,
  formatPatientProfileSummary,
} from '../../lib/display';
import { playUiFeedbackSound } from '../../lib/ui-feedback';

function toAppointmentTimestamp(appointment) {
  const date = String(appointment?.scheduledDate || '').trim();
  const time = String(appointment?.scheduledStartTime || '').slice(0, 8);

  if (!date || !time) {
    return 0;
  }

  const parsed = new Date(`${date}T${time}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function isPastAppointment(appointment) {
  const status = String(appointment?.status || '');

  if (status === 'Completed' || status === 'Cancelled' || status === 'NoShow' || appointment?.status === 2 || appointment?.status === 3 || appointment?.status === 4) {
    return true;
  }

  const timestamp = toAppointmentTimestamp(appointment);
  return timestamp > 0 && timestamp < Date.now();
}

function DoctorPatientsPanel({ session }) {
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientVaccinations, setPatientVaccinations] = useState([]);
  const [patientAllergens, setPatientAllergens] = useState([]);

  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isLoadingPatientContext, setIsLoadingPatientContext] = useState(false);
  const [expandedPastAppointmentId, setExpandedPastAppointmentId] = useState(null);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadAllPatients() {
      try {
        const response = await searchPatients(session.token, '');
        if (!ignore) {
          setPatients(response);
        }
      } catch {
        if (!ignore) {
          setPatients([]);
        }
      }
    }

    loadAllPatients();

    return () => {
      ignore = true;
    };
  }, [session.token]);

  async function handleSearchPatients(event) {
    event.preventDefault();
    setIsSearchingPatients(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await searchPatients(session.token, patientSearchTerm.trim());
      setPatients(response);

      if (response.length === 0) {
        setSelectedPatient(null);
        setPatientAppointments([]);
        setPatientVaccinations([]);
        setPatientAllergens([]);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search patients.');
    } finally {
      setIsSearchingPatients(false);
    }
  }

  async function handleSelectPatient(patient) {
    setSelectedPatient(patient);
    setExpandedPastAppointmentId(null);
    setIsLoadingPatientContext(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const [appointments, vaccinations, allergens] = await Promise.all([
        fetchPatientAppointments(session.token, patient.id),
        fetchPatientVaccinationRecords(session.token, patient.id),
        fetchPatientAllergens(session.token, patient.id),
      ]);

      setPatientAppointments(appointments);
      setPatientVaccinations(vaccinations);
      setPatientAllergens(allergens);
      setStatusMessage(`Loaded profile context for ${patient.firstName} ${patient.lastName}.`);
      playUiFeedbackSound('select');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load patient overview data.');
      setPatientAppointments([]);
      setPatientVaccinations([]);
      setPatientAllergens([]);
    } finally {
      setIsLoadingPatientContext(false);
    }
  }

  const pastAppointments = useMemo(() => {
    return [...patientAppointments]
      .filter(isPastAppointment)
      .sort((left, right) => toAppointmentTimestamp(right) - toAppointmentTimestamp(left));
  }, [patientAppointments]);

  function togglePastAppointmentDetails(appointmentId) {
    setExpandedPastAppointmentId((current) => (current === appointmentId ? null : appointmentId));
  }

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-doctor">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">My patients</p>
            <h2>Patient overview</h2>
          </div>
        </div>
        <p>Review patient background outside the live appointment workflow: past appointments, vaccination history, and allergen context.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <p className="eyebrow">Patient lookup</p>
        <h2>Find patient</h2>
        <form className="auth-form" onSubmit={handleSearchPatients}>
          <label>
            <span>Search term</span>
            <input
              onChange={(event) => setPatientSearchTerm(event.target.value)}
              placeholder="Name, email, phone, or patient record"
              type="text"
              value={patientSearchTerm}
            />
          </label>
          <button className="primary-button" disabled={isSearchingPatients} type="submit">
            {isSearchingPatients ? 'Searching...' : 'Search patients'}
          </button>
        </form>

        <div className="data-list data-list-scroll" style={{ marginTop: '0.75rem' }}>
          {patients.map((patient) => (
            <article className={`data-row${selectedPatient?.id === patient.id ? ' data-row-selected' : ''}`} key={patient.id}>
              <div>
                <strong>{patient.firstName} {patient.lastName}</strong>
                <p>{patient.email || patient.phoneNumber || 'No contact details'}</p>
              </div>
              <div className="data-meta">
                <span>{formatPatientProfileSummary(patient)}</span>
                <small>No-show count: {patient.noShowCount}</small>
              </div>
              <div className="row-actions">
                <button
                  className={selectedPatient?.id === patient.id ? 'primary-button' : 'ghost-button'}
                  onClick={() => handleSelectPatient(patient)}
                  type="button"
                >
                  {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      {selectedPatient ? (
        <div className="clinical-context-grid">
          <article className="workspace-panel clinical-card">
            <p className="eyebrow">Visit history</p>
            <h3>Past appointments</h3>
            {isLoadingPatientContext ? <p>Loading appointments...</p> : null}
            {!isLoadingPatientContext && pastAppointments.length === 0 ? <p className="muted-hint">No past appointments found.</p> : null}
            {!isLoadingPatientContext && pastAppointments.length > 0 ? (
              <div className="data-list data-list-scroll">
                {pastAppointments.slice(0, 15).map((appointment) => (
                  <article className="data-row" key={appointment.id}>
                    <div>
                      <strong>{formatAppointmentType(appointment.appointmentType)}</strong>
                      <p>{appointment.scheduledDate} at {String(appointment.scheduledStartTime || '').slice(0, 5)}</p>
                    </div>
                    <div className="data-meta">
                      <span>{formatAppointmentStatus(appointment.status)}</span>
                      <small>{appointment.doctorName || 'Doctor unavailable'}</small>
                    </div>
                    <div className="row-actions">
                      <button
                        className="ghost-button"
                        onClick={() => togglePastAppointmentDetails(appointment.id)}
                        type="button"
                      >
                        {expandedPastAppointmentId === appointment.id ? 'Hide details' : 'View details'}
                      </button>
                    </div>

                    {expandedPastAppointmentId === appointment.id ? (
                      <div style={{ width: '100%', marginTop: '0.5rem' }}>
                        <div className="clinical-note-list">
                          <p><strong>Clinic:</strong> {appointment.clinicName || 'Unavailable'}</p>
                          <p><strong>Booked at:</strong> {formatDateLabel(appointment.bookedAt)}</p>
                          <p><strong>Checked in:</strong> {appointment.checkedInAt ? formatDateLabel(appointment.checkedInAt) : 'Unavailable'}</p>
                          <p><strong>Completed:</strong> {appointment.completedAt ? formatDateLabel(appointment.completedAt) : 'Unavailable'}</p>
                          {appointment.cancellationReason ? <p><strong>Cancellation reason:</strong> {appointment.cancellationReason}</p> : null}
                          {appointment.anamnesis ? <p><strong>Anamnesis:</strong> {appointment.anamnesis}</p> : null}
                          {appointment.statusObservation ? <p><strong>Status observation:</strong> {appointment.statusObservation}</p> : null}
                          {appointment.therapy ? <p><strong>Therapy:</strong> {appointment.therapy}</p> : null}
                          {appointment.diagnosedCondition ? <p><strong>Diagnosed condition:</strong> {appointment.diagnosedCondition}</p> : null}
                          {appointment.preventiveNotes ? <p><strong>Preventive notes:</strong> {appointment.preventiveNotes}</p> : null}
                          {appointment.childDevelopmentNotes ? <p><strong>Growth / development:</strong> {appointment.childDevelopmentNotes}</p> : null}
                          {appointment.vaccinationNotes ? <p><strong>Vaccination notes:</strong> {appointment.vaccinationNotes}</p> : null}
                        </div>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}
          </article>

          <article className="workspace-panel clinical-card">
            <p className="eyebrow">Immunization context</p>
            <h3>Vaccination history</h3>
            {isLoadingPatientContext ? <p>Loading vaccination history...</p> : null}
            {!isLoadingPatientContext && patientVaccinations.length === 0 ? <p className="muted-hint">No vaccination records found.</p> : null}
            {!isLoadingPatientContext && patientVaccinations.length > 0 ? (
              <ul>
                {patientVaccinations.slice(0, 15).map((record) => (
                  <li key={record.id}>
                    <strong>{record.vaccinationName}</strong>
                    {' '}
                    ({formatDateLabel(record.administeredDate)})
                    {record.notes ? ` - ${record.notes}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>

          <article className="workspace-panel clinical-card">
            <p className="eyebrow">Patient safety</p>
            <h3>Known allergens</h3>
            {isLoadingPatientContext ? <p>Loading allergen data...</p> : null}
            {!isLoadingPatientContext && patientAllergens.length === 0 ? <p className="muted-hint">No known allergens.</p> : null}
            {!isLoadingPatientContext && patientAllergens.length > 0 ? (
              <ul>
                {patientAllergens.map((allergen) => (
                  <li key={`${allergen.patientId}-${allergen.allergenId}`}>
                    <strong>{allergen.allergenName}</strong>
                    {allergen.notes ? ` - ${allergen.notes}` : ''}
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </div>
      ) : null}
    </div>
  );
}

export default DoctorPatientsPanel;