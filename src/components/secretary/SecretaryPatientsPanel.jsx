import { useEffect, useState } from 'react';
import {
  createGuardian,
  createPatient,
  fetchGuardianById,
  searchGuardians,
  searchPatients,
  updateGuardian,
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

  const [standaloneGuardianSearchTerm, setStandaloneGuardianSearchTerm] = useState('');
  const [standaloneGuardianResults, setStandaloneGuardianResults] = useState([]);
  const [standaloneSelectedGuardian, setStandaloneSelectedGuardian] = useState(null);
  const [standaloneGuardianEditForm, setStandaloneGuardianEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    jmbg: '',
    gender: 'F',
    dateOfBirth: '',
  });

  const [isSearchingPatients, setIsSearchingPatients] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [isUpdatingPatient, setIsUpdatingPatient] = useState(false);
  const [isSearchingEditGuardian, setIsSearchingEditGuardian] = useState(false);
  const [isSearchingStandaloneGuardian, setIsSearchingStandaloneGuardian] = useState(false);
  const [isLoadingStandaloneGuardianDetails, setIsLoadingStandaloneGuardianDetails] = useState(false);
  const [isSavingStandaloneGuardian, setIsSavingStandaloneGuardian] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadAllGuardians() {
      try {
        const response = await searchGuardians(session.token, '');
        if (!ignore) {
          setStandaloneGuardianResults(response);
        }
      } catch {
        if (!ignore) {
          setStandaloneGuardianResults([]);
        }
      }
    }

    loadAllGuardians();

    return () => {
      ignore = true;
    };
  }, [session.token]);

  useEffect(() => {
    let ignore = false;

    async function loadStandaloneGuardian() {
      if (!standaloneSelectedGuardian?.id) {
        setStandaloneGuardianEditForm({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          jmbg: '',
          gender: 'F',
          dateOfBirth: '',
        });
        return;
      }

      setIsLoadingStandaloneGuardianDetails(true);
      try {
        const guardian = await fetchGuardianById(session.token, standaloneSelectedGuardian.id);
        if (!ignore) {
          setStandaloneSelectedGuardian(guardian);
          setStandaloneGuardianEditForm({
            firstName: guardian.firstName || '',
            lastName: guardian.lastName || '',
            email: guardian.email || '',
            phoneNumber: guardian.phoneNumber || '',
            jmbg: guardian.jmbg || '',
            gender: guardian.gender || 'F',
            dateOfBirth: guardian.dateOfBirth ? String(guardian.dateOfBirth).slice(0, 10) : '',
          });
        }
      } catch {
        if (!ignore) {
          setStandaloneGuardianEditForm({
            firstName: '',
            lastName: '',
            email: '',
            phoneNumber: '',
            jmbg: '',
            gender: 'F',
            dateOfBirth: '',
          });
        }
      } finally {
        if (!ignore) {
          setIsLoadingStandaloneGuardianDetails(false);
        }
      }
    }

    loadStandaloneGuardian();

    return () => {
      ignore = true;
    };
  }, [session.token, standaloneSelectedGuardian?.id]);

  function updatePatientFormField(field, value) {
    setPatientFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateGuardianFormField(field, value) {
    setGuardianFormState((current) => ({ ...current, [field]: value }));
  }

  function updateEditPatientField(field, value) {
    setEditPatientState((current) => ({
      ...current,
      [field]: value,
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

    try {
      const payload = {
        firstName: guardianFormState.firstName,
        lastName: guardianFormState.lastName,
        email: guardianFormState.email || null,
        phoneNumber: guardianFormState.phoneNumber,
        jmbg: guardianFormState.jmbg,
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
        email: patientFormState.email || null,
        phoneNumber: patientFormState.phoneNumber,
        jmbg: patientFormState.jmbg,
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

  async function handleSearchStandaloneGuardians(event) {
    event.preventDefault();

    setIsSearchingStandaloneGuardian(true);
    try {
      const response = await searchGuardians(session.token, standaloneGuardianSearchTerm.trim());
      setStandaloneGuardianResults(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search guardians.');
    } finally {
      setIsSearchingStandaloneGuardian(false);
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

    setIsUpdatingPatient(true);
    setErrorMessage('');
    setStatusMessage('');

    const payload = {
      firstName: editPatientState.firstName,
      lastName: editPatientState.lastName,
      email: editPatientState.email || null,
      phoneNumber: editPatientState.phoneNumber,
      jmbg: editPatientState.jmbg,
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

  async function handleSaveStandaloneGuardian(event) {
    event.preventDefault();

    if (!standaloneSelectedGuardian?.id) {
      return;
    }

    setIsSavingStandaloneGuardian(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const updatedGuardian = await updateGuardian(session.token, standaloneSelectedGuardian.id, {
        firstName: standaloneGuardianEditForm.firstName,
        lastName: standaloneGuardianEditForm.lastName,
        email: standaloneGuardianEditForm.email || null,
        phoneNumber: standaloneGuardianEditForm.phoneNumber,
        jmbg: standaloneGuardianEditForm.jmbg,
        gender: standaloneGuardianEditForm.gender,
        dateOfBirth: standaloneGuardianEditForm.dateOfBirth,
        addressId: standaloneSelectedGuardian.addressId || null,
      });

      setStandaloneSelectedGuardian(updatedGuardian);
      setStatusMessage(`Guardian ${updatedGuardian.firstName} ${updatedGuardian.lastName} updated.`);
      playUiFeedbackSound('edited');

      setStandaloneGuardianResults((current) => current.map((guardian) => (
        guardian.id === updatedGuardian.id ? updatedGuardian : guardian
      )));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update guardian.');
    } finally {
      setIsSavingStandaloneGuardian(false);
    }
  }

  const isPatientMinor = (getAge(patientFormState.dateOfBirth) ?? 99) < 18;
  const canCreatePatient = !isPatientMinor || selectedGuardian !== null;

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-secretary">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Patients workspace</p>
            <h2>Patient records and guardians</h2>
          </div>
          <button className="ghost-button" onClick={() => setShowCreatePatient((current) => !current)} type="button">
            {showCreatePatient ? 'Close new patient' : 'New patient'}
          </button>
        </div>
        <p>Use this tab for patient maintenance: search, create, edit, guardian linking, and guardian contact-detail updates.</p>
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
              placeholder="Name, email, phone, or patient record"
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
                <p>{patient.email || patient.phoneNumber || 'No contact details'}</p>
              </div>
              <div className="data-meta">
                <span>{formatPatientProfileSummary(patient)}</span>
                <small>No-show count: {patient.noShowCount}</small>
              </div>
              <div className="row-actions">
                <button className={selectedPatient?.id === patient.id ? 'primary-button' : 'ghost-button'} onClick={() => selectPatient(patient)} type="button">
                  {selectedPatient?.id === patient.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      <article className="workspace-panel">
        <p className="eyebrow">Guardian lookup</p>
        <h2>Find guardian</h2>
        <form className="auth-form" onSubmit={handleSearchStandaloneGuardians}>
          <label>
            <span>Search term</span>
            <input
              onChange={(event) => setStandaloneGuardianSearchTerm(event.target.value)}
              placeholder="Name, email, phone, guardian record, or leave empty for all"
              type="text"
              value={standaloneGuardianSearchTerm}
            />
          </label>
          <button
            className="primary-button"
            disabled={isSearchingStandaloneGuardian}
            type="submit"
          >
            {isSearchingStandaloneGuardian ? 'Searching...' : 'Search guardians'}
          </button>
        </form>

        {standaloneGuardianResults.length > 0 ? (
          <div className="data-list data-list-scroll" style={{ marginBottom: '0.75rem' }}>
            {standaloneGuardianResults.map((guardian) => (
              <article className={`data-row${standaloneSelectedGuardian?.id === guardian.id ? ' data-row-selected' : ''}`} key={guardian.id}>
                <div>
                  <strong>{guardian.firstName} {guardian.lastName}</strong>
                  <p>{guardian.email || guardian.phoneNumber || 'No contact details'}</p>
                </div>
                <div className="data-meta">
                  <span>JMBG: {guardian.jmbg}</span>
                </div>
                <div className="row-actions">
                  <button
                    className={standaloneSelectedGuardian?.id === guardian.id ? 'primary-button' : 'ghost-button'}
                    onClick={() => {
                      setStandaloneSelectedGuardian(guardian);
                      playUiFeedbackSound('select');
                    }}
                    type="button"
                  >
                    {standaloneSelectedGuardian?.id === guardian.id ? 'Selected' : 'Select'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : null}

      </article>

      {standaloneSelectedGuardian ? (
        <article className="workspace-panel">
          <p className="eyebrow">Guardian maintenance</p>
          <h2>Edit selected guardian</h2>
          <form className="admin-form" onSubmit={handleSaveStandaloneGuardian}>
            {isLoadingStandaloneGuardianDetails ? <p>Loading guardian details...</p> : null}
            {!isLoadingStandaloneGuardianDetails ? (
              <>
                <div className="form-grid">
                  <label>
                    <span>First name</span>
                    <input
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, firstName: event.target.value }))}
                      required
                      type="text"
                      value={standaloneGuardianEditForm.firstName}
                    />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, lastName: event.target.value }))}
                      required
                      type="text"
                      value={standaloneGuardianEditForm.lastName}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, email: event.target.value }))}
                      type="email"
                      value={standaloneGuardianEditForm.email}
                    />
                  </label>
                  <label>
                    <span>Phone number</span>
                    <input
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                      required
                      type="text"
                      value={standaloneGuardianEditForm.phoneNumber}
                    />
                  </label>
                  <label>
                    <span>JMBG</span>
                    <input
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, jmbg: event.target.value }))}
                      required
                      type="text"
                      value={standaloneGuardianEditForm.jmbg}
                    />
                  </label>
                  <label>
                    <span>Gender</span>
                    <select
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, gender: event.target.value }))}
                      value={standaloneGuardianEditForm.gender}
                    >
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </label>
                  <label>
                    <span>Date of birth</span>
                    <input
                      onChange={(event) => setStandaloneGuardianEditForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                      required
                      type="date"
                      value={standaloneGuardianEditForm.dateOfBirth}
                    />
                  </label>
                </div>
                <div className="row-actions">
                  <button className="primary-button" disabled={isSavingStandaloneGuardian} type="submit">
                    {isSavingStandaloneGuardian ? 'Saving...' : 'Save guardian changes'}
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setStandaloneSelectedGuardian(null);
                      setStandaloneGuardianEditForm({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phoneNumber: '',
                        jmbg: '',
                        gender: 'F',
                        dateOfBirth: '',
                      });
                    }}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : null}
          </form>
        </article>
      ) : null}

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
                        <input onChange={(event) => updateGuardianFormField('jmbg', event.target.value)} required type="text" value={guardianFormState.jmbg} />
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
                        || !guardianFormState.jmbg.trim()
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
                <input onChange={(event) => updateEditPatientField('phoneNumber', event.target.value)} required type="text" value={editPatientState.phoneNumber} />
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
                    <article className={`data-row${selectedEditGuardian?.id === g.id ? ' data-row-selected' : ''}`} key={g.id}>
                      <div>
                        <strong>{g.firstName} {g.lastName}</strong>
                        <p>{g.email || g.phoneNumber || 'No contact details'}</p>
                      </div>
                      <div className="row-actions">
                        <button
                          className={selectedEditGuardian?.id === g.id ? 'primary-button' : 'ghost-button'}
                          onClick={() => setSelectedEditGuardian((current) => (current?.id === g.id ? null : g))}
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

            {(getAge(editPatientState.dateOfBirth) ?? 99) < 18 && !selectedEditGuardian ? (
              <p className="warn-hint">Minor patients must have a linked guardian before you can save changes.</p>
            ) : null}

            <button
              className="primary-button"
              disabled={isUpdatingPatient || ((getAge(editPatientState.dateOfBirth) ?? 99) < 18 && !selectedEditGuardian)}
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
