import { useEffect, useState } from 'react';
import {
  createClinic,
  deleteClinic,
  fetchCities,
  fetchClinics,
  updateClinic,
} from '../../lib/api';

const INITIAL_CREATE_FORM = {
  name: '',
  phoneNumber: '',
  email: '',
  cityId: '',
  streetName: '',
  streetNumber: '',
  apartmentNumber: '',
  additionalInfo: '',
};

function AdminClinicsPanel({ session }) {
  const [clinics, setClinics] = useState([]);
  const [cities, setCities] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);

  const [editingClinicId, setEditingClinicId] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phoneNumber: '',
    email: '',
    addressId: '',
    isActive: true,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionClinicId, setActionClinicId] = useState(null);

  async function loadClinics() {
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetchClinics();
      setClinics(response);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load clinics.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setErrorMessage('');
      setIsLoading(true);

      try {
        const [clinicResponse, cityResponse] = await Promise.all([
          fetchClinics(),
          fetchCities(),
        ]);

        if (!ignore) {
          setClinics(clinicResponse);
          setCities(cityResponse);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load clinics.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  function updateCreateField(field, value) {
    setCreateForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleCreateClinic(event) {
    event.preventDefault();

    if (!session?.token) {
      setErrorMessage('Administrator session is required.');
      return;
    }

    setIsCreating(true);
    setErrorMessage('');
    setStatusMessage('');

    const payload = {
      name: createForm.name,
      phoneNumber: createForm.phoneNumber,
      email: createForm.email,
      addressId: null,
      newAddress: {
        streetName: createForm.streetName,
        streetNumber: createForm.streetNumber,
        cityId: Number(createForm.cityId),
        apartmentNumber: createForm.apartmentNumber || null,
        additionalInfo: createForm.additionalInfo || null,
      },
    };

    try {
      await createClinic(session.token, payload);
      setStatusMessage('Clinic created successfully.');
      setCreateForm(INITIAL_CREATE_FORM);
      await loadClinics();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create clinic.');
    } finally {
      setIsCreating(false);
    }
  }

  function startEditingClinic(clinic) {
    setEditingClinicId(clinic.id);
    setEditForm({
      name: clinic.name || '',
      phoneNumber: clinic.phoneNumber || '',
      email: clinic.email || '',
      addressId: clinic.address?.id ? String(clinic.address.id) : '',
      isActive: Boolean(clinic.isActive),
    });
    setErrorMessage('');
    setStatusMessage('');
  }

  async function handleSaveClinic(clinicId) {
    if (!session?.token) {
      setErrorMessage('Administrator session is required.');
      return;
    }

    setIsSavingEdit(true);
    setErrorMessage('');
    setStatusMessage('');

    const payload = {
      name: editForm.name,
      addressId: Number(editForm.addressId),
      phoneNumber: editForm.phoneNumber,
      email: editForm.email,
      isActive: editForm.isActive,
    };

    try {
      await updateClinic(session.token, clinicId, payload);
      setStatusMessage('Clinic updated successfully.');
      setEditingClinicId(null);
      await loadClinics();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update clinic.');
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDeleteClinic(clinicId) {
    if (!session?.token) {
      setErrorMessage('Administrator session is required.');
      return;
    }

    if (!window.confirm('Delete this clinic? This cannot be undone.')) {
      return;
    }

    setActionClinicId(clinicId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await deleteClinic(session.token, clinicId);
      setStatusMessage('Clinic deleted successfully.');
      await loadClinics();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete clinic.');
    } finally {
      setActionClinicId(null);
    }
  }

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-admin">
        <p className="eyebrow">Clinics module</p>
        <h2>Clinic directory management</h2>
        <p>Create, update, activate/deactivate, and remove clinic records used across staffing and scheduling workflows.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <p className="eyebrow">Create clinic</p>
        <h2>Add new clinic</h2>
        <form className="admin-form" onSubmit={handleCreateClinic}>
          <div className="form-grid">
            <label>
              <span>Clinic name</span>
              <input
                onChange={(event) => updateCreateField('name', event.target.value)}
                required
                type="text"
                value={createForm.name}
              />
            </label>
            <label>
              <span>Phone number</span>
              <input
                onChange={(event) => updateCreateField('phoneNumber', event.target.value)}
                required
                type="text"
                value={createForm.phoneNumber}
              />
            </label>
            <label>
              <span>Email</span>
              <input
                onChange={(event) => updateCreateField('email', event.target.value)}
                required
                type="email"
                value={createForm.email}
              />
            </label>
            <label>
              <span>City</span>
              <select
                onChange={(event) => updateCreateField('cityId', event.target.value)}
                required
                value={createForm.cityId}
              >
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{city.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Street name</span>
              <input
                onChange={(event) => updateCreateField('streetName', event.target.value)}
                required
                type="text"
                value={createForm.streetName}
              />
            </label>
            <label>
              <span>Street number</span>
              <input
                onChange={(event) => updateCreateField('streetNumber', event.target.value)}
                required
                type="text"
                value={createForm.streetNumber}
              />
            </label>
            <label>
              <span>Apartment number</span>
              <input
                onChange={(event) => updateCreateField('apartmentNumber', event.target.value)}
                type="text"
                value={createForm.apartmentNumber}
              />
            </label>
            <label>
              <span>Additional info</span>
              <input
                onChange={(event) => updateCreateField('additionalInfo', event.target.value)}
                type="text"
                value={createForm.additionalInfo}
              />
            </label>
          </div>
          <button className="primary-button" disabled={isCreating} type="submit">
            {isCreating ? 'Creating...' : 'Create clinic'}
          </button>
        </form>
      </article>

      <article className="workspace-panel">
        <p className="eyebrow">Clinics</p>
        <h2>Available clinics</h2>
        {isLoading ? <p>Loading clinics...</p> : null}
        {!isLoading ? (
          <div className="data-list">
            {clinics.map((clinic) => (
              <article className="data-row" key={clinic.id}>
                <div>
                  {editingClinicId === clinic.id ? (
                    <>
                      <input
                        onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                        style={{ marginBottom: '0.4rem', width: '100%' }}
                        type="text"
                        value={editForm.name}
                      />
                      <input
                        onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                        style={{ width: '100%' }}
                        type="email"
                        value={editForm.email}
                      />
                    </>
                  ) : (
                    <>
                      <strong>{clinic.name}</strong>
                      <p>{clinic.email}</p>
                    </>
                  )}
                </div>
                <div className="data-meta">
                  {editingClinicId === clinic.id ? (
                    <>
                      <input
                        onChange={(event) => setEditForm((current) => ({ ...current, phoneNumber: event.target.value }))}
                        style={{ marginBottom: '0.4rem' }}
                        type="text"
                        value={editForm.phoneNumber}
                      />
                      <label className="checkbox-inline-toggle" style={{ margin: 0 }}>
                        <input
                          checked={editForm.isActive}
                          onChange={(event) => setEditForm((current) => ({ ...current, isActive: event.target.checked }))}
                          type="checkbox"
                        />
                        <span>
                          <strong>Active clinic</strong>
                        </span>
                      </label>
                      <small>Address is fixed during edit (Address ID {editForm.addressId || clinic.address?.id || 'N/A'}).</small>
                    </>
                  ) : (
                    <>
                      <span>{clinic.phoneNumber}</span>
                      <small>{clinic.address?.streetName} {clinic.address?.streetNumber}</small>
                      <small>{clinic.address?.city?.name || clinic.address?.cityName || 'Clinic address available in backend data'}</small>
                      <small>{clinic.isActive ? 'Status: Active' : 'Status: Inactive'}</small>
                    </>
                  )}
                </div>
                <div className="row-actions">
                  {editingClinicId === clinic.id ? (
                    <>
                      <button
                        className="primary-button"
                        disabled={isSavingEdit}
                        onClick={() => handleSaveClinic(clinic.id)}
                        type="button"
                      >
                        {isSavingEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className="ghost-button"
                        onClick={() => setEditingClinicId(null)}
                        type="button"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="ghost-button"
                        onClick={() => startEditingClinic(clinic)}
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        className="danger-button-outline"
                        disabled={actionClinicId === clinic.id}
                        onClick={() => handleDeleteClinic(clinic.id)}
                        type="button"
                      >
                        {actionClinicId === clinic.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default AdminClinicsPanel;