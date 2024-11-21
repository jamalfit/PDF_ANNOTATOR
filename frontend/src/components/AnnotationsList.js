import React, { useState } from 'react';
import './AnnotationsList.css';

const AnnotationsList = ({ 
  rectangles, 
  onJumpToAnnotation, 
  onDeleteAnnotation, 
  currentPage,
  setCurrentPage,
  onClose
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: '50%', y: '50%' });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const truncateText = (text, maxLength = 20) => {
    if (!text) return 'No text available';
    const cleanText = text.replace(/\s+/g, ' ').trim();
    return cleanText.length > maxLength 
      ? `${cleanText.substring(0, maxLength)}...` 
      : cleanText;
  };

  const handleJumpTo = (rect) => {
    if (rect.pageNumber !== currentPage) {
      setCurrentPage(rect.pageNumber);
    }
    onJumpToAnnotation(rect);
  };

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

  return (
    <div className="annotations-list" style={{
      position: 'fixed',
      top: typeof position.y === 'number' ? `${position.y}px` : position.y,
      left: typeof position.x === 'number' ? `${position.x}px` : position.x,
      transform: 'none',
    }}>
      <div 
        className="annotations-header"
        onMouseDown={handleDragStart}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        <h3>Annotations ({rectangles.length})</h3>
        <button 
          className="close-button" 
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="annotations-container">
        {rectangles.length === 0 ? (
          <div className="no-annotations">No annotations yet</div>
        ) : (
          rectangles.map((rect, index) => (
            <div key={index} className="annotation-item">
              <div className="annotation-header">
                <span className="annotation-label">{rect.label}</span>
                <span className="annotation-page">Page {rect.pageNumber}</span>
              </div>
              <div className="annotation-text" title={rect.extractedText}>
                {truncateText(rect.extractedText)}
              </div>
              <div className="annotation-coords">
                x: {rect.x.toFixed(0)}, y: {rect.y.toFixed(0)}, 
                w: {rect.width.toFixed(0)}, h: {rect.height.toFixed(0)}
              </div>
              <div className="annotation-actions">
                <button 
                  onClick={() => handleJumpTo(rect)}
                  className="jump-button"
                >
                  Jump to
                </button>
                <button 
                  onClick={() => onDeleteAnnotation(index)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AnnotationsList; 