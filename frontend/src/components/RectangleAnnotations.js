import React, { useState, useRef } from 'react';

const RectangleAnnotations = ({
  scale,
  currentPage,
  pageDimensions,
  labels,
  selectedLabel,
  onLabelChange,
  highlightedRect,
  rectangles,
  onAnnotationsChange,
}) => {
  // State variables
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentRect, setCurrentRect] = useState(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [activeRectIndex, setActiveRectIndex] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [resizeHandleIndex, setResizeHandleIndex] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedRectIndex, setSelectedRectIndex] = useState(null);
  const [showLabelPopup, setShowLabelPopup] = useState(false);
  const [showTextPopup, setShowTextPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: '50%', y: '50%' });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef(null);

  const MIN_RECT_SIZE = 20;
  const LABEL_HEIGHT = 25;
  const HANDLE_SIZE = 8; // Size of the resize handles

  // Add this color mapping at the top of your component or as a separate constant
  const LABEL_COLORS = {
    'Title': { border: '#FF0000', background: 'rgba(255, 0, 0, 0.1)' },         // Bright Red
    'Authors': { border: '#00FF00', background: 'rgba(0, 255, 0, 0.1)' },       // Bright Green
    'Abstract': { border: '#0000FF', background: 'rgba(0, 0, 255, 0.1)' },      // Bright Blue
    'DOI': { border: '#FF00FF', background: 'rgba(255, 0, 255, 0.1)' },         // Magenta
    'Introduction': { border: '#FF8C00', background: 'rgba(255, 140, 0, 0.1)' }, // Dark Orange
    'Materials and Methods': { border: '#8B008B', background: 'rgba(139, 0, 139, 0.1)' }, // Dark Magenta
    'Review Heading': { border: '#00FFFF', background: 'rgba(0, 255, 255, 0.1)' }, // Cyan
    'Illustration': { border: '#FFD700', background: 'rgba(255, 215, 0, 0.1)' }, // Gold
    'Table': { border: '#32CD32', background: 'rgba(50, 205, 50, 0.1)' },       // Lime Green
    'References': { border: '#8A2BE2', background: 'rgba(138, 43, 226, 0.1)' }, // Blue Violet
    'Keywords': { border: '#FF4500', background: 'rgba(255, 69, 0, 0.1)' },     // Orange Red
    'default': { border: '#808080', background: 'rgba(128, 128, 128, 0.1)' }    // Gray
  };

  // Helper to get relative mouse position
  const getRelativePosition = (e) => {
    const containerRect = containerRef.current.getBoundingClientRect();
    const offsetX = (e.clientX - containerRect.left) / scale;
    const offsetY = (e.clientY - containerRect.top) / scale;
    return { offsetX, offsetY };
  };

  // Add detectResizeHandle function here, before handleMouseDown
  const detectResizeHandle = (rect, x, y) => {
    const handlePositions = [
      { x: rect.x, y: rect.y }, // Top-left
      { x: rect.x + rect.width, y: rect.y }, // Top-right
      { x: rect.x + rect.width, y: rect.y + rect.height }, // Bottom-right
      { x: rect.x, y: rect.y + rect.height }, // Bottom-left
    ];

    // Check if the click is near any handle
    for (let i = 0; i < handlePositions.length; i++) {
      const handle = handlePositions[i];
      const dx = x - handle.x;
      const dy = y - handle.y;
      // If click is within HANDLE_SIZE pixels of a handle position
      if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_SIZE / scale) {
        return i;
      }
    }
    return -1;
  };

  // Mouse down handler
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;

    // Right-click or Ctrl+Click for context menu
    if (e.type === 'contextmenu' || e.ctrlKey) {
      e.preventDefault();
      handleContextMenu(e);
      return;
    }

    const { offsetX, offsetY } = getRelativePosition(e);

    // Check if clicked on a resize handle
    for (let index = 0; index < rectangles.length; index++) {
      const rect = rectangles[index];
      if (rect.pageNumber !== currentPage) continue;

      const handleIndex = detectResizeHandle(rect, offsetX, offsetY);
      if (handleIndex !== -1) {
        // Clicked on a resize handle
        setActiveRectIndex(index);
        setActionType('resize');
        setResizeHandleIndex(handleIndex);
        setStartPoint({ x: offsetX, y: offsetY });
        return;
      }
    }

    // Check if clicked inside a rectangle (to move it)
    for (let index = 0; index < rectangles.length; index++) {
      const rect = rectangles[index];
      if (rect.pageNumber !== currentPage) continue;

      if (
        offsetX >= rect.x &&
        offsetX <= rect.x + rect.width &&
        offsetY >= rect.y &&
        offsetY <= rect.y + rect.height
      ) {
        // Clicked inside a rectangle
        setActiveRectIndex(index);
        setActionType('move');
        setStartPoint({ x: offsetX, y: offsetY });
        return;
      }
    }

    // Start drawing a new rectangle
    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    setCurrentRect({
      x: offsetX,
      y: offsetY,
      width: 0,
      height: 0,
      pageNumber: currentPage,
      label: selectedLabel,
    });
  };

  // Mouse move handler
  const handleMouseMove = (e) => {
    const { offsetX, offsetY } = getRelativePosition(e);

    if (isDrawing) {
      // Update the size of the rectangle being drawn
      const newWidth = offsetX - startPoint.x;
      const newHeight = offsetY - startPoint.y;
      setCurrentRect({ ...currentRect, width: newWidth, height: newHeight });
    } else if (actionType === 'move' && activeRectIndex !== null) {
      // Move the rectangle
      const dx = offsetX - startPoint.x;
      const dy = offsetY - startPoint.y;
      setStartPoint({ x: offsetX, y: offsetY });
      updateRectangles((prevRects) => {
        const newRects = [...prevRects];
        const rect = { ...newRects[activeRectIndex] };
        rect.x += dx;
        rect.y += dy;
        newRects[activeRectIndex] = rect;
        return newRects;
      });
    } else if (actionType === 'resize' && activeRectIndex !== null) {
      // Resize the rectangle
      updateRectangles((prevRects) => {
        const newRects = [...prevRects];
        const rect = { ...newRects[activeRectIndex] };

        const dx = offsetX - startPoint.x;
        const dy = offsetY - startPoint.y;

        switch (resizeHandleIndex) {
          case 0: // Top-left
            rect.x += dx;
            rect.y += dy;
            rect.width -= dx;
            rect.height -= dy;
            break;
          case 1: // Top-right
            rect.y += dy;
            rect.width += dx;
            rect.height -= dy;
            break;
          case 2: // Bottom-right
            rect.width += dx;
            rect.height += dy;
            break;
          case 3: // Bottom-left
            rect.x += dx;
            rect.width -= dx;
            rect.height += dy;
            break;
          default:
            break;
        }

        // Enforce minimum size
        if (rect.width < MIN_RECT_SIZE) rect.width = MIN_RECT_SIZE;
        if (rect.height < MIN_RECT_SIZE) rect.height = MIN_RECT_SIZE;

        newRects[activeRectIndex] = rect;
        setStartPoint({ x: offsetX, y: offsetY });
        return newRects;
      });
    }
  };

  // Mouse up handler
  const handleMouseUp = (e) => {
    if (isDrawing) {
      setIsDrawing(false);
      if (
        Math.abs(currentRect.width) > MIN_RECT_SIZE &&
        Math.abs(currentRect.height) > MIN_RECT_SIZE
      ) {
        // Normalize rectangle coordinates if drawn in reverse
        const normalizedRect = {
          ...currentRect,
          x: currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x,
          y: currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y,
          width: Math.abs(currentRect.width),
          height: Math.abs(currentRect.height),
        };
        
        // Add extracted text to the rectangle
        normalizedRect.extractedText = getTextInRectangle(normalizedRect);
        
        updateRectangles([...rectangles, normalizedRect]);
      }
      setCurrentRect(null);
    } else if (actionType) {
      // If we're finishing a move or resize, update the text
      if (activeRectIndex !== null) {
        const updatedRectangles = [...rectangles];
        updatedRectangles[activeRectIndex].extractedText = 
          getTextInRectangle(updatedRectangles[activeRectIndex]);
        updateRectangles(updatedRectangles);
      }
      
      setActionType(null);
      setActiveRectIndex(null);
      setResizeHandleIndex(null);
    }
  };

  // Handle context menu action
  const handleContextMenuAction = (action) => {
    setContextMenu(null);

    if (action === 'delete') {
      if (selectedRectIndex !== null) {
        const newRectangles = rectangles.filter((_, index) => index !== selectedRectIndex);
        updateRectangles(newRectangles);
        setSelectedRectIndex(null);
      }
    } else if (action === 'changeLabel') {
      setShowLabelPopup(true);
    } else if (action === 'showText') {
      setShowTextPopup(true);
    }
  };

  // Handle context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    const { offsetX, offsetY } = getRelativePosition(e);

    // Find if a rectangle was right-clicked
    const clickedRectIndex = rectangles.findIndex((rect) => {
      if (rect.pageNumber !== currentPage) return false;
      return (
        offsetX >= rect.x &&
        offsetX <= rect.x + rect.width &&
        offsetY >= rect.y &&
        offsetY <= rect.y + rect.height
      );
    });

    if (clickedRectIndex !== -1) {
      setSelectedRectIndex(clickedRectIndex);
      setContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
      });
    } else {
      setContextMenu(null);
    }
  };

  // Render context menu
  const renderContextMenu = () => {
    if (!contextMenu) return null;

    const { mouseX, mouseY } = contextMenu;

    return (
      <ul
        style={{
          position: 'absolute',
          top:
            mouseY -
            containerRef.current.getBoundingClientRect().top +
            containerRef.current.scrollTop,
          left:
            mouseX -
            containerRef.current.getBoundingClientRect().left +
            containerRef.current.scrollLeft,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          listStyle: 'none',
          padding: '5px 0',
          margin: 0,
          zIndex: 1000,
        }}
        onMouseLeave={() => setContextMenu(null)}
      >
        <li
          style={{
            padding: '5px 10px',
            cursor: 'pointer',
          }}
          onClick={() => handleContextMenuAction('delete')}
        >
          Delete
        </li>
        <li
          style={{
            padding: '5px 10px',
            cursor: 'pointer',
          }}
          onClick={() => handleContextMenuAction('changeLabel')}
        >
          Change Label
        </li>
        <li
          style={{
            padding: '5px 10px',
            cursor: 'pointer',
          }}
          onClick={() => handleContextMenuAction('showText')}
        >
          Show Text
        </li>
      </ul>
    );
  };

  // Handle label change popup submission
  const handleLabelChangeSubmit = (e) => {
    e.preventDefault();
    const newLabel = e.target.elements.label.value;
    if (selectedRectIndex !== null) {
      const newRectangles = [...rectangles];
      newRectangles[selectedRectIndex].label = newLabel;
      updateRectangles(newRectangles);
      setShowLabelPopup(false);
    }
  };

  // Render label change popup
  const renderLabelPopup = () => {
    if (!showLabelPopup || selectedRectIndex === null) return null;

    const currentLabel = rectangles[selectedRectIndex].label;

    return (
      <div
        style={{
          position: 'fixed',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -30%)',
          backgroundColor: 'white',
          border: '1px solid #ccc',
          padding: '15px',
          zIndex: 1000,
        }}
      >
        <h3>Change Label</h3>
        <form onSubmit={handleLabelChangeSubmit}>
          <select name="label" defaultValue={currentLabel}>
            {labels.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <div style={{ marginTop: '10px' }}>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setShowLabelPopup(false)} style={{ marginLeft: '10px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  // Add this function to extract text from within rectangle bounds
  const getTextInRectangle = (rect) => {
    const textLayer = document.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return 'No text found (text layer not loaded)';

    let textContent = '';
    const textElements = textLayer.getElementsByTagName('span');

    for (let span of textElements) {
      const spanRect = span.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Convert screen coordinates to PDF coordinates
      const spanX = (spanRect.x - containerRect.x) / scale;
      const spanY = (spanRect.y - containerRect.y) / scale;
      
      // Check if the text element is within the rectangle bounds
      if (
        spanX >= rect.x &&
        spanX <= rect.x + rect.width &&
        spanY >= rect.y &&
        spanY <= rect.y + rect.height
      ) {
        textContent += span.textContent + ' ';
      }
    }

    return textContent.trim() || 'No text found in this region';
  };

  // Modify the renderTextPopup function
  const renderTextPopup = () => {
    if (!showTextPopup || selectedRectIndex === null) return null;

    const selectedRect = rectangles[selectedRectIndex];
    const textContent = getTextInRectangle(selectedRect);
    
    const handleDragStart = (e) => {
      setIsDragging(true);
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    const handleDrag = (e) => {
      if (!isDragging) return;
      setPopupPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    return (
      <div
        style={{
          position: 'fixed',
          top: popupPosition.y,
          left: popupPosition.x,
          transform: 'none', // Remove transform to allow dragging
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '0', // Remove padding to accommodate header
          zIndex: 1000,
          maxWidth: '80%',
          maxHeight: '80vh',
          width: '500px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        {/* Draggable header */}
        <div
          style={{
            padding: '10px',
            backgroundColor: '#f0f0f0',
            borderBottom: '1px solid #ccc',
            cursor: 'move',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none',
          }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDrag}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          <h3 style={{ margin: 0 }}>Rectangle Content</h3>
          <button
            onClick={() => {
              setShowTextPopup(false);
              setPopupPosition({ x: '50%', y: '50%' });
            }}
            style={{
              padding: '5px 10px',
              cursor: 'pointer',
              border: '1px solid #ccc',
              backgroundColor: '#fff',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#666',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Content area */}
        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '15px' }}>
            <p><strong>Label:</strong> {selectedRect.label}</p>
            <p><strong>Page:</strong> {selectedRect.pageNumber}</p>
          </div>
          <div
            style={{
              marginBottom: '15px',
              padding: '10px',
              border: '1px solid #eee',
              borderRadius: '4px',
              backgroundColor: '#f9f9f9',
              maxHeight: '300px',
              overflowY: 'auto',
            }}
          >
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{textContent}</p>
          </div>
        </div>
      </div>
    );
  };

  // Rest of your existing code, including renderRectangles, etc.

  // ...

  const renderRectangles = () => {
    return rectangles
      .filter((rect) => rect.pageNumber === currentPage)
      .map((rect, index) => {
        const left = rect.x * scale;
        const top = rect.y * scale;
        const width = rect.width * scale;
        const height = rect.height * scale;

        const colors = LABEL_COLORS[rect.label] || LABEL_COLORS.default;
        const isHighlighted = highlightedRect && 
          rect.x === highlightedRect.x && 
          rect.y === highlightedRect.y && 
          rect.pageNumber === highlightedRect.pageNumber;

        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: left,
              top: top,
              width: width,
              height: height,
              border: isHighlighted ? '3px solid yellow' : `2px solid ${colors.border}`,
              backgroundColor: isHighlighted ? 'rgba(255, 255, 0, 0.2)' : colors.background,
              cursor: 'move',
              zIndex: 10,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              handleMouseDown(e);
            }}
            onContextMenu={(e) => {
              e.stopPropagation();
              handleContextMenu(e);
            }}
          >
            {/* Label with matching background color */}
            <div
              style={{
                position: 'absolute',
                top: -LABEL_HEIGHT,
                left: 0,
                backgroundColor: colors.border,
                color: '#fff',
                border: `1px solid ${colors.border}`,
                padding: '2px 5px',
                fontSize: '12px',
                zIndex: 11,
                borderRadius: '3px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {rect.label}
            </div>
            {renderResizeHandles(rect)}
          </div>
        );
      });
  };

  // Function to render resize handles
  const renderResizeHandles = (rect) => {
    const handles = [];
    const handlePositions = [
      { left: 0, top: 0 }, // Top-left
      { left: '100%', top: 0 }, // Top-right
      { left: '100%', top: '100%' }, // Bottom-right
      { left: 0, top: '100%' }, // Bottom-left
    ];

    handlePositions.forEach((pos, index) => {
      handles.push(
        <div
          key={index}
          style={{
            position: 'absolute',
            left: pos.left,
            top: pos.top,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            backgroundColor: 'white',
            border: '1px solid black',
            cursor: getResizeCursor(index),
            transform: 'translate(-50%, -50%)',
            zIndex: 12,
          }}
          onMouseDown={(e) => {
            e.stopPropagation();
            setActiveRectIndex(rectangles.indexOf(rect));
            setActionType('resize');
            setResizeHandleIndex(index);
            const { offsetX, offsetY } = getRelativePosition(e);
            setStartPoint({ x: offsetX, y: offsetY });
          }}
        />
      );
    });

    return handles;
  };

  // Function to get the cursor style based on handle index
  const getResizeCursor = (handleIndex) => {
    switch (handleIndex) {
      case 0:
        return 'nwse-resize'; // Top-left
      case 1:
        return 'nesw-resize'; // Top-right
      case 2:
        return 'nwse-resize'; // Bottom-right
      case 3:
        return 'nesw-resize'; // Bottom-left
      default:
        return 'default';
    }
  };

  // Replace all setRectangles calls with onAnnotationsChange
  const updateRectangles = (newRectangles) => {
    onAnnotationsChange(newRectangles);
  };

  // Return statement
  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: pageDimensions.width * scale,
        height: pageDimensions.height * scale,
        zIndex: 5,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {renderRectangles()}
      {/* Current rectangle being drawn */}
      {isDrawing && currentRect && (
        <div
          style={{
            position: 'absolute',
            left: (currentRect.width < 0 ? currentRect.x + currentRect.width : currentRect.x) * scale,
            top: (currentRect.height < 0 ? currentRect.y + currentRect.height : currentRect.y) * scale,
            width: Math.abs(currentRect.width) * scale,
            height: Math.abs(currentRect.height) * scale,
            border: `2px dashed ${LABEL_COLORS[selectedLabel]?.border || LABEL_COLORS.default.border}`,
            backgroundColor: LABEL_COLORS[selectedLabel]?.background || LABEL_COLORS.default.background,
            zIndex: 15,
          }}
        />
      )}
      {/* Context Menu */}
      {renderContextMenu()}
      {/* Label Change Popup */}
      {renderLabelPopup()}
      {/* Text Popup */}
      {renderTextPopup()}
    </div>
  );
};

export default RectangleAnnotations; 