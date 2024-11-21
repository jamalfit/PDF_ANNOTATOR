import React, { useState } from 'react';
import './JsonAnnotationsView.css';

const JsonAnnotationsView = ({ rectangles, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: '50%', y: '50%' });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleDragStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDrag = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    setPosition({
      x: newX,
      y: newY
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Convert rectangles to a more readable JSON format
  const annotationsJson = rectangles.map(rect => ({
    label: rect.label,
    page: rect.pageNumber,
    coordinates: {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    },
    extractedText: rect.extractedText || 'No text available'
  }));

  return (
    <div className="json-view" style={{
      position: 'fixed',
      top: typeof position.y === 'number' ? `${position.y}px` : position.y,
      left: typeof position.x === 'number' ? `${position.x}px` : position.x,
      transform: 'none',
    }}>
      <div 
        className="json-header"
        onMouseDown={handleDragStart}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <h3>Annotations JSON</h3>
        <button 
          className="close-button" 
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="json-content">
        <pre>
          {JSON.stringify(annotationsJson, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default JsonAnnotationsView; 