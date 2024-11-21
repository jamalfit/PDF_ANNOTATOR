import React, { useState } from 'react';
import AnnotationsList from './AnnotationsList';
import JsonAnnotationsView from './JsonAnnotationsView';

const PdfControls = ({
  currentPage,
  numPages,
  zoomLevel,
  selectedLabel,
  labels,
  onLabelChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPrevPage,
  onNextPage,
  rectangles,
  setCurrentPage,
  onDeleteAnnotation,
  onJumpToAnnotation,
}) => {
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showJsonView, setShowJsonView] = useState(false);

  return (
    <div className="pdf-controls">
      {/* Label Selector */}
      <div className="control-group">
        <label htmlFor="label-select">Select Label: </label>
        <select id="label-select" value={selectedLabel} onChange={onLabelChange}>
          {labels.map((label) => (
            <option key={label} value={label}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Zoom Controls */}
      <div className="control-group">
        <button onClick={onZoomOut}>-</button>
        <span className="zoom-level">{(zoomLevel * 100).toFixed(0)}%</span>
        <button onClick={onZoomIn}>+</button>
        <button onClick={onResetZoom} className="reset-button">
          Reset Zoom
        </button>
      </div>

      {/* Page Navigation */}
      <div className="control-group">
        <button onClick={onPrevPage} disabled={currentPage <= 1}>
          Previous Page
        </button>
        <span className="page-info">
          Page {currentPage} of {numPages}
        </span>
        <button onClick={onNextPage} disabled={currentPage >= numPages}>
          Next Page
        </button>
      </div>

      {/* Add this new control group */}
      <div className="control-group">
        <button 
          onClick={() => setShowAnnotations(true)}
          className="show-annotations-button"
        >
          Show All Annotations
        </button>
        <button 
          onClick={() => setShowJsonView(true)}
          className="show-json-button"
        >
          Show JSON View
        </button>
      </div>

      {/* Add the annotations list popup */}
      {showAnnotations && (
        <AnnotationsList
          rectangles={rectangles}
          onJumpToAnnotation={onJumpToAnnotation}
          onDeleteAnnotation={onDeleteAnnotation}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          onClose={() => setShowAnnotations(false)}
        />
      )}

      {/* New JsonAnnotationsView */}
      {showJsonView && (
        <JsonAnnotationsView
          rectangles={rectangles}
          onClose={() => setShowJsonView(false)}
        />
      )}
    </div>
  );
};

export default PdfControls; 