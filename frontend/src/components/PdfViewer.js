// src/components/PdfViewer.js
import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import RectangleAnnotations from './RectangleAnnotations';
import PdfControls from './PdfControls';
import './PdfViewer.css';
import axios from 'axios';

// Configure the PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const PdfViewer = ({ articleId, initialAnnotationData }) => {
  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [pageDimensions, setPageDimensions] = useState({ width: 0, height: 0 });
  const [selectedLabel, setSelectedLabel] = useState('Title');
  const [highlightedRect, setHighlightedRect] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const containerRef = useRef(null);
  const [showJsonViewer, setShowJsonViewer] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);

  const labels = [
    'Title', 'Authors', 'Abstract', 'DOI', 'Introduction',
    'Materials and Methods', 'Review Heading', 'Illustration',
    'Table', 'References', 'Keywords'
  ];

  const getLabelColor = (label) => {
    const colorMap = {
      'Title': '#FF6B6B',       // Coral Red
      'Authors': '#4ECDC4',     // Turquoise
      'Abstract': '#45B7D1',    // Sky Blue
      'DOI': '#96CEB4',         // Sage Green
      'Introduction': '#FFD93D', // Yellow
      'Materials and Methods': '#FF8CC8', // Pink
      'Review Heading': '#6C5B7B', // Purple
      'Illustration': '#F8B195', // Peach
      'Table': '#C06C84',       // Rose
      'References': '#355C7D',  // Navy Blue
      'Keywords': '#2ECC71'     // Emerald Green
    };
    return colorMap[label] || '#CCCCCC'; // Default gray if label not found
  };

  const onDocumentLoadSuccess = (pdf) => {
    setNumPages(pdf.numPages);
    setPdfDoc(pdf);
  };

  const onPageLoadSuccess = (page) => {
    const { width, height } = page.getViewport({ scale: 1 });
    setPageDimensions({ width, height });
    console.log('Page loaded with dimensions:', { width, height });
  };

  const handleZoomIn = () => {
    setScale(prevScale => Math.min(prevScale + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prevScale => Math.max(prevScale - 0.1, 0.5));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= numPages) {
      setCurrentPage(newPage);
    }
  };

  const handleLabelChange = (newLabel) => {
    setSelectedLabel(newLabel);
  };

  const handleAnnotationsChange = (newRectangles) => {
    setRectangles(newRectangles);
  };

  const processLoadedAnnotations = (annotationData) => {
    console.log('Processing annotation data:', annotationData);
    
    // Handle both possible data structures
    let annotations = [];
    
    if (typeof annotationData === 'string') {
      try {
        annotationData = JSON.parse(annotationData);
      } catch (e) {
        console.error('Failed to parse annotation data:', e);
      }
    }

    if (annotationData?.annotations) {
      annotations = annotationData.annotations;
    } else if (annotationData?.annotation_data?.annotations) {
      annotations = annotationData.annotation_data.annotations;
    }

    console.log('Found annotations:', annotations);

    if (!annotations || annotations.length === 0) {
      console.log('No valid annotations found');
      return [];
    }

    const processedRectangles = annotations.map(annotation => {
      // Extract coordinates from the annotation
      const coords = annotation.coordinates || {};
      
      return {
        id: annotation.id || Math.random().toString(),
        x: coords.left || annotation.rect?.x || 0,
        y: coords.top || annotation.rect?.y || 0,
        width: (coords.right - coords.left) || annotation.rect?.width || 0,
        height: (coords.bottom - coords.top) || annotation.rect?.height || 0,
        page: annotation.page_num || 1,
        label: annotation.section_type || 'Unknown',
        text: annotation.text || '',
        color: getLabelColor(annotation.section_type)
      };
    });

    console.log('Processed rectangles:', processedRectangles);
    return processedRectangles;
  };

  // Update the useEffect to properly handle the loaded data
  useEffect(() => {
    const loadArticleData = async () => {
      try {
        console.log('Loading article data for ID:', articleId);
        const articleResponse = await axios.get(
          `http://localhost:8000/api/v1/article-queue/${articleId}`
        );
        
        // First try to use initialAnnotationData, then fall back to API response
        const annotationData = initialAnnotationData || articleResponse.data.annotation_data;
        
        if (annotationData) {
          console.log('Found annotation data:', annotationData);
          const processedRectangles = processLoadedAnnotations(annotationData);
          if (processedRectangles.length > 0) {
            console.log('Setting processed rectangles:', processedRectangles);
            setRectangles(processedRectangles);
          }
        }

        // Load PDF
        const pdfUrl = `http://localhost:8000/api/v1/s3/get-pdf-by-key/${encodeURIComponent(articleResponse.data.pdf_s3_key)}`;
        setPdfUrl(pdfUrl);
      } catch (error) {
        console.error('Error loading article data:', error);
      }
    };

    loadArticleData();
  }, [articleId, initialAnnotationData]);

  const extractTextFromPdf = async (rect, pdfPage) => {
    try {
      const textContent = await pdfPage.getTextContent();
      const viewport = pdfPage.getViewport({ scale: 1.0 });
      
      // Convert screen coordinates to PDF coordinates
      const pdfRect = {
        left: rect.x,
        right: rect.x + rect.width,
        // Convert y-coordinates to PDF space (origin at bottom-left)
        bottom: viewport.height - rect.y,
        top: viewport.height - (rect.y + rect.height)
      };

      console.log('PDF Space Rectangle:', {
        rect: rect,
        pdfRect: pdfRect,
        viewportHeight: viewport.height
      });

      // Filter and collect text items
      const textItems = [];
      
      for (const item of textContent.items) {
        // Get text item position in PDF space
        const itemX = item.transform[4];
        const itemY = item.transform[5];

        // Log coordinates for debugging
        console.log('Text Item:', {
          text: item.str,
          x: itemX,
          y: itemY,
          bounds: pdfRect
        });

        // Check if text item is within rectangle bounds in PDF space
        if (
          itemX >= pdfRect.left &&
          itemX <= pdfRect.right &&
          itemY >= pdfRect.top &&
          itemY <= pdfRect.bottom
        ) {
          textItems.push(item);
          console.log('Found text:', item.str);
        }
      }

      // Sort text items top to bottom, left to right
      textItems.sort((a, b) => {
        if (Math.abs(b.transform[5] - a.transform[5]) > 5) {
          return b.transform[5] - a.transform[5]; // Sort by y-coordinate
        }
        return a.transform[4] - b.transform[4]; // Sort by x-coordinate if on same line
      });

      const extractedText = textItems.map(item => item.str).join(' ');
      console.log('Extracted text:', extractedText);
      
      return extractedText;
    } catch (error) {
      console.error('Error extracting text:', error);
      return '';
    }
  };

  const handleSaveAnnotations = async () => {
    try {
      const pdfPages = {};
      
      console.log('Starting annotation save process...');
      
      const annotationsWithText = await Promise.all(
        rectangles.map(async (rect) => {
          // Load PDF page if not already loaded
          if (!pdfPages[rect.page]) {
            pdfPages[rect.page] = await pdfDoc.getPage(rect.page);
          }
          const pdfPage = pdfPages[rect.page];
          
          // Extract text
          const text = await extractTextFromPdf(rect, pdfPage);
          console.log('Extracted text for rectangle:', text);

          return {
            coordinates: {
              left: Math.round(rect.x),
              top: Math.round(rect.y),
              right: Math.round(rect.x + rect.width),
              bottom: Math.round(rect.y + rect.height)
            },
            page_num: rect.page,
            section_type: rect.label,
            text: text
          };
        })
      );

      const annotationData = {
        annotations: annotationsWithText
      };

      console.log('Final annotation data:', annotationData);

      const response = await axios.put(
        `http://localhost:8000/api/v1/article-queue/${articleId}/annotations`,
        { annotation_data: annotationData }
      );

      if (response.status === 200) {
        alert('Annotations saved successfully!');
      }
    } catch (error) {
      console.error('Error saving annotations:', error);
      alert('Failed to save annotations');
    }
  };

  const JsonViewer = ({ data, onClose }) => (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <div className="modal-content" style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '80%',
        maxHeight: '80%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h3>Annotation Data</h3>
          <button onClick={onClose}>Close</button>
        </div>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '4px',
          overflow: 'auto'
        }}>
          {JSON.stringify({
            annotations: rectangles.map(rect => ({
              coordinates: {
                left: rect.x,
                top: rect.y,
                right: rect.x + rect.width,
                bottom: rect.y + rect.height
              },
              rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              },
              page_num: rect.page,
              section_type: rect.label,
              text: rect.text || ''
            }))
          }, null, 2)}
        </pre>
      </div>
    </div>
  );

  return (
    <div style={{ margin: '20px' }} ref={containerRef}>
      <div className="pdf-controls" style={{ marginBottom: '10px' }}>
        <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
          Previous Page
        </button>
        <span style={{ margin: '0 10px' }}>
          Page {currentPage} of {numPages}
        </span>
        <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= numPages}>
          Next Page
        </button>
        <button onClick={handleZoomOut} style={{ marginLeft: '10px' }}>Zoom Out</button>
        <button onClick={handleZoomIn}>Zoom In</button>
        <select 
          value={selectedLabel} 
          onChange={(e) => handleLabelChange(e.target.value)}
          style={{ marginLeft: '10px' }}
        >
          {labels.map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        <button 
          onClick={handleSaveAnnotations}
          style={{
            marginLeft: '10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px'
          }}
        >
          Save Annotations
        </button>
        <button 
          onClick={() => setShowJsonViewer(true)}
          style={{
            marginLeft: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px'
          }}
        >
          Show Annotations JSON
        </button>
      </div>

      {showJsonViewer && (
        <JsonViewer 
          data={rectangles} 
          onClose={() => setShowJsonViewer(false)} 
        />
      )}

      <div 
        className="pdf-container"
        style={{
          position: 'relative',
          border: '1px solid #ccc',
          margin: '0 auto'
        }}
      >
        {pdfUrl && (
          <Document file={pdfUrl} onLoadSuccess={onDocumentLoadSuccess}>
            <Page
              key={`page_${currentPage}`}
              pageNumber={currentPage}
              scale={scale}
              onLoadSuccess={onPageLoadSuccess}
              renderTextLayer={true}
              renderAnnotationLayer={false}
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
          getLabelColor={getLabelColor}
        />
      </div>
    </div>
  );
};

export default PdfViewer;