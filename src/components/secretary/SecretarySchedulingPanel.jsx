import { useEffect, useState } from 'react';
import { bookAppointment, createPatient, fetchDoctorAvailableSlots, fetchDoctors, searchPatients } from '../../lib/api';
import { initialPatientForm } from '../../config/roles';
import { formatDateForInput } from '../../lib/appointments';
import { formatPatientProfileSummary, formatSlotReference } from '../../lib/display';
import { playUiFeedbackSound } from '../../lib/ui-feedback';

function getAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const today = new Date();
  const dob = new Date(dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function SecretarySchedulingPanel({ session }) {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [fromDate, setFromDate] = useState(formatDateForInput(new Date()));
  const [toDate, setToDate] = useState(formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)));
  const [slots, setSlots] = useState([]);
  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientFormState, setPatientFormState] = useState(initialPatientForm);

  const [appointmentType, setAppointmentType] = useState('0');

  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isBookingAppointment, setIsBookingAppointment] = useState(false);

  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [guardianResults, setGuardianResults] = useState([]);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [isSearchingGuardian, setIsSearchingGuardian] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const selectedSlot = slots.find((slot) => slot.id === selectedSlotId) || null;

  useEffect(() => {
    let ignore = false;

    async function loadDoctors() {
      setIsLoadingDoctors(true);
      setErrorMessage('');

      try {
        const response = await fetchDoctors(session.token, session.worker?.clinicId || undefined);

        if (!ignore) {
          setDoctors(response);

          if (response.length > 0) {
            setSelectedDoctorId(String(response[0].id));
          }
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

    async function loadSlots() {
      if (!selectedDoctorId) {
        setSlots([]);
        return;
      }

      setIsLoadingSlots(true);
      setErrorMessage('');

      try {
        const response = await fetchDoctorAvailableSlots(session.token, selectedDoctorId, fromDate, toDate);

        if (!ignore) {
          setSlots(response);
          setSelectedSlotId((current) => {
            if (!current) {
              return response[0]?.id || null;
            }

            return response.some((slot) => slot.id === current) ? current : response[0]?.id || null;
          });
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load available slots.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadSlots();

    return () => {
      ignore = true;
    };
  }, [session.token, selectedDoctorId, fromDate, toDate]);

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
  }

  async function handleSearchGuardian() {
    if (!guardianSearchTerm.trim()) return;
    setIsSearchingGuardian(true);
    try {
      const response = await searchPatients(session.token, guardianSearchTerm.trim());
      setGuardianResults(response.filter((p) => (getAge(p.dateOfBirth) ?? 0) >= 18));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search for guardian.');
    } finally {
      setIsSearchingGuardian(false);
    }
  }

  function updatePatientFormField(field, value) {
    setPatientFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreatePatient(event) {
    event.preventDefault();
    setIsCreatingPatient(true);
    setErrorMessage('');
    setStatusMessage('');

    const payload = {
      firstName: patientFormState.firstName,
      lastName: patientFormState.lastName,
      email: patientFormState.email || null,
      phoneNumber: patientFormState.phoneNumber,
      jmbg: patientFormState.jmbg,
      gender: patientFormState.gender,
      dateOfBirth: patientFormState.dateOfBirth,
      bloodType: patientFormState.bloodType,
      guardianId: selectedGuardian?.id ?? null,
      addressId: null,
    };

    try {
      const created = await createPatient(session.token, payload);
      setStatusMessage(`Patient ${created.firstName} ${created.lastName} created.`);
      playUiFeedbackSound('created');
      setPatientFormState(initialPatientForm);
      setSelectedGuardian(null);
      setGuardianResults([]);
      setGuardianSearchTerm('');
      setShowCreatePatient(false);

      const refreshedPatients = await searchPatients(session.token, created.jmbg);
      setPatients(refreshedPatients);

      const createdFromList = refreshedPatients.find((p) => p.id === created.id) || created;
      setSelectedPatient(createdFromList);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create patient.');
    } finally {
      setIsCreatingPatient(false);
    }
  }

  async function handleBookAppointment() {
    if (!selectedPatient?.id || !selectedSlotId) {
      setErrorMessage('Select both a patient and an available slot before booking.');
      return;
    }

    setIsBookingAppointment(true);
    setErrorMessage('');
    setStatusMessage('');

    const payload = {
      appointmentSlotId: selectedSlotId,
      patientId: selectedPatient.id,
      appointmentType: Number(appointmentType),
    };

    try {
      await bookAppointment(session.token, payload);
      setStatusMessage('Appointment booked successfully.');
      playUiFeedbackSound('created');
      const freshSlots = await fetchDoctorAvailableSlots(session.token, selectedDoctorId, fromDate, toDate);
      setSlots(freshSlots);
      setSelectedSlotId(freshSlots[0]?.id || null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to book appointment.');
    } finally {
      setIsBookingAppointment(false);
    }
  }

  const isPatientMinor = (getAge(patientFormState.dateOfBirth) ?? 99) < 18;
  const canCreatePatient = !isPatientMinor || selectedGuardian !== null;

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-secretary">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Front desk</p>
            <h2>Secretary scheduling and intake</h2>
          </div>
          <span className="status-chip">{doctors.length} doctors</span>
        </div>
        <p>Use this panel to find patients, create new patient records, pick doctor slots, and execute booking/check-in/cancel/no-show workflows.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <div className="secretary-grid secretary-desk-stack compact-grid">
        <article className="workspace-panel secretary-card-wide">
          <p className="eyebrow">Doctors and slots</p>
          <h2>Available appointment slots</h2>

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
                  <input onChange={(event) => setToDate(event.target.value)} type="date" value={toDate} />
                </label>
              </div>

              {isLoadingSlots ? <p>Loading slots...</p> : null}
              {!isLoadingSlots && slots.length === 0 ? (
                <p className="muted-hint">No available slots found for this doctor in the selected date range. Try extending the To date.</p>
              ) : null}
              {!isLoadingSlots && slots.length > 0 ? (
                <div className="data-list data-list-scroll">
                  {slots.map((slot) => (
                    <article className={`data-row${selectedSlotId === slot.id ? ' data-row-selected' : ''}`} key={slot.id}>
                      <div>
                        <strong>{slot.doctorName}</strong>
                        <p>{slot.date} {String(slot.startTime).slice(0, 5)} – {String(slot.endTime).slice(0, 5)}</p>
                      </div>
                      <div className="row-actions">
                        <button
                          className={selectedSlotId === slot.id ? 'primary-button' : 'ghost-button'}
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            playUiFeedbackSound('select');
                          }}
                          type="button"
                        >
                          {selectedSlotId === slot.id ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="workspace-panel secretary-card-regular" style={{ alignSelf: 'start' }}>
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Patients</p>
              <h2>Find or create patient</h2>
            </div>
            <button className="ghost-button" onClick={() => setShowCreatePatient((current) => !current)} type="button">
              {showCreatePatient ? 'Close form' : 'New patient'}
            </button>
          </div>

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

          {showCreatePatient ? (
            <form className="admin-form" onSubmit={handleCreatePatient}>
              <div className="form-grid">
                <label>
                  <span>First name</span>
                  <input onChange={(event) => updatePatientFormField('firstName', event.target.value)} required type="text" value={patientFormState.firstName} />
                </label>
                <label>
                  <span>Last name</span>
                  <input onChange={(event) => updatePatientFormField('lastName', event.target.value)} required type="text" value={patientFormState.lastName} />
                </label>
                <label>
                  <span>Email</span>
                  <input onChange={(event) => updatePatientFormField('email', event.target.value)} type="email" value={patientFormState.email} />
                </label>
                <label>
                  <span>Phone number</span>
                  <input onChange={(event) => updatePatientFormField('phoneNumber', event.target.value)} required type="text" value={patientFormState.phoneNumber} />
                </label>
                <label>
                  <span>JMBG</span>
                  <input onChange={(event) => updatePatientFormField('jmbg', event.target.value)} required type="text" value={patientFormState.jmbg} />
                </label>
                <label>
                  <span>Gender</span>
                  <select onChange={(event) => updatePatientFormField('gender', event.target.value)} value={patientFormState.gender}>
                    <option value="F">Female</option>
                    <option value="M">Male</option>
                  </select>
                </label>
                <label>
                  <span>Date of birth</span>
                  <input onChange={(event) => updatePatientFormField('dateOfBirth', event.target.value)} required type="date" value={patientFormState.dateOfBirth} />
                </label>
                <label>
                  <span>Blood type</span>
                  <input onChange={(event) => updatePatientFormField('bloodType', event.target.value)} required type="text" value={patientFormState.bloodType} />
                </label>
              </div>
              {isPatientMinor ? (
                <div className="guardian-search-section">
                  <p className="eyebrow">Guardian required</p>
                  <p className="muted-hint">This patient is under 18. Search for and select an adult guardian from existing patient records.</p>
                  <div className="form-inline-search">
                    <input
                      onChange={(event) => setGuardianSearchTerm(event.target.value)}
                      placeholder="Search guardian by name, email, or phone"
                      type="text"
                      value={guardianSearchTerm}
                    />
                    <button
                      className="ghost-button"
                      disabled={isSearchingGuardian || !guardianSearchTerm.trim()}
                      onClick={handleSearchGuardian}
                      type="button"
                    >
                      {isSearchingGuardian ? 'Searching...' : 'Find guardian'}
                    </button>
                  </div>
                  {guardianResults.length > 0 ? (
                    <div className="data-list">
                      {guardianResults.map((g) => (
                        <article className={`data-row${selectedGuardian?.id === g.id ? ' data-row-selected' : ''}`} key={g.id}>
                          <div>
                            <strong>{g.firstName} {g.lastName}</strong>
                            <p>{g.email || g.phoneNumber || 'No contact details'}</p>
                          </div>
                          <div className="row-actions">
                            <button
                              className={selectedGuardian?.id === g.id ? 'primary-button' : 'ghost-button'}
                              onClick={() => setSelectedGuardian((current) => (current?.id === g.id ? null : g))}
                              type="button"
                            >
                              {selectedGuardian?.id === g.id ? 'Selected ✓' : 'Select'}
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : null}
                  {selectedGuardian ? (
                    <p className="info-banner">Guardian linked: {selectedGuardian.firstName} {selectedGuardian.lastName}</p>
                  ) : (
                    <p className="warn-hint">No guardian selected — required for patients under 18.</p>
                  )}
                </div>
              ) : null}
              <button className="primary-button" disabled={isCreatingPatient || !canCreatePatient} title={!canCreatePatient ? 'Select a guardian before saving a minor patient' : undefined} type="submit">
                {isCreatingPatient ? 'Creating patient...' : 'Create patient'}
              </button>
            </form>
          ) : null}

          <div className="data-list data-list-scroll">
            {patients.map((patient) => (
              <article className={`data-row${selectedPatient?.id === patient.id ? ' data-row-selected' : ''}`} key={patient.id}>
                <div>
                  <strong>{patient.firstName} {patient.lastName}</strong>
                  <p>{patient.email || patient.phoneNumber || 'No contact details'}</p>
                </div>
                <div className="data-meta">
                  <span>{formatPatientProfileSummary(patient)}</span>
                  {(getAge(patient.dateOfBirth) ?? 99) < 18 ? (
                    <small className="minor-indicator">
                      {'Minor'}
                      {!patient.guardianId ? ' · No guardian linked' : ''}
                    </small>
                  ) : null}
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
        </article>

        <article className="workspace-panel secretary-card-regular" style={{ alignSelf: 'start' }}>
          <p className="eyebrow">Booking</p>
          <h2>Create appointment</h2>
          <p>
            Selected patient: {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'None'}
          </p>
          <p>
            Selected slot: {formatSlotReference(selectedSlot)}
          </p>

          <div className="admin-form">
            <label>
              <span>Appointment type</span>
              <select onChange={(event) => setAppointmentType(event.target.value)} value={appointmentType}>
                <option value="0">Preventive</option>
                <option value="1">Treatment</option>
              </select>
            </label>

            <button className="primary-button" disabled={isBookingAppointment} onClick={handleBookAppointment} type="button">
              {isBookingAppointment ? 'Booking...' : 'Book appointment'}
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}

export default SecretarySchedulingPanel;