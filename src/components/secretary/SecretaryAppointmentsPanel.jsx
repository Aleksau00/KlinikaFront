import { useEffect, useState } from 'react';
import {
  cancelAppointment,
  checkInAppointment,
  fetchClinicScheduleForDate,
  fetchDoctorAppointments,
  fetchDoctors,
  fetchPatientAppointments,
  markAppointmentNoShow,
  searchPatients,
} from '../../lib/api';
import { formatDateForInput } from '../../lib/appointments';
import { formatAppointmentReference, formatPatientProfileSummary } from '../../lib/display';
import { playUiFeedbackSound } from '../../lib/ui-feedback';
import AppointmentLifecycleList from '../appointments/AppointmentLifecycleList';
import CancelAppointmentDialog from '../appointments/CancelAppointmentDialog';
import {
  CalendarRange,
  CalendarSearch,
  Inbox,
  Search,
  Stethoscope,
  UserCheck,
  Users,
} from 'lucide-react';

function SecretaryAppointmentsPanel({ session }) {
  const [patients, setPatients] = useState([]);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientAppointments, setPatientAppointments] = useState([]);

  const [doctors, setDoctors] = useState([]);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [fromDate, setFromDate] = useState(formatDateForInput(new Date()));
  const [toDate, setToDate] = useState(formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [clinicDate, setClinicDate] = useState(formatDateForInput(new Date()));
  const [clinicAppointments, setClinicAppointments] = useState([]);

  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingDoctorAppointments, setIsLoadingDoctorAppointments] = useState(false);
  const [isLoadingClinicAppointments, setIsLoadingClinicAppointments] = useState(false);
  const [actionAppointmentId, setActionAppointmentId] = useState(null);
  const [cancelTargetAppointmentId, setCancelTargetAppointmentId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonError, setCancelReasonError] = useState('');

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (toDate < fromDate) {
      setToDate(fromDate);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    let ignore = false;

    async function loadInitialPatients() {
      setIsSearchingPatients(true);

      try {
        const response = await searchPatients(session.token, '');

        if (!ignore) {
          setPatients(response);
          if (response.length === 0) {
            setSelectedPatient(null);
            setPatientAppointments([]);
          }
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load patients.');
        }
      } finally {
        if (!ignore) {
          setIsSearchingPatients(false);
        }
      }
    }

    loadInitialPatients();

    return () => {
      ignore = true;
    };
  }, [session.token]);

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

  useEffect(() => {
    let ignore = false;

    async function loadClinicAppointments() {
      if (!session.worker?.clinicId || !clinicDate) {
        setClinicAppointments([]);
        return;
      }

      setIsLoadingClinicAppointments(true);

      try {
        const response = await fetchClinicScheduleForDate(session.token, session.worker.clinicId, clinicDate);
        if (!ignore) {
          setClinicAppointments(response);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load clinic appointments.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingClinicAppointments(false);
        }
      }
    }

    loadClinicAppointments();

    return () => {
      ignore = true;
    };
  }, [clinicDate, session.token, session.worker?.clinicId]);

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

  async function refreshClinicAppointments() {
    if (!session.worker?.clinicId || !clinicDate) {
      setClinicAppointments([]);
      return;
    }

    const response = await fetchClinicScheduleForDate(session.token, session.worker.clinicId, clinicDate);
    setClinicAppointments(response);
  }

  function getAppointmentReference(appointmentId) {
    const appointment = [...patientAppointments, ...doctorAppointments].find((item) => item.id === appointmentId);
    return formatAppointmentReference(appointment);
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

  function handleSelectDoctor(doctorId) {
    setSelectedDoctorId(String(doctorId));
    setErrorMessage('');
    setStatusMessage('');
    playUiFeedbackSound('select');
  }

  async function handleCheckIn(appointmentId) {
    setActionAppointmentId(appointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await checkInAppointment(session.token, appointmentId);
      setStatusMessage(`${getAppointmentReference(appointmentId)} checked in.`);
      playUiFeedbackSound('edited');

      if (selectedPatient?.id) {
        await refreshPatientAppointments(selectedPatient.id);
      }
      await refreshDoctorAppointments();
      await refreshClinicAppointments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to check in appointment.');
    } finally {
      setActionAppointmentId(null);
    }
  }

  function handleCancel(appointmentId) {
    setCancelTargetAppointmentId(appointmentId);
    setCancelReason('');
    setCancelReasonError('');
    setErrorMessage('');
    setStatusMessage('');
  }

  function closeCancelDialog() {
    if (actionAppointmentId) {
      return;
    }

    setCancelTargetAppointmentId(null);
    setCancelReason('');
    setCancelReasonError('');
  }

  async function handleConfirmCancel() {
    if (!cancelTargetAppointmentId) {
      return;
    }

    const normalizedReason = cancelReason.trim();

    if (!normalizedReason) {
      setCancelReasonError('Cancellation reason is required.');
      return;
    }

    setCancelReasonError('');
    setActionAppointmentId(cancelTargetAppointmentId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await cancelAppointment(session.token, cancelTargetAppointmentId, normalizedReason);
      setStatusMessage(`${getAppointmentReference(cancelTargetAppointmentId)} cancelled.`);
      playUiFeedbackSound('cancelled');
      setCancelTargetAppointmentId(null);
      setCancelReason('');

      if (selectedPatient?.id) {
        await refreshPatientAppointments(selectedPatient.id);
      }
      await refreshDoctorAppointments();
      await refreshClinicAppointments();
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
      setStatusMessage(`${getAppointmentReference(appointmentId)} marked as no-show.`);
      playUiFeedbackSound('edited');

      if (selectedPatient?.id) {
        await refreshPatientAppointments(selectedPatient.id);
      }
      await refreshDoctorAppointments();
      await refreshClinicAppointments();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark no-show.');
    } finally {
      setActionAppointmentId(null);
    }
  }

  const normalizedDoctorTerm = doctorSearchTerm.trim().toLowerCase();
  const filteredDoctors = normalizedDoctorTerm
    ? doctors.filter((doctor) => {
      const fullName = `${doctor.firstName || ''} ${doctor.lastName || ''}`.toLowerCase();
      const specialty = String(doctor.specialty || '').toLowerCase();
      const email = String(doctor.email || '').toLowerCase();
      return fullName.includes(normalizedDoctorTerm)
        || specialty.includes(normalizedDoctorTerm)
        || email.includes(normalizedDoctorTerm);
    })
    : doctors;

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-secretary">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Desk appointments</p>
            <h2 className="panel-title"><CalendarSearch className="panel-icon" /> Appointment lookup and lifecycle</h2>
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
              <h2 className="panel-title"><Users className="panel-icon" /> Find patient appointments</h2>
            </div>
          </div>
          <p className="muted-hint">Recent patients are shown below even before search.</p>

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
              <Search className="button-icon" />
              {isSearchingPatients ? 'Searching...' : 'Search patients'}
            </button>
          </form>

          <div className="data-list data-list-scroll">
            {isSearchingPatients ? (
              <div className="list-skeleton" aria-hidden="true">
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
                <div className="skeleton-row" />
              </div>
            ) : null}
            {patients.map((patient) => (
              <article
                className={`data-row${selectedPatient?.id === patient.id ? ' data-row-selected' : ''}`}
                key={patient.id}
                onClick={() => handleSelectPatient(patient)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleSelectPatient(patient);
                  }
                }}
                role="button"
                tabIndex={0}
              >
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
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectPatient(patient);
                    }}
                    type="button"
                  >
                    <UserCheck className="button-icon" />
                    {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </article>
            ))}
            {!isSearchingPatients && patients.length === 0 ? (
              <article className="empty-state-card" role="status">
                <Inbox className="empty-state-icon" />
                <h3>No patients found</h3>
                <p>Try another filter or adjust your patient search.</p>
              </article>
            ) : null}
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
          <h2 className="panel-title"><Stethoscope className="panel-icon" /> Doctor appointment schedule</h2>
          <p className="muted-hint">Choose a doctor from the list and set a date range.</p>

          {isLoadingDoctors ? (
            <div className="list-skeleton" aria-hidden="true">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : null}

          {!isLoadingDoctors ? (
            <>
              <form
                className="doctor-filter-row"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <label className="doctor-search-field">
                  <span>Search doctor</span>
                  <input
                    onChange={(event) => setDoctorSearchTerm(event.target.value)}
                    placeholder="Name, specialty, or email"
                    type="text"
                    value={doctorSearchTerm}
                  />
                </label>
                <label className="compact-date-field">
                  <span>From date</span>
                  <input onChange={(event) => setFromDate(event.target.value)} type="date" value={fromDate} />
                </label>
                <label className="compact-date-field">
                  <span>To date</span>
                  <input min={fromDate} onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
                </label>
              </form>

              <div className="data-list data-list-scroll">
                {filteredDoctors.map((doctor) => (
                  <article
                    className={`data-row${selectedDoctorId === String(doctor.id) ? ' data-row-selected' : ''}`}
                    key={doctor.id}
                    onClick={() => handleSelectDoctor(doctor.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectDoctor(doctor.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div>
                      <strong>Dr. {doctor.firstName} {doctor.lastName}</strong>
                      <p>{doctor.email || doctor.phoneNumber || 'No contact details'}</p>
                    </div>
                    <div className="data-meta">
                      <span>{doctor.specialty || 'General medicine'}</span>
                    </div>
                    <div className="row-actions">
                      <button
                        className={selectedDoctorId === String(doctor.id) ? 'primary-button' : 'ghost-button'}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSelectDoctor(doctor.id);
                        }}
                        type="button"
                      >
                        <UserCheck className="button-icon" />
                        {selectedDoctorId === String(doctor.id) ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </article>
                ))}
                {!filteredDoctors.length ? (
                  <article className="empty-state-card" role="status">
                    <Inbox className="empty-state-icon" />
                    <h3>No doctors found</h3>
                    <p>Try changing the search term or date range.</p>
                  </article>
                ) : null}
              </div>
            </>
          ) : null}

          {isLoadingDoctorAppointments ? <p>Loading doctor appointments...</p> : null}
          {!isLoadingDoctorAppointments ? (
            <div className="lookup-results-divider">
              <h3 className="panel-title"><CalendarRange className="panel-icon" /> Doctor appointments</h3>
              <AppointmentLifecycleList
                actionAppointmentId={actionAppointmentId}
                appointments={doctorAppointments}
                onCancel={handleCancel}
                onCheckIn={handleCheckIn}
                onNoShow={handleNoShow}
              />
            </div>
          ) : null}
        </article>

        <article className="workspace-panel secretary-card-wide">
          <p className="eyebrow">Clinic lookup</p>
          <h2 className="panel-title"><CalendarRange className="panel-icon" /> Clinic schedule for day</h2>
          <div className="admin-form">
            <label>
              <span>Date</span>
              <input
                onChange={(event) => setClinicDate(event.target.value)}
                type="date"
                value={clinicDate}
              />
            </label>
          </div>

          {isLoadingClinicAppointments ? <p>Loading clinic appointments...</p> : null}
          {!isLoadingClinicAppointments ? (
            <AppointmentLifecycleList
              actionAppointmentId={actionAppointmentId}
              appointments={clinicAppointments}
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
          onReasonChange={(value) => {
            setCancelReason(value);
            if (value.trim()) {
              setCancelReasonError('');
            }
          }}
          reason={cancelReason}
          reasonError={cancelReasonError}
        />
      ) : null}
    </div>
  );
}

export default SecretaryAppointmentsPanel;