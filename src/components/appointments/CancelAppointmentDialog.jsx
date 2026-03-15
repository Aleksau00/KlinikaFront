function CancelAppointmentDialog({ reason, reasonError, isSubmitting, onReasonChange, onConfirm, onClose }) {
  return (
    <div className="dialog-overlay" role="presentation">
      <div aria-modal="true" className="dialog-card" role="dialog">
        <p className="eyebrow">Cancel appointment</p>
        <h3 className="dialog-title">Provide cancellation reason</h3>
        <p className="dialog-copy">This reason will be saved with the cancellation.</p>

        <label className="dialog-label">
          <span>Reason</span>
          <textarea
            onChange={(event) => onReasonChange(event.target.value)}
            placeholder="Enter cancellation reason"
            rows={3}
            value={reason}
          />
        </label>

        {reasonError ? <p className="error-banner">{reasonError}</p> : null}

        <div className="row-actions dialog-actions">
          <button className="ghost-button" disabled={isSubmitting} onClick={onClose} type="button">
            Close
          </button>
          <button className="danger-button" disabled={isSubmitting} onClick={onConfirm} type="button">
            {isSubmitting ? 'Cancelling...' : 'Confirm cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelAppointmentDialog;