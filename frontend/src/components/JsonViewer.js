const JsonViewer = ({ data, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content json-viewer">
        <div className="json-header">
          <h3>Annotation Data</h3>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
        <div className="json-content" style={{ textAlign: 'left' }}>
          <pre>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}; 