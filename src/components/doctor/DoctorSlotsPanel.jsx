import { useEffect, useState } from 'react';
import {
  createCustomSlots,
  createSlot,
  createWeeklySlots,
  deleteSlot,
  fetchMySlots,
  markSlotUnavailable,
} from '../../lib/api';
import { formatDateForInput } from '../../lib/appointments';
import { playUiFeedbackSound } from '../../lib/ui-feedback';

function toTimeValue(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
}

function getRoundedCurrentStartTime() {
  const now = new Date();
  const rounded = new Date(now);

  rounded.setSeconds(0, 0);
  rounded.setMinutes(Math.ceil(now.getMinutes() / 15) * 15);

  return toTimeValue(rounded);
}

function getDefaultCustomEndTime(startTimeValue) {
  const [hours, minutes] = startTimeValue.split(':').map(Number);
  const endDate = new Date();

  endDate.setHours(hours, minutes, 0, 0);
  endDate.setHours(endDate.getHours() + 8);

  return toTimeValue(endDate);
}

function DoctorSlotsPanel({ session }) {
  const today = formatDateForInput(new Date());
  const initialStartTime = getRoundedCurrentStartTime();
  const [fromDate, setFromDate] = useState(formatDateForInput(new Date()));
  const [toDate, setToDate] = useState(formatDateForInput(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
  const [slots, setSlots] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [slotVersion, setSlotVersion] = useState(0);

  const [singleDate, setSingleDate] = useState(formatDateForInput(new Date()));
  const [singleStartTime, setSingleStartTime] = useState(initialStartTime);
  const [isCreatingSingle, setIsCreatingSingle] = useState(false);

  const [isCreatingWeekly, setIsCreatingWeekly] = useState(false);

  const [customStartTime, setCustomStartTime] = useState(initialStartTime);
  const [customEndTime, setCustomEndTime] = useState(getDefaultCustomEndTime(initialStartTime));
  const [customFromDate, setCustomFromDate] = useState(today);
  const [customDaysAhead, setCustomDaysAhead] = useState('7');
  const [customSkipWeekends, setCustomSkipWeekends] = useState(false);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  const [actionSlotId, setActionSlotId] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (fromDate < today) {
      setFromDate(today);
    }

    if (toDate < today) {
      setToDate(today);
    }

    if (singleDate < today) {
      setSingleDate(today);
    }

    if (customFromDate < today) {
      setCustomFromDate(today);
    }
  }, [fromDate, toDate, singleDate, customFromDate, today]);

  useEffect(() => {
    let ignore = false;

    async function load() {
      setIsLoadingSlots(true);
      setErrorMessage('');

      try {
        const data = await fetchMySlots(session.token, fromDate, toDate);

        if (!ignore) {
          setSlots(data);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load slots.');
        }
      } finally {
        if (!ignore) {
          setIsLoadingSlots(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, [session.token, fromDate, toDate, slotVersion]);

  function refreshSlots() {
    setSlotVersion((v) => v + 1);
  }

  async function handleCreateSingle(event) {
    event.preventDefault();
    setIsCreatingSingle(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await createSlot(session.token, singleDate, singleStartTime);
      setStatusMessage(`Slot created for ${singleDate} at ${singleStartTime}.`);
      playUiFeedbackSound('created');
      refreshSlots();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create slot.');
    } finally {
      setIsCreatingSingle(false);
    }
  }

  async function handleCreateWeekly() {
    setIsCreatingWeekly(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const result = await createWeeklySlots(session.token);
      setStatusMessage(result?.Message || 'Weekly slots created.');
      playUiFeedbackSound('created');
      refreshSlots();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create weekly slots.');
    } finally {
      setIsCreatingWeekly(false);
    }
  }

  async function handleCreateCustom(event) {
    event.preventDefault();
    setIsCreatingCustom(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const daysAhead = Number(customDaysAhead);
      const generatedDates = [];
      const startDate = new Date(`${customFromDate}T00:00:00`);

      for (let i = 0; i < daysAhead; i += 1) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        if (customSkipWeekends) {
          const day = date.getDay();

          if (day === 0 || day === 6) {
            continue;
          }
        }

        generatedDates.push(formatDateForInput(date));
      }

      if (generatedDates.length === 0) {
        throw new Error('No valid dates in selected range. Adjust start date/days or disable weekend skipping.');
      }

      const payload = {
        dates: generatedDates,
        startTime: customStartTime,
        endTime: customEndTime,
        daysAhead,
        skipWeekends: customSkipWeekends,
      };
      const result = await createCustomSlots(session.token, payload);
      setStatusMessage(result?.Message || 'Custom slots created.');
      playUiFeedbackSound('created');
      refreshSlots();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create custom slots.');
    } finally {
      setIsCreatingCustom(false);
    }
  }

  async function handleMarkUnavailable(slotId) {
    setActionSlotId(slotId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await markSlotUnavailable(session.token, slotId);
      setStatusMessage('Slot marked as unavailable.');
      playUiFeedbackSound('select');
      refreshSlots();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to mark slot unavailable.');
    } finally {
      setActionSlotId(null);
    }
  }

  async function handleDeleteSlot(slotId) {
    setActionSlotId(slotId);
    setErrorMessage('');
    setStatusMessage('');

    try {
      await deleteSlot(session.token, slotId);
      setStatusMessage('Slot deleted.');
      playUiFeedbackSound('select');
      refreshSlots();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to delete slot.');
    } finally {
      setActionSlotId(null);
    }
  }

  const slotsByDate = slots.reduce((acc, slot) => {
    const key = slot.date;

    if (!acc[key]) {
      acc[key] = [];
    }

    acc[key].push(slot);

    return acc;
  }, {});

  const availableCount = slots.filter((s) => s.isAvailable).length;
  const unavailableCount = slots.length - availableCount;

  return (
    <div className="portal-stack">
      <article className="workspace-panel theme-doctor">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">My schedule</p>
            <h2>Slot management</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <span className="status-chip">{availableCount} available</span>
            {unavailableCount > 0 ? (
              <span className="status-chip status-chip-muted">{unavailableCount} unavailable</span>
            ) : null}
          </div>
        </div>
        <p>Create, view, and manage your appointment slots. Patients are booked into available slots by secretaries.</p>
      </article>

      {statusMessage ? <p className="info-banner">{statusMessage}</p> : null}
      {errorMessage ? <p className="error-banner wide-banner">{errorMessage}</p> : null}

      {/* Slots list — fixed height so it doesn't stretch the page */}
      <article className="workspace-panel">
        <p className="eyebrow">Date range</p>
        <h2>My slots</h2>

        <div className="admin-form">
          <div className="form-grid">
            <label>
              <span>From date</span>
              <input
                min={today}
                onChange={(e) => setFromDate(e.target.value < today ? today : e.target.value)}
                type="date"
                value={fromDate}
              />
            </label>
            <label>
              <span>To date</span>
              <input
                min={fromDate < today ? today : fromDate}
                onChange={(e) => setToDate(e.target.value < today ? today : e.target.value)}
                type="date"
                value={toDate}
              />
            </label>
          </div>
        </div>

        {isLoadingSlots ? <p>Loading slots…</p> : null}

        {!isLoadingSlots && slots.length === 0 ? (
          <p className="muted-hint">No slots found in the selected date range. Use the panels below to generate slots.</p>
        ) : null}

        {!isLoadingSlots && slots.length > 0 ? (
          <div style={{ maxHeight: '340px', overflowY: 'auto', marginTop: '0.75rem' }}>
            {Object.entries(slotsByDate).map(([date, dateSlots]) => (
              <div key={date} style={{ marginBottom: '0.75rem' }}>
                <p className="eyebrow" style={{ marginBottom: '0.25rem' }}>{date}</p>
                <div className="data-list">
                  {dateSlots.map((slot) => (
                    <article className="data-row" key={slot.id}>
                      <div>
                        <strong>{String(slot.startTime).slice(0, 5)} – {String(slot.endTime).slice(0, 5)}</strong>
                        <p>
                          <span className={slot.isAvailable ? 'status-chip' : 'status-chip status-chip-muted'}>
                            {slot.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </p>
                      </div>
                      <div className="row-actions">
                        {slot.isAvailable ? (
                          <button
                            className="ghost-button"
                            disabled={actionSlotId === slot.id}
                            onClick={() => handleMarkUnavailable(slot.id)}
                            type="button"
                          >
                            Mark unavailable
                          </button>
                        ) : null}
                        <button
                          className="danger-button-outline"
                          disabled={actionSlotId === slot.id}
                          onClick={() => handleDeleteSlot(slot.id)}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </article>

      {/* Single slot + Custom range — side by side */}
      <div className="doctor-actions-grid compact-grid">
        <article className="workspace-panel">
          <p className="eyebrow">Single slot</p>
          <h2>Create one slot</h2>
          <form className="admin-form" onSubmit={handleCreateSingle}>
            <div className="form-grid">
              <label>
                <span>Date</span>
                <input
                  min={today}
                  onChange={(e) => setSingleDate(e.target.value < today ? today : e.target.value)}
                  required
                  type="date"
                  value={singleDate}
                />
              </label>
              <label>
                <span>Start time</span>
                <input
                  onChange={(e) => setSingleStartTime(e.target.value)}
                  required
                  step="900"
                  type="time"
                  value={singleStartTime}
                />
              </label>
            </div>
            <button className="primary-button" disabled={isCreatingSingle} type="submit">
              {isCreatingSingle ? 'Creating…' : 'Create slot'}
            </button>
          </form>
        </article>

        <article className="workspace-panel">
          <p className="eyebrow">Custom batch</p>
          <h2>Custom range</h2>
          <form className="admin-form" onSubmit={handleCreateCustom}>
            <div className="form-grid">
              <label>
                <span>Start date</span>
                <input
                  min={today}
                  onChange={(e) => setCustomFromDate(e.target.value < today ? today : e.target.value)}
                  required
                  type="date"
                  value={customFromDate}
                />
              </label>
              <label>
                <span>Work start</span>
                <input onChange={(e) => setCustomStartTime(e.target.value)} required step="900" type="time" value={customStartTime} />
              </label>
              <label>
                <span>Work end</span>
                <input onChange={(e) => setCustomEndTime(e.target.value)} required step="900" type="time" value={customEndTime} />
              </label>
              <label>
                <span>Days ahead</span>
                <input max="30" min="1" onChange={(e) => setCustomDaysAhead(e.target.value)} required type="number" value={customDaysAhead} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  checked={customSkipWeekends}
                  onChange={(e) => setCustomSkipWeekends(e.target.checked)}
                  type="checkbox"
                />
                <span>Skip weekends</span>
              </label>
            </div>
            <button className="primary-button" disabled={isCreatingCustom} type="submit">
              {isCreatingCustom ? 'Generating…' : 'Generate custom slots'}
            </button>
          </form>
        </article>
      </div>

      {/* Weekly batch — full width */}
      <article className="workspace-panel">
        <div className="panel-heading-row">
          <div>
            <p className="eyebrow">Weekly batch</p>
            <h2>Next 7 days</h2>
            <p>Generates slots at 8, 9, 10, 11, 14, 15 and 16:00 for the next 7 days based on your doctor account defaults.</p>
          </div>
          <button
            className="primary-button"
            disabled={isCreatingWeekly}
            onClick={handleCreateWeekly}
            style={{ alignSelf: 'center', flexShrink: 0 }}
            type="button"
          >
            {isCreatingWeekly ? 'Generating…' : 'Generate weekly slots'}
          </button>
        </div>
      </article>
    </div>
  );
}

export default DoctorSlotsPanel;
