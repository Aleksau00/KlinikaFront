import { useEffect, useState } from 'react';
import {
  createGuardian,
  createPatient,
  searchGuardians,
  searchPatients,
  updatePatient,
} from '../../lib/api';
import { initialPatientForm } from '../../config/roles';
import { formatPatientProfileSummary } from '../../lib/display';
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

function normalizeJmbgValue(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 13);
}

const initialGuardianForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  jmbg: '',
  gender: 'F',
  dateOfBirth: '1985-01-01',
};

function SecretaryPatientsPanel({ session }) {
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientFormState, setPatientFormState] = useState(initialPatientForm);

  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [guardianResults, setGuardianResults] = useState([]);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [isSearchingGuardian, setIsSearchingGuardian] = useState(false);
  const [guardianFormState, setGuardianFormState] = useState(initialGuardianForm);
  const [showCreateGuardian, setShowCreateGuardian] = useState(false);
  const [isCreatingGuardian, setIsCreatingGuardian] = useState(false);

  const [editPatientState, setEditPatientState] = useState(initialPatientForm);
  const [selectedEditGuardian, setSelectedEditGuardian] = useState(null);
  const [editGuardianSearchTerm, setEditGuardianSearchTerm] = useState('');
  const [editGuardianResults, setEditGuardianResults] = useState([]);

  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [isSearchingEditGuardian, setIsSearchingEditGuardian] = useState(false);

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

  function updatePatientFormField(field, value) {
    setPatientFormState((current) => ({
      ...current,
      [field]: field === 'jmbg' ? normalizeJmbgValue(value) : value,
    }));
  }

  function updateGuardianFormField(field, value) {
    setGuardianFormState((current) => ({
      ...current,
      [field]: field === 'jmbg' ? normalizeJmbgValue(value) : value,
    }));
  }

  function updateEditPatientField(field, value) {
    setEditPatientState((current) => ({
      ...current,
      [field]: field === 'jmbg' ? normalizeJmbgValue(value) : value,
    }));
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
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search patients.');
    } finally {
      setIsSearchingPatients(false);
    }
  }

  function selectPatient(patient) {
    setSelectedPatient(patient);
    setEditPatientState({
      firstName: patient.firstName || '',
      lastName: patient.lastName || '',
      email: patient.email || '',
      phoneNumber: patient.phoneNumber || '',
      jmbg: patient.jmbg || '',
      gender: patient.gender || 'F',
      dateOfBirth: patient.dateOfBirth ? String(patient.dateOfBirth).slice(0, 10) : '',
      bloodType: patient.bloodType || '',
    });
    setSelectedEditGuardian(
      patient.guardianId
        ? {
          id: patient.guardianId,
          firstName: patient.guardianName || 'Linked guardian',
          lastName: '',
        }
        : null,
    );
    setEditGuardianSearchTerm('');
    setEditGuardianResults([]);
    setErrorMessage('');
    setStatusMessage('');
    playUiFeedbackSound('select');
  }

  async function handleSearchGuardian() {
    setIsSearchingGuardian(true);
    try {
      const response = await searchGuardians(session.token, guardianSearchTerm.trim());
      setGuardianResults(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search guardians.');
    } finally {
      setIsSearchingGuardian(false);
    }
  }

  async function handleCreateGuardian() {
    setIsCreatingGuardian(true);
    setErrorMessage('');
    setStatusMessage('');

    const normalizedJmbg = normalizeJmbgValue(guardianFormState.jmbg);
    if (normalizedJmbg.length !== 13) {
      setIsCreatingGuardian(false);
      setErrorMessage('Guardian JMBG must contain exactly 13 digits.');
      return;
    }

    try {
      const payload = {
        firstName: guardianFormState.firstName,
        lastName: guardianFormState.lastName,
        email: guardianFormState.email || null,
        phoneNumber: guardianFormState.phoneNumber,
        jmbg: normalizedJmbg,
        gender: guardianFormState.gender,
        dateOfBirth: guardianFormState.dateOfBirth,
        addressId: null,
      };
      const created = await createGuardian(session.token, payload);
      setSelectedGuardian(created);
      setGuardianFormState(initialGuardianForm);
      setShowCreateGuardian(false);
      setGuardianResults([]);
      setGuardianSearchTerm('');
      setStatusMessage(`Guardian ${created.firstName} ${created.lastName} created and linked.`);
      playUiFeedbackSound('created');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create guardian.');
    } finally {
      setIsCreatingGuardian(false);
    }
  }

  async function handleCreatePatient(event) {
    event.preventDefault();

    const normalizedJmbg = normalizeJmbgValue(patientFormState.jmbg);
    if (normalizedJmbg.length !== 13) {
      setErrorMessage('JMBG must contain exactly 13 digits.');
      return;
    }

    const isMinor = (getAge(patientFormState.dateOfBirth) ?? 99) < 18;
    if (isMinor && !selectedGuardian?.id) {
      setErrorMessage('A guardian must be linked for patients under 18.');
      return;
    }

    setIsCreatingPatient(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload = {
        firstName: patientFormState.firstName,
        lastName: patientFormState.lastName,
        email: patientFormState.email.trim() || null,
        phoneNumber: patientFormState.phoneNumber.trim() || null,
        jmbg: normalizedJmbg,
        gender: patientFormState.gender,
        dateOfBirth: patientFormState.dateOfBirth,
        bloodType: patientFormState.bloodType,
        guardianId: selectedGuardian?.id ?? null,
        addressId: null,
      };

      const created = await createPatient(session.token, payload);
      setStatusMessage(`Patient ${created.firstName} ${created.lastName} created.`);
      setPatientFormState(initialPatientForm);
      setSelectedGuardian(null);
      setGuardianResults([]);
      setGuardianSearchTerm('');
      setGuardianFormState(initialGuardianForm);
      setShowCreateGuardian(false);

      const refreshedPatients = await searchPatients(session.token, created.jmbg);
      setPatients(refreshedPatients);
      const createdFromList = refreshedPatients.find((p) => p.id === created.id) || created;
      selectPatient(createdFromList);
      playUiFeedbackSound('created');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create patient.');
    } finally {
      setIsCreatingPatient(false);
    }
  }

  async function handleSearchEditGuardian() {
    setIsSearchingEditGuardian(true);
    try {
      const response = await searchGuardians(session.token, editGuardianSearchTerm.trim());
      setEditGuardianResults(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search guardians.');
    } finally {
      setIsSearchingEditGuardian(false);
    }
  }

  async function handleUpdatePatient(event) {
    event.preventDefault();

    if (!selectedPatient?.id) {
      setErrorMessage('Select a patient first.');
      return;
    }

    const minor = (getAge(editPatientState.dateOfBirth) ?? 99) < 18;
    if (minor && !selectedEditGuardian?.id) {
      setErrorMessage('A guardian must be linked for patients under 18.');
      return;
    }

    const normalizedJmbg = normalizeJmbgValue(editPatientState.jmbg);
    if (normalizedJmbg.length !== 13) {
      setErrorMessage('JMBG must contain exactly 13 digits.');
      return;
    }

    setIsUpdatingPatient(true);
    setErrorMessage('');
    setStatusMessage('');

    const payload = {
      firstName: editPatientState.firstName,
      lastName: editPatientState.lastName,
      email: editPatientState.email || null,
      phoneNumber: editPatientState.phoneNumber,
      jmbg: normalizedJmbg,
      gender: editPatientState.gender,
      dateOfBirth: editPatientState.dateOfBirth,
      bloodType: editPatientState.bloodType,
      guardianId: selectedEditGuardian?.id || null,
      addressId: null,
    };

    try {
      const updated = await updatePatient(session.token, selectedPatient.id, payload);
      const refreshedPatients = await searchPatients(session.token, updated.jmbg || selectedPatient.jmbg);
      setPatients(refreshedPatients);
      const refreshed = refreshedPatients.find((p) => p.id === updated.id) || updated;
      selectPatient(refreshed);
      setStatusMessage(`Patient ${updated.firstName} ${updated.lastName} updated.`);
      playUiFeedbackSound('edited');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update patient.');
    } finally {
      setIsUpdatingPatient(false);
    }
  }

  const isPatientMinor = (getAge(patientFormState.dateOfBirth) ?? 99) < 18;
  const isEditPatientMinor = (getAge(editPatientState.dateOfBirth) ?? 99) < 18;
  const createPatientJmbgLength = normalizeJmbgValue(patientFormState.jmbg).length;
  const createGuardianJmbgLength = normalizeJmbgValue(guardianFormState.jmbg).length;
  const canCreatePatient = (!isPatientMinor || selectedGuardian !== null) && createPatientJmbgLength === 13;

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-secretary">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Patients workspace</p>
            <h2>Patient records</h2>
          </div>
          <button className="ghost-button" onClick={() => setShowCreatePatient((current) => !current)} type="button">
            {showCreatePatient ? 'Close new patient' : 'New patient'}
          </button>
        </div>
        <p>Use this tab for patient search, registration, and patient record updates including guardian linking.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <p className="eyebrow">Lookup</p>
        <h2>Find patient</h2>
        <form className="auth-form" onSubmit={handleSearchPatients}>
          <label>
            <span>Search term</span>
            <input
              onChange={(event) => setPatientSearchTerm(event.target.value)}
              placeholder="Name, email, phone, patient record, or leave empty for all"
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
            <article
              className={`data-row${selectedPatient?.id === patient.id ? ' data-row-selected' : ''}`}
              key={patient.id}
              onClick={() => selectPatient(patient)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  selectPatient(patient);
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
                <button className={selectedPatient?.id === patient.id ? 'primary-button' : 'ghost-button'} onClick={(event) => { event.stopPropagation(); selectPatient(patient); }} type="button">
                  {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      {showCreatePatient ? (
        <article className="workspace-panel">
          <p className="eyebrow">Patient registration</p>
          <h2>Create new patient</h2>
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
                <input onChange={(event) => updatePatientFormField('phoneNumber', event.target.value)} type="text" value={patientFormState.phoneNumber} />
              </label>
              <label>
                <span>JMBG</span>
                <input
                  inputMode="numeric"
                  maxLength={13}
                  onChange={(event) => updatePatientFormField('jmbg', event.target.value)}
                  pattern="[0-9]{13}"
                  placeholder="13 digits"
                  required
                  type="text"
                  value={patientFormState.jmbg}
                />
                <p className={createPatientJmbgLength === 13 ? 'muted-hint' : 'warn-hint'}>
                  {createPatientJmbgLength === 13
                    ? 'JMBG length is valid (13/13).'
                    : `JMBG must contain exactly 13 digits (${createPatientJmbgLength}/13 entered).`}
                </p>
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
                <div className="panel-heading-row">
                  <div>
                    <p className="eyebrow">Guardian required</p>
                    <p className="muted-hint">Patient is under 18. Link an existing adult or create a new guardian record.</p>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setShowCreateGuardian((current) => !current);
                      setGuardianSearchTerm('');
                      setGuardianResults([]);
                    }}
                    type="button"
                  >
                    {showCreateGuardian ? 'Search instead' : 'New guardian'}
                  </button>
                </div>

                {showCreateGuardian ? (
                  <div className="admin-form">
                    <div className="form-grid">
                      <label>
                        <span>First name</span>
                        <input onChange={(event) => updateGuardianFormField('firstName', event.target.value)} required type="text" value={guardianFormState.firstName} />
                      </label>
                      <label>
                        <span>Last name</span>
                        <input onChange={(event) => updateGuardianFormField('lastName', event.target.value)} required type="text" value={guardianFormState.lastName} />
                      </label>
                      <label>
                        <span>Email</span>
                        <input onChange={(event) => updateGuardianFormField('email', event.target.value)} type="email" value={guardianFormState.email} />
                      </label>
                      <label>
                        <span>Phone number</span>
                        <input onChange={(event) => updateGuardianFormField('phoneNumber', event.target.value)} required type="text" value={guardianFormState.phoneNumber} />
                      </label>
                      <label>
                        <span>JMBG</span>
                        <input
                          inputMode="numeric"
                          maxLength={13}
                          onChange={(event) => updateGuardianFormField('jmbg', event.target.value)}
                          pattern="[0-9]{13}"
                          placeholder="13 digits"
                          required
                          type="text"
                          value={guardianFormState.jmbg}
                        />
                        <p className={createGuardianJmbgLength === 13 ? 'muted-hint' : 'warn-hint'}>
                          {createGuardianJmbgLength === 13
                            ? 'Guardian JMBG length is valid (13/13).'
                            : `Guardian JMBG must contain exactly 13 digits (${createGuardianJmbgLength}/13 entered).`}
                        </p>
                      </label>
                      <label>
                        <span>Gender</span>
                        <select onChange={(event) => updateGuardianFormField('gender', event.target.value)} value={guardianFormState.gender}>
                          <option value="F">Female</option>
                          <option value="M">Male</option>
                        </select>
                      </label>
                      <label>
                        <span>Date of birth</span>
                        <input onChange={(event) => updateGuardianFormField('dateOfBirth', event.target.value)} required type="date" value={guardianFormState.dateOfBirth} />
                      </label>
                    </div>
                    <button
                      className="primary-button"
                      disabled={
                        isCreatingGuardian
                        || !guardianFormState.firstName.trim()
                        || !guardianFormState.lastName.trim()
                        || !guardianFormState.phoneNumber.trim()
                        || createGuardianJmbgLength !== 13
                        || !guardianFormState.dateOfBirth
                        || (getAge(guardianFormState.dateOfBirth) ?? 0) < 18
                      }
                      onClick={handleCreateGuardian}
                      type="button"
                    >
                      {isCreatingGuardian ? 'Creating guardian...' : 'Create and link guardian'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="form-inline-search">
                      <input
                        onChange={(event) => setGuardianSearchTerm(event.target.value)}
                        placeholder="Search guardian by name, email, or phone"
                        type="text"
                        value={guardianSearchTerm}
                      />
                      <button
                        className="ghost-button"
                        disabled={isSearchingGuardian}
                        onClick={handleSearchGuardian}
                        type="button"
                      >
                        {isSearchingGuardian ? 'Searching...' : 'Find guardian'}
                      </button>
                    </div>
                    {guardianResults.length > 0 ? (
                      <div className="data-list">
                        {guardianResults.map((g) => (
                          <article
                            className={`data-row${selectedGuardian?.id === g.id ? ' data-row-selected' : ''}`}
                            key={g.id}
                            onClick={() => setSelectedGuardian((current) => (current?.id === g.id ? null : g))}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                setSelectedGuardian((current) => (current?.id === g.id ? null : g));
                              }
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            <div>
                              <strong>{g.firstName} {g.lastName}</strong>
                              <p>{g.email || g.phoneNumber || 'No contact details'}</p>
                            </div>
                            <div className="row-actions">
                              <button
                                className={selectedGuardian?.id === g.id ? 'primary-button' : 'ghost-button'}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSelectedGuardian((current) => (current?.id === g.id ? null : g));
                                }}
                                type="button"
                              >
                                {selectedGuardian?.id === g.id ? 'Selected ✓' : 'Select'}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <button className="primary-button" disabled={isCreatingPatient || !canCreatePatient} type="submit">
              {isCreatingPatient ? 'Creating patient...' : 'Create patient'}
            </button>
          </form>
        </article>
      ) : null}

      {selectedPatient ? (
        <article className="workspace-panel">
          <p className="eyebrow">Patient maintenance</p>
          <h2>Edit selected patient</h2>
          <form className="admin-form" onSubmit={handleUpdatePatient}>
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input onChange={(event) => updateEditPatientField('firstName', event.target.value)} required type="text" value={editPatientState.firstName} />
              </label>
              <label>
                <span>Last name</span>
                <input onChange={(event) => updateEditPatientField('lastName', event.target.value)} required type="text" value={editPatientState.lastName} />
              </label>
              <label>
                <span>Email</span>
                <input onChange={(event) => updateEditPatientField('email', event.target.value)} type="email" value={editPatientState.email} />
              </label>
              <label>
                <span>Phone number</span>
                <input
                  onChange={(event) => updateEditPatientField('phoneNumber', event.target.value)}
                  required={!isEditPatientMinor}
                  type="text"
                  value={editPatientState.phoneNumber}
                />
                {isEditPatientMinor ? <p className="muted-hint">Optional for underage patients.</p> : null}
              </label>
              <label>
                <span>JMBG</span>
                <input onChange={(event) => updateEditPatientField('jmbg', event.target.value)} required type="text" value={editPatientState.jmbg} />
              </label>
              <label>
                <span>Gender</span>
                <select onChange={(event) => updateEditPatientField('gender', event.target.value)} value={editPatientState.gender}>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input onChange={(event) => updateEditPatientField('dateOfBirth', event.target.value)} required type="date" value={editPatientState.dateOfBirth} />
              </label>
              <label>
                <span>Blood type</span>
                <input onChange={(event) => updateEditPatientField('bloodType', event.target.value)} required type="text" value={editPatientState.bloodType} />
              </label>
            </div>

            <div className="guardian-search-section">
              <div className="panel-heading-row">
                <div>
                  <p className="eyebrow">Guardian link</p>
                  <p className="muted-hint">Link, switch, or unlink guardian for this patient.</p>
                </div>
              </div>

              <div className="form-inline-search">
                <input
                  onChange={(event) => setEditGuardianSearchTerm(event.target.value)}
                  placeholder="Search guardian by name, email, or phone"
                  type="text"
                  value={editGuardianSearchTerm}
                />
                <button
                  className="ghost-button"
                  disabled={isSearchingEditGuardian}
                  onClick={handleSearchEditGuardian}
                  type="button"
                >
                  {isSearchingEditGuardian ? 'Searching...' : 'Find guardian'}
                </button>
              </div>

              {editGuardianResults.length > 0 ? (
                <div className="data-list">
                  {editGuardianResults.map((g) => (
                    <article
                      className={`data-row${selectedEditGuardian?.id === g.id ? ' data-row-selected' : ''}`}
                      key={g.id}
                      onClick={() => setSelectedEditGuardian((current) => (current?.id === g.id ? null : g))}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedEditGuardian((current) => (current?.id === g.id ? null : g));
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <strong>{g.firstName} {g.lastName}</strong>
                        <p>{g.email || g.phoneNumber || 'No contact details'}</p>
                      </div>
                      <div className="row-actions">
                        <button
                          className={selectedEditGuardian?.id === g.id ? 'primary-button' : 'ghost-button'}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedEditGuardian((current) => (current?.id === g.id ? null : g));
                          }}
                          type="button"
                        >
                          {selectedEditGuardian?.id === g.id ? 'Selected ✓' : 'Select'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {selectedEditGuardian ? (
                <p className="info-banner">
                  {'Guardian linked: '}
                  {selectedEditGuardian.firstName} {selectedEditGuardian.lastName}
                  {'  '}
                  <button
                    className="ghost-button"
                    onClick={() => setSelectedEditGuardian(null)}
                    style={{ fontSize: '0.8rem', padding: '2px 10px' }}
                    type="button"
                  >
                    Unlink
                  </button>
                </p>
              ) : null}
            </div>

            {isEditPatientMinor && !selectedEditGuardian ? (
              <p className="warn-hint">Minor patients must have a linked guardian before you can save changes.</p>
            ) : null}

            <button
              className="primary-button"
              disabled={isUpdatingPatient || (isEditPatientMinor && !selectedEditGuardian)}
              type="submit"
            >
              {isUpdatingPatient ? 'Saving...' : 'Save patient changes'}
            </button>
          </form>
        </article>
      ) : null}

    </div>
  );
}

export default SecretaryPatientsPanel;
