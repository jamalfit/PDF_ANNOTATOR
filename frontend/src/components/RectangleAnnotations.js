import React, { useState, useRef } from 'react';
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
  const [dragOffset, setDragOffset] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const svgRef = useRef(null);

  // Context Menu Component
  const ContextMenu = ({ x, y, rectIndex, onClose, rectangles, labels, onAnnotationsChange }) => {
    const rect = rectangles[rectIndex];
    const [showJson, setShowJson] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x, y: Math.min(y, window.innerHeight / 3) });
    const [jsonPosition, setJsonPosition] = useState({ x: window.innerWidth / 4, y: window.innerHeight / 4 });
    
    // Add click outside handler
    React.useEffect(() => {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.text-modal-content')) {
          onClose();
        }
      };
      
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleDelete = () => {
      const newRectangles = rectangles.filter((_, index) => index !== rectIndex);
      onAnnotationsChange(newRectangles);
      onClose();
    };

    const handleLabelChange = (newLabel) => {
      const updatedRectangles = rectangles.map((r, index) => 
        index === rectIndex ? { 
          ...r, 
          label: newLabel,
          color: getLabelColor(newLabel)
        } : r
      );
      onAnnotationsChange(updatedRectangles);
    };

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

    const handleJsonMouseDown = (e) => {
      const startX = e.clientX - jsonPosition.x;
      const startY = e.clientY - jsonPosition.y;
      
      const handleMouseMove = (e) => {
        setJsonPosition({
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

    return (
      <>
        <div 
          className="context-menu"
          style={{
            position: 'fixed',
            top: menuPosition.y,
            left: menuPosition.x,
            cursor: 'move'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="menu-header"
            onMouseDown={handleMenuMouseDown}
            style={{
              padding: '5px',
              background: '#f0f0f0',
              borderBottom: '1px solid #ccc',
              cursor: 'move'
            }}
          >
            ⋮⋮ Menu
            <button 
              onClick={onClose}
              style={{
                float: 'right',
                border: 'none',
                background: 'none',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          <div className="menu-item" onClick={() => setShowJson(true)}>
            View Text
          </div>
          <div className="menu-item">
            Change Label
            <select 
              value={rect.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              {labels.map(label => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
          <div 
            className="menu-item delete" 
            onClick={handleDelete}
            style={{ cursor: 'pointer' }}
          >
            Delete Rectangle
          </div>
        </div>

        {showJson && (
          <div className="text-modal-overlay" onClick={() => setShowJson(false)}>
            <div 
              className="text-modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: jsonPosition.y,
                left: jsonPosition.x,
                transform: 'none'
              }}
            >
              <div 
                className="text-modal-header"
                onMouseDown={handleJsonMouseDown}
                style={{ cursor: 'move' }}
              >
                <h3>Rectangle Text Content</h3>
                <button 
                  className="close-button" 
                  onClick={() => setShowJson(false)}
                  style={{
                    float: 'right',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
              <div className="text-modal-body">
                {rect.text || 'No text content'}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // Replace the Ctrl+click handler with double-click
  const handleRectClick = (e, index) => {
    if (e.detail === 2) { // Check for double-click
      e.preventDefault();
      e.stopPropagation();
      
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        rectIndex: index
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
    if (e.target !== svgRef.current) return; // Prevent drawing if clicking on existing rectangle
    e.preventDefault();

    const { x, y } = getMousePosition(e);

    setIsDrawing(true);
    setStartPoint({ x, y });

    setCurrentRect({
      x,
      y,
      width: 0,
      height: 0,
      page: currentPage,
      label: selectedLabel,
      color: getLabelColor(selectedLabel),
    });
  };

  // Continue drawing or dragging
  const handleMouseMove = (e) => {
    if (isDrawing) {
      e.preventDefault();

      const { x, y } = getMousePosition(e);

      const newRect = {
        ...currentRect,
        x: Math.min(x, startPoint.x),
        y: Math.min(y, startPoint.y),
        width: Math.abs(x - startPoint.x),
        height: Math.abs(y - startPoint.y),
      };

      setCurrentRect(newRect);
    } else if (isDragging && selectedRectIndex !== null) {
      e.preventDefault();

      const { x: mouseX, y: mouseY } = getMousePosition(e);
      const { offsetX, offsetY } = dragOffset;

      const newX = mouseX - offsetX;
      const newY = mouseY - offsetY;

      const updatedRectangles = rectangles.map((rect, index) => {
        if (index === selectedRectIndex) {
          return {
            ...rect,
            x: newX,
            y: newY,
            width: rect.width,
            height: rect.height,
            page: rect.page,
            label: rect.label,
            color: rect.color,
            text: rect.text
          };
        }
        return rect;
      });

      onAnnotationsChange(updatedRectangles);
    } else if (isResizing && selectedRectIndex !== null) {
      e.preventDefault();
      
      const { x: mouseX, y: mouseY } = getMousePosition(e);
      const rect = rectangles[selectedRectIndex];
      let newRect = { ...rect };

      switch (resizeHandle) {
        case 'nw':
          newRect.width = (rect.x + rect.width - mouseX);
          newRect.height = (rect.y + rect.height - mouseY);
          newRect.x = mouseX;
          newRect.y = mouseY;
          break;
        case 'ne':
          newRect.width = (mouseX - rect.x);
          newRect.height = (rect.y + rect.height - mouseY);
          newRect.y = mouseY;
          break;
        case 'sw':
          newRect.width = (rect.x + rect.width - mouseX);
          newRect.height = (mouseY - rect.y);
          newRect.x = mouseX;
          break;
        case 'se':
          newRect.width = (mouseX - rect.x);
          newRect.height = (mouseY - rect.y);
          break;
        default:
          break;
      }

      // Ensure minimum size
      if (newRect.width > 5 && newRect.height > 5) {
        const updatedRectangles = rectangles.map((r, index) =>
          index === selectedRectIndex ? newRect : r
        );
        onAnnotationsChange(updatedRectangles);
      }
    }
  };

  // Finish drawing or dragging
  const handleMouseUp = (e) => {
    if (isDrawing && currentRect) {
      e.preventDefault();

      setIsDrawing(false);

      // Only save rectangles with a minimum size
      if (currentRect.width > 5 && currentRect.height > 5) {
        onAnnotationsChange([...rectangles, currentRect]);
      }
      setCurrentRect(null);
    } else if (isDragging) {
      e.preventDefault();

      setIsDragging(false);
      setSelectedRectIndex(null);
      setDragOffset(null);
      
      // Important: Force a save after moving a rectangle
      onAnnotationsChange([...rectangles]);
    } else if (isResizing) {
      e.preventDefault();
      setIsResizing(false);
      setResizeHandle(null);
      setSelectedRectIndex(null);
      onAnnotationsChange([...rectangles]);
    }
  };

  // Start dragging an existing rectangle
  const handleRectMouseDown = (e, index) => {
    e.stopPropagation();
    e.preventDefault();

    const { x: mouseX, y: mouseY } = getMousePosition(e);
    const rect = rectangles[index];

    // Store the offset between the mouse position and the rectangle's position
    const offsetX = mouseX - rect.x;
    const offsetY = mouseY - rect.y;

    setDragOffset({
      offsetX,
      offsetY,
    });

    setIsDragging(true);
    setSelectedRectIndex(index);
  };

  const handleResizeStart = (e, index, handle) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsResizing(true);
    setSelectedRectIndex(index);
    setResizeHandle(handle);
    
    const { x, y } = getMousePosition(e);
    setStartPoint({ x, y });
  };

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
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {rectangles
        .filter((rect) => rect.page === currentPage)
        .map((rect, index) => (
          <g key={index}>
            <rect
              x={rect.x * scale}
              y={rect.y * scale}
              width={rect.width * scale}
              height={rect.height * scale}
              fill={rect.color || getLabelColor(rect.label)}
              fillOpacity="0.1"
              stroke={rect.color || getLabelColor(rect.label)}
              strokeWidth={selectedRectIndex === index ? '3' : '2'}
              cursor="move"
              onMouseDown={(e) => handleRectMouseDown(e, index)}
              onClick={(e) => handleRectClick(e, index)}
            />
            <text
              x={rect.x * scale + 5}
              y={rect.y * scale + 15}
              fill={rect.color || getLabelColor(rect.label)}
              fontSize="12px"
              pointerEvents="none"
            >
              {rect.label}
            </text>
            
            {/* Resize handles */}
            <circle
              cx={rect.x * scale}
              cy={rect.y * scale}
              r={4}
              fill="white"
              stroke={rect.color || getLabelColor(rect.label)}
              strokeWidth="2"
              cursor="nw-resize"
              onMouseDown={(e) => handleResizeStart(e, index, 'nw')}
            />
            <circle
              cx={(rect.x + rect.width) * scale}
              cy={rect.y * scale}
              r={4}
              fill="white"
              stroke={rect.color || getLabelColor(rect.label)}
              strokeWidth="2"
              cursor="ne-resize"
              onMouseDown={(e) => handleResizeStart(e, index, 'ne')}
            />
            <circle
              cx={rect.x * scale}
              cy={(rect.y + rect.height) * scale}
              r={4}
              fill="white"
              stroke={rect.color || getLabelColor(rect.label)}
              strokeWidth="2"
              cursor="sw-resize"
              onMouseDown={(e) => handleResizeStart(e, index, 'sw')}
            />
            <circle
              cx={(rect.x + rect.width) * scale}
              cy={(rect.y + rect.height) * scale}
              r={4}
              fill="white"
              stroke={rect.color || getLabelColor(rect.label)}
              strokeWidth="2"
              cursor="se-resize"
              onMouseDown={(e) => handleResizeStart(e, index, 'se')}
            />
          </g>
        ))}
      {currentRect && (
        <rect
          x={currentRect.x * scale}
          y={currentRect.y * scale}
          width={currentRect.width * scale}
          height={currentRect.height * scale}
          fill={currentRect.color}
          fillOpacity="0.1"
          stroke={currentRect.color}
          strokeWidth="2"
          strokeDasharray="5,5"
        />
      )}
      {contextMenu && (
        <foreignObject x="0" y="0" width="100%" height="100%">
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            rectIndex={contextMenu.rectIndex}
            onClose={() => setContextMenu(null)}
            rectangles={rectangles}
            labels={labels}
            onAnnotationsChange={onAnnotationsChange}
          />
        </foreignObject>
      )}
    </svg>
  );
};

export default RectangleAnnotations; 