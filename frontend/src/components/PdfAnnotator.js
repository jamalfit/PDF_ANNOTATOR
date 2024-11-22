import React, { useState } from 'react';
import { Viewer, Worker } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import { highlightPlugin } from '@react-pdf-viewer/highlight';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';
import '@react-pdf-viewer/highlight/lib/styles/index.css';

const PdfAnnotator = ({ pdfUrl, articleId }) => {
  const [highlights, setHighlights] = useState([]);

  const defaultLayoutPluginInstance = defaultLayoutPlugin();
  const highlightPluginInstance = highlightPlugin({
    onHighlightClick: (highlight) => {
      console.log('Clicked highlight:', highlight);
    },
    onHighlightAdd: (highlight) => {
      setHighlights([...highlights, highlight]);
      console.log('Added highlight:', highlight);
    }
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}
    >
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
        <Viewer
          fileUrl={pdfUrl}
          plugins={[
            defaultLayoutPluginInstance,
            highlightPluginInstance,
          ]}
        />
      </Worker>
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 2
        }}
      >
        <button
          onClick={() => {
            console.log("Saving highlights:", highlights);
            // Add your save logic here
          }}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Save Annotations
        </button>
      </div>
    </div>
  );
};

export default PdfAnnotator; 