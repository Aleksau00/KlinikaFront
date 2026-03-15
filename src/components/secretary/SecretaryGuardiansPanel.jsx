import { useEffect, useState } from 'react';
import {
  createGuardian,
  fetchGuardianById,
  searchGuardians,
  updateGuardian,
} from '../../lib/api';
import { playUiFeedbackSound } from '../../lib/ui-feedback';

const initialGuardianForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  jmbg: '',
  gender: 'F',
  dateOfBirth: '1985-01-01',
};

const initialGuardianEditForm = {
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  jmbg: '',
  gender: 'F',
  dateOfBirth: '',
};

function SecretaryGuardiansPanel({ session }) {
  const [guardianSearchTerm, setGuardianSearchTerm] = useState('');
  const [guardians, setGuardians] = useState([]);
  const [selectedGuardian, setSelectedGuardian] = useState(null);
  const [guardianEditForm, setGuardianEditForm] = useState(initialGuardianEditForm);

  const [showCreateGuardian, setShowCreateGuardian] = useState(false);
  const [newGuardianForm, setNewGuardianForm] = useState(initialGuardianForm);

  const [isSearchingGuardians, setIsSearchingGuardians] = useState(false);
  const [isLoadingGuardianDetails, setIsLoadingGuardianDetails] = useState(false);
  const [isSavingGuardian, setIsSavingGuardian] = useState(false);
  const [isCreatingGuardian, setIsCreatingGuardian] = useState(false);

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let ignore = false;

    async function loadAllGuardians() {
      try {
        const response = await searchGuardians(session.token, '');
        if (!ignore) {
          setGuardians(response);
        }
      } catch {
        if (!ignore) {
          setGuardians([]);
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

    async function loadSelectedGuardian() {
      if (!selectedGuardian?.id) {
        setGuardianEditForm(initialGuardianEditForm);
        return;
      }

      setIsLoadingGuardianDetails(true);
      try {
        const guardian = await fetchGuardianById(session.token, selectedGuardian.id);
        if (!ignore) {
          setSelectedGuardian(guardian);
          setGuardianEditForm({
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
          setGuardianEditForm(initialGuardianEditForm);
        }
      } finally {
        if (!ignore) {
          setIsLoadingGuardianDetails(false);
        }
      }
    }

    loadSelectedGuardian();

    return () => {
      ignore = true;
    };
  }, [session.token, selectedGuardian?.id]);

  async function handleSearchGuardians(event) {
    event.preventDefault();

    setIsSearchingGuardians(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const response = await searchGuardians(session.token, guardianSearchTerm.trim());
      setGuardians(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to search guardians.');
    } finally {
      setIsSearchingGuardians(false);
    }
  }

  async function handleCreateGuardian(event) {
    event.preventDefault();

    setIsCreatingGuardian(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const createdGuardian = await createGuardian(session.token, {
        firstName: newGuardianForm.firstName,
        lastName: newGuardianForm.lastName,
        email: newGuardianForm.email || null,
        phoneNumber: newGuardianForm.phoneNumber,
        jmbg: newGuardianForm.jmbg,
        gender: newGuardianForm.gender,
        dateOfBirth: newGuardianForm.dateOfBirth,
        addressId: null,
      });

      setStatusMessage(`Guardian ${createdGuardian.firstName} ${createdGuardian.lastName} created.`);
      setShowCreateGuardian(false);
      setNewGuardianForm(initialGuardianForm);
      setGuardians((current) => [createdGuardian, ...current.filter((guardian) => guardian.id !== createdGuardian.id)]);
      setSelectedGuardian(createdGuardian);
      playUiFeedbackSound('created');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create guardian.');
    } finally {
      setIsCreatingGuardian(false);
    }
  }

  async function handleSaveGuardian(event) {
    event.preventDefault();

    if (!selectedGuardian?.id) {
      return;
    }

    setIsSavingGuardian(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const updatedGuardian = await updateGuardian(session.token, selectedGuardian.id, {
        firstName: guardianEditForm.firstName,
        lastName: guardianEditForm.lastName,
        email: guardianEditForm.email || null,
        phoneNumber: guardianEditForm.phoneNumber,
        jmbg: guardianEditForm.jmbg,
        gender: guardianEditForm.gender,
        dateOfBirth: guardianEditForm.dateOfBirth,
        addressId: selectedGuardian.addressId || null,
      });

      setSelectedGuardian(updatedGuardian);
      setStatusMessage(`Guardian ${updatedGuardian.firstName} ${updatedGuardian.lastName} updated.`);
      setGuardians((current) => current.map((guardian) => (
        guardian.id === updatedGuardian.id ? updatedGuardian : guardian
      )));
      playUiFeedbackSound('edited');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update guardian.');
    } finally {
      setIsSavingGuardian(false);
    }
  }

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-secretary">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Guardians workspace</p>
            <h2>Guardian records</h2>
          </div>
          <button className="ghost-button" onClick={() => setShowCreateGuardian((current) => !current)} type="button">
            {showCreateGuardian ? 'Close new guardian' : 'New guardian'}
          </button>
        </div>
        <p>Use this tab to search, create, and update guardian records without mixing patient maintenance.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <p className="eyebrow">Lookup</p>
        <h2>Find guardian</h2>
        <form className="auth-form" onSubmit={handleSearchGuardians}>
          <label>
            <span>Search term</span>
            <input
              onChange={(event) => setGuardianSearchTerm(event.target.value)}
              placeholder="Name, email, phone, guardian record, or leave empty for all"
              type="text"
              value={guardianSearchTerm}
            />
          </label>
          <button className="primary-button" disabled={isSearchingGuardians} type="submit">
            {isSearchingGuardians ? 'Searching...' : 'Search guardians'}
          </button>
        </form>

        <div className="data-list data-list-scroll" style={{ marginTop: '0.75rem' }}>
          {guardians.map((guardian) => (
            <article className={`data-row${selectedGuardian?.id === guardian.id ? ' data-row-selected' : ''}`} key={guardian.id}>
              <div>
                <strong>{guardian.firstName} {guardian.lastName}</strong>
                <p>{guardian.email || guardian.phoneNumber || 'No contact details'}</p>
              </div>
              <div className="data-meta">
                <span>JMBG: {guardian.jmbg}</span>
              </div>
              <div className="row-actions">
                <button
                  className={selectedGuardian?.id === guardian.id ? 'primary-button' : 'ghost-button'}
                  onClick={() => {
                    setSelectedGuardian(guardian);
                    playUiFeedbackSound('select');
                  }}
                  type="button"
                >
                  {selectedGuardian?.id === guardian.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </article>

      {showCreateGuardian ? (
        <article className="workspace-panel">
          <p className="eyebrow">Guardian registration</p>
          <h2>Create new guardian</h2>
          <form className="admin-form" onSubmit={handleCreateGuardian}>
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, firstName: event.target.value }))}
                  required
                  type="text"
                  value={newGuardianForm.firstName}
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, lastName: event.target.value }))}
                  required
                  type="text"
                  value={newGuardianForm.lastName}
                />
              </label>
              <label>
                <span>Email</span>
                <input
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, email: event.target.value }))}
                  type="email"
                  value={newGuardianForm.email}
                />
              </label>
              <label>
                <span>Phone number</span>
                <input
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                  required
                  type="text"
                  value={newGuardianForm.phoneNumber}
                />
              </label>
              <label>
                <span>JMBG</span>
                <input
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, jmbg: event.target.value }))}
                  required
                  type="text"
                  value={newGuardianForm.jmbg}
                />
              </label>
              <label>
                <span>Gender</span>
                <select
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, gender: event.target.value }))}
                  value={newGuardianForm.gender}
                >
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input
                  onChange={(event) => setNewGuardianForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                  required
                  type="date"
                  value={newGuardianForm.dateOfBirth}
                />
              </label>
            </div>

            <button className="primary-button" disabled={isCreatingGuardian} type="submit">
              {isCreatingGuardian ? 'Creating guardian...' : 'Create guardian'}
            </button>
          </form>
        </article>
      ) : null}

      {selectedGuardian ? (
        <article className="workspace-panel">
          <p className="eyebrow">Guardian maintenance</p>
          <h2>Edit selected guardian</h2>
          <form className="admin-form" onSubmit={handleSaveGuardian}>
            {isLoadingGuardianDetails ? <p>Loading guardian details...</p> : null}
            {!isLoadingGuardianDetails ? (
              <>
                <div className="form-grid">
                  <label>
                    <span>First name</span>
                    <input
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, firstName: event.target.value }))}
                      required
                      type="text"
                      value={guardianEditForm.firstName}
                    />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, lastName: event.target.value }))}
                      required
                      type="text"
                      value={guardianEditForm.lastName}
                    />
                  </label>
                  <label>
                    <span>Email</span>
                    <input
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, email: event.target.value }))}
                      type="email"
                      value={guardianEditForm.email}
                    />
                  </label>
                  <label>
                    <span>Phone number</span>
                    <input
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                      required
                      type="text"
                      value={guardianEditForm.phoneNumber}
                    />
                  </label>
                  <label>
                    <span>JMBG</span>
                    <input
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, jmbg: event.target.value }))}
                      required
                      type="text"
                      value={guardianEditForm.jmbg}
                    />
                  </label>
                  <label>
                    <span>Gender</span>
                    <select
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, gender: event.target.value }))}
                      value={guardianEditForm.gender}
                    >
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </label>
                  <label>
                    <span>Date of birth</span>
                    <input
                      onChange={(event) => setGuardianEditForm((current) => ({ ...current, dateOfBirth: event.target.value }))}
                      required
                      type="date"
                      value={guardianEditForm.dateOfBirth}
                    />
                  </label>
                </div>

                <div className="row-actions">
                  <button className="primary-button" disabled={isSavingGuardian} type="submit">
                    {isSavingGuardian ? 'Saving...' : 'Save guardian changes'}
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setSelectedGuardian(null);
                      setGuardianEditForm(initialGuardianEditForm);
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
    </div>
  );
}

export default SecretaryGuardiansPanel;