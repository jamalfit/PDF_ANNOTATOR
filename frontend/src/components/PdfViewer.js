// src/components/PdfViewer.js
import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import RectangleAnnotations from './RectangleAnnotations';
import PdfControls from './PdfControls';
import './PdfViewer.css';

// Configure the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfViewer = ({ articleId }) => {
  // State variables
  const [rectangles, setRectangles] = useState([]);
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [scale, setScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [selectedLabel, setSelectedLabel] = useState('Title');
  const [highlightedRect, setHighlightedRect] = useState(null);

  const containerRef = useRef(null);

  // List of labels
  const labels = [
    'Title',
    'Authors',
    'Abstract',
    'DOI',
    'Introduction',
    'Materials and Methods',
    'Review Heading',
    'Illustration',
    'Table',
    'References',
    'Keywords',
  ];

  // Event handlers
  const handleLabelChange = (e) => setSelectedLabel(e.target.value);
  const handleZoomIn = () => setZoomLevel((prev) => prev + 0.1);
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.1));
  const handleResetZoom = () => setZoomLevel(1.0);
  const goToPrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, numPages));

  const onDocumentLoadSuccess = (pdf) => setNumPages(pdf.numPages);
  const onPageLoadSuccess = (page) => {
    const viewport = page.getViewport({ scale: 1.0 });
    setPageDimensions({
      width: viewport.width,
      height: viewport.height,
    });
    setScale(zoomLevel);
  };

  // Update scale when zoomLevel changes
  useEffect(() => {
    setScale(zoomLevel);
  }, [zoomLevel]);

  const handleJumpToAnnotation = (rect) => {
    setHighlightedRect(rect);
    // Highlight will be removed after 2 seconds
    setTimeout(() => setHighlightedRect(null), 2000);
  };

  const handleDeleteAnnotation = (index) => {
    setRectangles(prevRects => prevRects.filter((_, i) => i !== index));
  };

  // Add handler for updating rectangles
  const handleAnnotationsChange = (newRectangles) => {
    setRectangles(newRectangles);
  };

  // Add state for PDF URL
  const [pdfUrl, setPdfUrl] = useState(null);

  // Load PDF when component mounts
  useEffect(() => {
    const loadPdf = async () => {
      try {
        // Get PDF directly from our endpoint
        const response = await fetch(
          `http://localhost:8000/api/v1/s3/get-pdf/${articleId}`,
          {
            method: 'GET',
          }
        );
        
        if (!response.ok) {
          throw new Error('Failed to load PDF');
        }

        const pdfBlob = await response.blob();
        const pdfUrl = URL.createObjectURL(pdfBlob);
        setPdfUrl(pdfUrl);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    if (articleId) {
      loadPdf();
    }

    // Cleanup
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [articleId]);

  return (
    <div style={{ margin: '20px' }}>
      <PdfControls
        currentPage={currentPage}
        numPages={numPages}
        zoomLevel={zoomLevel}
        selectedLabel={selectedLabel}
        labels={labels}
        onLabelChange={handleLabelChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onPrevPage={goToPrevPage}
        onNextPage={goToNextPage}
        rectangles={rectangles}
        setCurrentPage={setCurrentPage}
        onDeleteAnnotation={handleDeleteAnnotation}
        onJumpToAnnotation={handleJumpToAnnotation}
      />

      <div
        id="pdf-container"
        className="pdf-container"
        ref={containerRef}
        style={{
          position: 'relative',
          width: pageDimensions.width * scale,
          height: pageDimensions.height * scale,
          overflow: 'hidden',
          border: '1px solid #ccc',
          margin: '0 auto',
        }}
      >
        {pdfUrl && (  // Only render Document when we have the URL
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page
              key={`page_${currentPage}`}
              pageNumber={currentPage}
              scale={scale}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              style={{ pointerEvents: 'none' }}
            />
          </Document>
        )}

        <RectangleAnnotations
          scale={scale}
          currentPage={currentPage}
          pageDimensions={pageDimensions}
          labels={labels}
          selectedLabel={selectedLabel}
          onLabelChange={handleLabelChange}
          highlightedRect={highlightedRect}
          rectangles={rectangles}
          onAnnotationsChange={handleAnnotationsChange}
        />
      </div>
    </div>
  );
};

export default PdfViewer;