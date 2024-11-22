import React, { useState, useRef, useEffect } from 'react';
import './ContextMenuPdfViewer.css';

const RectangleAnnotations = ({
  scale,
  currentPage,
  pageDimensions,
  labels,
  selectedLabel,
  rectangles,
  onAnnotationsChange,
  getLabelColor,
}) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [selectedRectIndex, setSelectedRectIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState(null);
  const svgRef = useRef(null);

  // Context Menu Component
  const ContextMenu = ({ x, y, rectIndex, onClose, rectangles, labels, onAnnotationsChange, getLabelColor }) => {
    const rect = rectangles[rectIndex];
    const [showJson, setShowJson] = useState(false);
    // Initialize menu position in center of view
    const [menuPosition, setMenuPosition] = useState({ 
      x: Math.min(window.innerWidth / 2 - 100, x), // Center, but respect click position
      y: Math.min(window.innerHeight / 2 - 100, y)
    });
    
    // Add drag functionality for menu
    const handleMenuMouseDown = (e) => {
      const startX = e.clientX - menuPosition.x;
      const startY = e.clientY - menuPosition.y;
      
      const handleMouseMove = (e) => {
        setMenuPosition({
          x: e.clientX - startX,
          y: e.clientY - startY
        });
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleDelete = () => {
      const newRectangles = rectangles.filter((_, index) => index !== rectIndex);
      onAnnotationsChange(newRectangles);
      onClose();
    };

    const handleLabelChange = (e) => {
      const newLabel = e.target.value;
      const updatedRectangles = rectangles.map((r, index) => 
        index === rectIndex ? { 
          ...r, 
          label: newLabel,
          color: getLabelColor(newLabel)
        } : r
      );
      onAnnotationsChange(updatedRectangles);
    };

    return (
      <>
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: menuPosition.x,
            zIndex: 1000,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            minWidth: '150px',
            padding: '8px 0'
          }}
        >
          {/* Draggable header */}
          <div 
            className="menu-header"
            onMouseDown={handleMenuMouseDown}
            style={{
              padding: '8px 12px',
              background: '#f0f0f0',
              borderBottom: '1px solid #ccc',
              cursor: 'move',
              userSelect: 'none',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <span>⋮⋮ Menu</span>
            <button 
              onClick={onClose}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Menu items */}
          <div 
            className="menu-item" 
            onClick={() => setShowJson(true)}
            style={{ cursor: 'pointer', padding: '8px 12px' }}
          >
            View Text
          </div>
          <div className="menu-item" style={{ padding: '8px 12px' }}>
            <select 
              value={rect.label}
              onChange={handleLabelChange}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '4px'
              }}
            >
              {labels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
          <div 
            className="menu-item delete"
            onClick={handleDelete}
            style={{
              color: '#dc3545',
              cursor: 'pointer',
              padding: '8px 12px'
            }}
          >
            Delete Rectangle
          </div>
        </div>

        {/* Text content modal */}
        {showJson && (
          <div 
            className="text-modal-overlay"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 1001
            }}
            onClick={() => setShowJson(false)}
          >
            <div 
              className="text-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'white',
                padding: '20px',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                minWidth: '300px',
                maxWidth: '500px',
                maxHeight: '80vh',
                overflow: 'auto'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ margin: 0 }}>Rectangle Text Content</h3>
                <button 
                  onClick={() => setShowJson(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: '20px'
                  }}
                >
                  ✕
                </button>
              </div>
              <div style={{ wordBreak: 'break-word' }}>
                {rect.text || 'No text content available'}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Update mouse handlers for better drag control
  const handleRectMouseDown = (e, index) => {
    if (e.ctrlKey || e.metaKey) { // Handle context menu
      e.preventDefault();
      e.stopPropagation();
      
      const menuX = Math.min(e.clientX, window.innerWidth - 200);
      const menuY = Math.min(e.clientY, window.innerHeight - 300);
      
      setContextMenu({
        x: menuX,
        y: menuY,
        rectIndex: index
      });
    } else { // Handle dragging
      e.stopPropagation();
      const svgRect = svgRef.current.getBoundingClientRect();
      setSelectedRectIndex(index);
      setIsDragging(true);
      setDragStart({
        x: (e.clientX - svgRect.left) / scale - rectangles[index].x,
        y: (e.clientY - svgRect.top) / scale - rectangles[index].y
      });
    }
  };

  // Function to get mouse position relative to SVG
  const getMousePosition = (e) => {
    const svg = svgRef.current;
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const transformedPoint = point.matrixTransform(svg.getScreenCTM().inverse());
    return { x: transformedPoint.x / scale, y: transformedPoint.y / scale };
  };

  // Start drawing a new rectangle
  const handleMouseDown = (e) => {
    if (e.button === 0 && !contextMenu) { // Left click and no context menu open
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = (e.clientX - svgRect.left) / scale;
      const y = (e.clientY - svgRect.top) / scale;
      
      setIsDrawing(true);
      setCurrentRect({
        x,
        y,
        width: 0,
        height: 0,
        page: currentPage,
        label: selectedLabel,
        color: getLabelColor(selectedLabel)
      });
    }
  };

  // Continue drawing or dragging
  const handleMouseMove = (e) => {
    const svgRect = svgRef.current.getBoundingClientRect();
    const currentX = (e.clientX - svgRect.left) / scale;
    const currentY = (e.clientY - svgRect.top) / scale;

    if (isDrawing && currentRect) {
      setCurrentRect(prev => ({
        ...prev,
        width: currentX - prev.x,
        height: currentY - prev.y
      }));
    } else if (isDragging && selectedRectIndex !== null) {
      const newX = currentX - dragStart.x;
      const newY = currentY - dragStart.y;
      
      const updatedRectangles = rectangles.map((rect, index) => {
        if (index === selectedRectIndex) {
          return {
            ...rect,
            x: newX,
            y: newY
          };
        }
        return rect;
      });
      onAnnotationsChange(updatedRectangles);
    }
  };

  // Finish drawing or dragging
  const handleMouseUp = () => {
    if (isDrawing && currentRect) {
      const normalizedRect = {
        ...currentRect,
        x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
        y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
        width: Math.abs(currentRect.width),
        height: Math.abs(currentRect.height)
      };
      
      if (normalizedRect.width > 0 && normalizedRect.height > 0) {
        onAnnotationsChange([...rectangles, normalizedRect]);
      }
    }
    
    setIsDrawing(false);
    setIsDragging(false);
    setCurrentRect(null);
    setSelectedRectIndex(null);
  };

  // Add window-level mouse up handler
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      setSelectedRectIndex(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleResizeStart = (e, index, corner) => {
    e.stopPropagation();
    setSelectedRectIndex(index);
    setIsResizing({ active: true, corner });
  };

  // Add click outside handler for context menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [contextMenu]);

  return (
    <svg
      ref={svgRef}
      className="annotation-layer"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: pageDimensions.width * scale,
        height: pageDimensions.height * scale,
        pointerEvents: 'all'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {rectangles
        .filter(rect => rect.page === currentPage)
        .map((rect, index) => (
          <g key={index}>
            <rect
              x={rect.x * scale}
              y={rect.y * scale}
              width={rect.width * scale}
              height={rect.height * scale}
              fill={`${rect.color}33`}
              stroke={rect.color}
              strokeWidth="2"
              onMouseDown={(e) => handleRectMouseDown(e, index)}
              style={{ cursor: 'move' }}
            />
            
            {/* Add background rectangle for label */}
            <rect
              x={(rect.x * scale)}
              y={(rect.y * scale)}
              width={(rect.label.length * 9)}  // Approximate width based on text length
              height={25}  // Height to contain the text
              fill="red"
              opacity={0.8}
            />
            {/* Label text */}
            <text
              x={(rect.x * scale) + 5}
              y={(rect.y * scale) + 20}
              fill="yellow"
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                userSelect: 'none',
                textShadow: '1px 1px 2px black'
              }}
            >
              {rect.label}
            </text>

            {/* Resize handles */}
            {selectedRectIndex === index && (
              <>
                {['nw', 'ne', 'sw', 'se'].map(corner => {
                  const x = corner.includes('e') 
                    ? (rect.x + rect.width) * scale 
                    : rect.x * scale;
                  const y = corner.includes('s') 
                    ? (rect.y + rect.height) * scale 
                    : rect.y * scale;
                  
                  return (
                    <circle
                      key={corner}
                      cx={x}
                      cy={y}
                      r={4}
                      fill="white"
                      stroke={rect.color}
                      strokeWidth="2"
                      onMouseDown={(e) => handleResizeStart(e, index, corner)}
                      style={{ cursor: `${corner}-resize` }}
                    />
                  );
                })}
              </>
            )}
          </g>
        ))}

      {/* Context Menu */}
      {contextMenu && (
        <foreignObject x="0" y="0" width="100%" height="100%">
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              rectIndex={contextMenu.rectIndex}
              onClose={() => setContextMenu(null)}
              rectangles={rectangles}
              labels={labels}
              onAnnotationsChange={onAnnotationsChange}
              getLabelColor={getLabelColor}
            />
          </div>
        </foreignObject>
      )}
    </svg>
  );
};

export default RectangleAnnotations; 