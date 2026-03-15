import { useEffect, useState } from 'react';
import {
  cancelAppointment,
  checkInAppointment,
  fetchDoctorAppointments,
  fetchDoctors,
  fetchPatientAppointments,
  markAppointmentNoShow,
  searchPatients,
} from '../../lib/api';
import { formatDateForInput } from '../../lib/appointments';
import { playUiFeedbackSound } from '../../lib/ui-feedback';
import AppointmentLifecycleList from '../appointments/AppointmentLifecycleList';
import CancelAppointmentDialog from '../appointments/CancelAppointmentDialog';

function SecretaryAppointmentsPanel({ session }) {
  const [patients, setPatients] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);

  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [fromDate, setFromDate] = useState(formatDateForInput(new Date()));
  const [toDate, setToDate] = useState(formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [doctorAppointments, setDoctorAppointments] = useState([]);

  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingDoctorAppointments, setIsLoadingDoctorAppointments] = useState(false);
  const [actionAppointmentId, setActionAppointmentId] = useState(null);
  const [cancelTargetAppointmentId, setCancelTargetAppointmentId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (toDate < fromDate) {
      setToDate(fromDate);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    let ignore = false;

    async function loadDoctors() {
      setIsLoadingDoctors(true);
      setErrorMessage('');

      try {
        const response = await fetchDoctors(session.token, session.worker?.clinicId || undefined);

        if (!ignore) {
          setDoctors(response);
          setSelectedDoctorId(response[0] ? String(response[0].id) : '');
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load doctors.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingDoctors(false);
        }
      }
    }

    loadDoctors();

    return () => {
      ignore = true;
    };
  }, [session.token, session.worker?.clinicId]);

  useEffect(() => {
    let ignore = false;

    async function loadDoctorAppointments() {
      if (!selectedDoctorId) {
        setDoctorAppointments([]);
        return;
      }

      setIsLoadingDoctorAppointments(true);

      try {
        const response = await fetchDoctorAppointments(session.token, selectedDoctorId, fromDate, toDate);
        if (!ignore) {
          setDoctorAppointments(response);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load doctor appointments.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingDoctorAppointments(false);
        }
      }
    }

    loadDoctorAppointments();

    return () => {
      ignore = true;
    };
  }, [session.token, selectedDoctorId, fromDate, toDate]);

  async function refreshPatientAppointments(patientId) {
    const response = await fetchPatientAppointments(session.token, patientId);
    setPatientAppointments(response);
  }

  async function refreshDoctorAppointments() {
    if (!selectedDoctorId) {
      setDoctorAppointments([]);
      return;
    }

    const response = await fetchDoctorAppointments(session.token, selectedDoctorId, fromDate, toDate);
    setDoctorAppointments(response);
  }

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
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search patients.');
    } finally {
      setIsSearchingPatients(false);
    }
  }

  async function handleSelectPatient(patient) {
    setSelectedPatient(patient);
    setErrorMessage('');
    setStatusMessage('');
    playUiFeedbackSound('select');

    try {
      await refreshPatientAppointments(patient.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load patient appointments.');
    }
  }

  async function handleCheckIn(appointmentId) {
    setActionAppointmentId(appointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await checkInAppointment(session.token, appointmentId);
      setStatusMessage(`Appointment #${appointmentId} checked in.`);
      playUiFeedbackSound('edited');

      if (selectedPatient?.id) {
        await refreshPatientAppointments(selectedPatient.id);
      }
      await refreshDoctorAppointments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to check in appointment.');
    } finally {
      setActionAppointmentId(null);
    }
  }

  function handleCancel(appointmentId) {
    setCancelTargetAppointmentId(appointmentId);
    setCancelReason('');
    setErrorMessage('');
    setStatusMessage('');
  }

  function closeCancelDialog() {
    if (actionAppointmentId) {
      return;
    }

    setCancelTargetAppointmentId(null);
    setCancelReason('');
  }

  async function handleConfirmCancel() {
    if (!cancelTargetAppointmentId) {
      return;
    }

    const normalizedReason = cancelReason.trim();

    if (!normalizedReason) {
      setErrorMessage('Cancellation reason is required.');
      return;
    }

    setActionAppointmentId(cancelTargetAppointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await cancelAppointment(session.token, cancelTargetAppointmentId, normalizedReason);
      setStatusMessage(`Appointment #${cancelTargetAppointmentId} cancelled.`);
      playUiFeedbackSound('cancelled');
      setCancelTargetAppointmentId(null);
      setCancelReason('');

      if (selectedPatient?.id) {
        await refreshPatientAppointments(selectedPatient.id);
      }
      await refreshDoctorAppointments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to cancel appointment.');
    } finally {
      setActionAppointmentId(null);
    }
  }

  async function handleNoShow(appointmentId) {
    setActionAppointmentId(appointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await markAppointmentNoShow(session.token, appointmentId);
      setStatusMessage(`Appointment #${appointmentId} marked as no-show.`);
      playUiFeedbackSound('edited');

      if (selectedPatient?.id) {
        await refreshPatientAppointments(selectedPatient.id);
      }
      await refreshDoctorAppointments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark no-show.');
    } finally {
      setActionAppointmentId(null);
    }
  }

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-secretary">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Desk appointments</p>
            <h2>Appointment lookup and lifecycle</h2>
          </div>
          <span className="status-chip">{doctors.length} doctors</span>
        </div>
        <p>Search patients to manage their appointments, and inspect doctor schedules with the same lifecycle action controls.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <div className="secretary-grid secretary-desk-stack compact-grid">
        <article className="workspace-panel secretary-card-wide">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Patient lookup</p>
              <h2>Find patient appointments</h2>
            </div>
          </div>

          <form className="auth-form" onSubmit={handleSearchPatients}>
            <label>
              <span>Search term</span>
              <input
                onChange={(event) => setPatientSearchTerm(event.target.value)}
                placeholder="Name, email, phone, or JMBG"
                type="text"
                value={patientSearchTerm}
              />
            </label>
            <button className="primary-button" disabled={isSearchingPatients} type="submit">
              {isSearchingPatients ? 'Searching...' : 'Search patients'}
            </button>
          </form>

          <div className="data-list data-list-scroll">
            {patients.map((patient) => (
              <article className={`data-row${selectedPatient?.id === patient.id ? ' data-row-selected' : ''}`} key={patient.id}>
                <div>
                  <strong>{patient.firstName} {patient.lastName}</strong>
                  <p>{patient.email || patient.phoneNumber}</p>
                </div>
                <div className="data-meta">
                  <span>JMBG {patient.jmbg}</span>
                  <small>No-show count: {patient.noShowCount}</small>
                </div>
                <div className="row-actions">
                  <button className={selectedPatient?.id === patient.id ? 'primary-button' : 'ghost-button'} onClick={() => handleSelectPatient(patient)} type="button">
                    {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </article>
            ))}
          </div>

          <h3 className="subheading">Selected patient appointments</h3>
          <AppointmentLifecycleList
            actionAppointmentId={actionAppointmentId}
            appointments={patientAppointments}
            onCancel={handleCancel}
            onCheckIn={handleCheckIn}
            onNoShow={handleNoShow}
          />
        </article>

        <article className="workspace-panel secretary-card-wide">
          <p className="eyebrow">Doctor lookup</p>
          <h2>Doctor appointment schedule</h2>

          {isLoadingDoctors ? <p>Loading doctors...</p> : null}

          {!isLoadingDoctors ? (
            <div className="admin-form">
              <div className="form-grid">
                <label>
                  <span>Doctor</span>
                  <select
                    onChange={(event) => {
                      setSelectedDoctorId(event.target.value);
                      playUiFeedbackSound('select');
                    }}
                    value={selectedDoctorId}
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.firstName} {doctor.lastName} ({doctor.specialty || 'General'})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>From date</span>
                  <input onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
                </label>
                <label>
                  <span>To date</span>
                  <input min={fromDate} onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
                </label>
              </div>
            </div>
          ) : null}

          {isLoadingDoctorAppointments ? <p>Loading doctor appointments...</p> : null}
          {!isLoadingDoctorAppointments ? (
            <AppointmentLifecycleList
              actionAppointmentId={actionAppointmentId}
              appointments={doctorAppointments}
              onCancel={handleCancel}
              onCheckIn={handleCheckIn}
              onNoShow={handleNoShow}
            />
          ) : null}
        </article>
      </div>

      {cancelTargetAppointmentId ? (
        <CancelAppointmentDialog
          isSubmitting={actionAppointmentId === cancelTargetAppointmentId}
          onClose={closeCancelDialog}
          onConfirm={handleConfirmCancel}
          onReasonChange={setCancelReason}
          reason={cancelReason}
        />
      ) : null}
    </div>
  );
}

export default SecretaryAppointmentsPanel;