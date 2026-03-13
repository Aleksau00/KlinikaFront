import { useEffect, useState } from 'react';
import { fetchClinics } from '../../lib/api';

function AdminClinicsPanel() {
  const [clinics, setClinics] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadClinics() {
      setErrorMessage('');
      setIsLoading(true);

      try {
        const response = await fetchClinics();
        if (!ignore) {
          setClinics(response);
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

    loadClinics();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-admin">
        <p className="eyebrow">Clinics module</p>
        <h2>Clinic directory snapshot</h2>
        <p>This panel reads the backend clinic directory so the administrator shell can reference the current clinic structure.</p>
      </article>

      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      <article className="workspace-panel">
        <p className="eyebrow">Clinics</p>
        <h2>Available clinics</h2>
        {isLoading ? <p>Loading clinics...</p> : null}
        {!isLoading ? (
          <div className="data-list">
            {clinics.map((clinic) => (
              <article className="data-row" key={clinic.id}>
                <div>
                  <strong>{clinic.name}</strong>
                  <p>{clinic.email}</p>
                </div>
                <div className="data-meta">
                  <span>{clinic.phoneNumber}</span>
                  <small>{clinic.address?.streetName} {clinic.address?.streetNumber}</small>
                  <small>{clinic.address?.city?.name || clinic.address?.cityName || 'Clinic address available in backend data'}</small>
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