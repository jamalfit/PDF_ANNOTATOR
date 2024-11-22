import React, { useState, useRef } from 'react';

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
  const [startPoint, setStartPoint] = useState(null);
  const [currentRect, setCurrentRect] = useState(null);
  const [selectedRectIndex, setSelectedRectIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(null);

  const svgRef = useRef(null);

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
    </svg>
  );
};

export default RectangleAnnotations; 