import { useEffect, useState } from 'react';
import { createWorker, fetchClinics, fetchWorkers, setWorkerActive, updateWorker } from '../../lib/api';
import { initialWorkerForm, workerRoleOptions } from '../../config/roles';
import { playUiFeedbackSound } from '../../lib/ui-feedback';

function AdminStaffPanel({ session }) {
  const [workers, setWorkers] = useState([]);
  const [clinics, setClinics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formState, setFormState] = useState(initialWorkerForm);
  const [showForm, setShowForm] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [editFormState, setEditFormState] = useState({});
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setErrorMessage('');
      setIsLoading(true);

      try {
        const [workersResponse, clinicsResponse] = await Promise.all([
          fetchWorkers(session.token),
          fetchClinics(),
        ]);

        if (!ignore) {
          setWorkers(workersResponse);
          setClinics(clinicsResponse);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load staff data.');
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [session.token]);

  function updateField(field, value) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsSubmitting(true);

    const payload = {
      email: formState.email,
      firstName: formState.firstName,
      lastName: formState.lastName,
      phoneNumber: formState.phoneNumber,
      jmbg: formState.jmbg,
      gender: formState.gender,
      dateOfBirth: formState.dateOfBirth,
      clinicId: formState.clinicId ? Number(formState.clinicId) : null,
      temporaryPassword: formState.temporaryPassword,
      role: formState.role,
      seniorityLevel: formState.role === 'Administrator' ? formState.seniorityLevel : null,
      specialty: formState.role === 'Doctor' ? formState.specialty : null,
      licenseNumber: formState.role === 'Doctor' ? formState.licenseNumber : null,
      qualification: formState.role === 'Secretary' ? formState.qualification : null,
    };

    try {
      const response = await createWorker(session.token, payload);
      const freshWorkers = await fetchWorkers(session.token);

      setWorkers(freshWorkers);
      setFormState(initialWorkerForm);
      setStatusMessage(`Worker created successfully with id ${response.workerId}.`);
      playUiFeedbackSound('created');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create worker.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEditOpen(worker) {
    setEditingWorker(worker);
    setEditFormState({
      firstName: worker.firstName || '',
      lastName: worker.lastName || '',
      email: worker.email || '',
      phoneNumber: worker.phoneNumber || '',
      jmbg: worker.jmbg || '',
      gender: worker.gender || 'F',
      dateOfBirth: worker.dateOfBirth ? worker.dateOfBirth.split('T')[0] : '',
      role: worker.role || 'Secretary',
      clinicId: worker.clinicId ? String(worker.clinicId) : '',
      seniorityLevel: worker.seniorityLevel || '',
      specialty: worker.specialty || '',
      licenseNumber: worker.licenseNumber || '',
      qualification: worker.qualification || '',
      newPassword: '',
    });
    setShowForm(false);
    setStatusMessage('');
    setErrorMessage('');
  }

  function updateEditField(field, value) {
    setEditFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setStatusMessage('');
    setErrorMessage('');
    setIsEditSubmitting(true);

    const payload = {
      email: editFormState.email,
      firstName: editFormState.firstName,
      lastName: editFormState.lastName,
      phoneNumber: editFormState.phoneNumber,
      jmbg: editFormState.jmbg,
      gender: editFormState.gender,
      dateOfBirth: editFormState.dateOfBirth,
      clinicId: editFormState.clinicId ? Number(editFormState.clinicId) : null,
      role: editingWorker.role,
      seniorityLevel: editingWorker.role === 'Administrator' ? editFormState.seniorityLevel : null,
      specialty: editingWorker.role === 'Doctor' ? editFormState.specialty : null,
      licenseNumber: editingWorker.role === 'Doctor' ? editFormState.licenseNumber : null,
      qualification: editingWorker.role === 'Secretary' ? editFormState.qualification : null,
    };

    if (editFormState.newPassword) {
      payload.newPassword = editFormState.newPassword;
    }

    try {
      await updateWorker(session.token, editingWorker.id, payload);
      const freshWorkers = await fetchWorkers(session.token);
      setWorkers(freshWorkers);
      setEditingWorker(null);
      setStatusMessage(`Worker #${editingWorker.id} updated successfully.`);
      playUiFeedbackSound('edited');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update worker.');
    } finally {
      setIsEditSubmitting(false);
    }
  }

  async function handleDeleteConfirm(workerId) {
    const target = workers.find((w) => w.id === workerId);
    const nextActive = target ? !target.isActive : false;
    setIsDeleting(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      await setWorkerActive(session.token, workerId, nextActive);
      const freshWorkers = await fetchWorkers(session.token);
      setWorkers(freshWorkers);
      setConfirmDeleteId(null);
      setStatusMessage(`Worker #${workerId} ${nextActive ? 'activated' : 'deactivated'} successfully.`);
      playUiFeedbackSound(nextActive ? 'edited' : 'deleted');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to update worker status.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-admin">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Staff module</p>
            <h2>Worker directory and provisioning</h2>
          </div>
          <div className="panel-heading-actions">
            <span className="status-chip">{workers.length} workers</span>
            <button className="ghost-button" onClick={() => setShowForm((current) => !current)} type="button">
              {showForm ? 'Cancel' : 'Add worker'}
            </button>
          </div>
        </div>
        <p>This admin module is connected to the live backend worker list and create-worker endpoint.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      {showForm ? (
        <article className="workspace-panel secretary-card-regular">
          <p className="eyebrow">Create worker</p>
          <h2>Provision a new account</h2>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input onChange={(event) => updateField('firstName', event.target.value)} required type="text" value={formState.firstName} />
              </label>
              <label>
                <span>Last name</span>
                <input onChange={(event) => updateField('lastName', event.target.value)} required type="text" value={formState.lastName} />
              </label>
              <label>
                <span>Email</span>
                <input onChange={(event) => updateField('email', event.target.value)} required type="email" value={formState.email} />
              </label>
              <label>
                <span>Phone number</span>
                <input onChange={(event) => updateField('phoneNumber', event.target.value)} required type="text" value={formState.phoneNumber} />
              </label>
              <label>
                <span>JMBG</span>
                <input onChange={(event) => updateField('jmbg', event.target.value)} required type="text" value={formState.jmbg} />
              </label>
              <label>
                <span>Gender</span>
                <select onChange={(event) => updateField('gender', event.target.value)} value={formState.gender}>
                  <option value="F">F</option>
                  <option value="M">M</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input onChange={(event) => updateField('dateOfBirth', event.target.value)} required type="date" value={formState.dateOfBirth} />
              </label>
              <label>
                <span>Temporary password</span>
                <input onChange={(event) => updateField('temporaryPassword', event.target.value)} required type="text" value={formState.temporaryPassword} />
              </label>
              <label>
                <span>Role</span>
                <select onChange={(event) => updateField('role', event.target.value)} value={formState.role}>
                  {workerRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Clinic</span>
                <select onChange={(event) => updateField('clinicId', event.target.value)} value={formState.clinicId}>
                  <option value="">No clinic assignment</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formState.role === 'Administrator' ? (
              <label>
                <span>Seniority level</span>
                <input onChange={(event) => updateField('seniorityLevel', event.target.value)} type="text" value={formState.seniorityLevel} />
              </label>
            ) : null}

            {formState.role === 'Doctor' ? (
              <div className="form-grid">
                <label>
                  <span>Specialty</span>
                  <input onChange={(event) => updateField('specialty', event.target.value)} type="text" value={formState.specialty} />
                </label>
                <label>
                  <span>License number</span>
                  <input onChange={(event) => updateField('licenseNumber', event.target.value)} type="text" value={formState.licenseNumber} />
                </label>
              </div>
            ) : null}

            {formState.role === 'Secretary' ? (
              <label>
                <span>Qualification</span>
                <input onChange={(event) => updateField('qualification', event.target.value)} type="text" value={formState.qualification} />
              </label>
            ) : null}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? 'Creating worker...' : 'Create worker'}
            </button>
          </form>
        </article>
      ) : null}

      {editingWorker ? (
        <article className="workspace-panel secretary-card-wide">
          <div className="panel-heading-row">
            <div>
              <p className="eyebrow">Edit worker</p>
              <h2>Update {editingWorker.firstName} {editingWorker.lastName}</h2>
            </div>
            <button className="ghost-button" onClick={() => setEditingWorker(null)} type="button">
              Cancel
            </button>
          </div>
          <form className="admin-form" onSubmit={handleEditSubmit}>
            <div className="form-grid">
              <label>
                <span>First name</span>
                <input onChange={(event) => updateEditField('firstName', event.target.value)} required type="text" value={editFormState.firstName} />
              </label>
              <label>
                <span>Last name</span>
                <input onChange={(event) => updateEditField('lastName', event.target.value)} required type="text" value={editFormState.lastName} />
              </label>
              <label>
                <span>Email</span>
                <input onChange={(event) => updateEditField('email', event.target.value)} required type="email" value={editFormState.email} />
              </label>
              <label>
                <span>Phone number</span>
                <input onChange={(event) => updateEditField('phoneNumber', event.target.value)} required type="text" value={editFormState.phoneNumber} />
              </label>
              <label>
                <span>JMBG</span>
                <input onChange={(event) => updateEditField('jmbg', event.target.value)} required type="text" value={editFormState.jmbg} />
              </label>
              <label>
                <span>Gender</span>
                <select onChange={(event) => updateEditField('gender', event.target.value)} value={editFormState.gender}>
                  <option value="F">F</option>
                  <option value="M">M</option>
                </select>
              </label>
              <label>
                <span>Date of birth</span>
                <input onChange={(event) => updateEditField('dateOfBirth', event.target.value)} required type="date" value={editFormState.dateOfBirth} />
              </label>
              <label>
                <span>New password</span>
                <input onChange={(event) => updateEditField('newPassword', event.target.value)} placeholder="Leave blank to keep unchanged" type="password" value={editFormState.newPassword} />
              </label>
              <label>
                <span>Role</span>
                <input disabled readOnly type="text" value={editingWorker.role} />
              </label>
              <label>
                <span>Clinic</span>
                <select onChange={(event) => updateEditField('clinicId', event.target.value)} value={editFormState.clinicId}>
                  <option value="">No clinic assignment</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {editFormState.role === 'Administrator' ? (
              <label>
                <span>Seniority level</span>
                <input onChange={(event) => updateEditField('seniorityLevel', event.target.value)} type="text" value={editFormState.seniorityLevel} />
              </label>
            ) : null}

            {editFormState.role === 'Doctor' ? (
              <div className="form-grid">
                <label>
                  <span>Specialty</span>
                  <input onChange={(event) => updateEditField('specialty', event.target.value)} type="text" value={editFormState.specialty} />
                </label>
                <label>
                  <span>License number</span>
                  <input onChange={(event) => updateEditField('licenseNumber', event.target.value)} type="text" value={editFormState.licenseNumber} />
                </label>
              </div>
            ) : null}

            {editFormState.role === 'Secretary' ? (
              <label>
                <span>Qualification</span>
                <input onChange={(event) => updateEditField('qualification', event.target.value)} type="text" value={editFormState.qualification} />
              </label>
            ) : null}

            <button className="primary-button" disabled={isEditSubmitting} type="submit">
              {isEditSubmitting ? 'Updating worker...' : 'Update worker'}
            </button>
          </form>
        </article>
      ) : null}

      <article className="workspace-panel">
        <p className="eyebrow">Directory</p>
        <h2>Existing workers</h2>
        {isLoading ? <p>Loading worker directory...</p> : null}
        {!isLoading ? (
          <div className="data-list data-list-scroll">
            {workers.map((worker) => (
              <article className={`data-row data-row-editable${worker.isActive ? '' : ' data-row-inactive'}`} key={worker.id}>
                <div>
                  <strong>{worker.firstName} {worker.lastName}</strong>
                  <p>{worker.email}</p>
                </div>
                <div className="data-meta">
                  <span>{worker.role}</span>
                  <small>{worker.clinicName || 'No clinic'}</small>
                  <small>{worker.isActive ? 'Active' : 'Inactive'}</small>
                </div>
                {confirmDeleteId === worker.id ? (
                  <div className="row-actions">
                    <span className="delete-confirm-label">{worker.isActive ? 'Deactivate?' : 'Activate?'}</span>
                    <button className={worker.isActive ? 'danger-button' : 'primary-button'} disabled={isDeleting} onClick={() => handleDeleteConfirm(worker.id)} type="button">
                      {isDeleting ? '...' : 'Confirm'}
                    </button>
                    <button className="ghost-button" disabled={isDeleting} onClick={() => setConfirmDeleteId(null)} type="button">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="row-actions">
                    <button className="ghost-button" onClick={() => handleEditOpen(worker)} type="button">
                      Edit
                    </button>
                    <button
                      className={worker.isActive ? 'danger-button-outline' : 'ghost-button'}
                      onClick={() => setConfirmDeleteId(worker.id)}
                      type="button"
                    >
                      {worker.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : null}
      </article>
    </div>
  );
}

export default AdminStaffPanel;