import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PdfViewer = ({ pdfS3Key }) => {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPdfUrl = async () => {
      if (!pdfS3Key) {
        setError('No PDF S3 key provided');
        return;
      }

      try {
        console.log('Starting fetch with S3 key:', pdfS3Key);
        
        // Get the PDF using the key
        const response = await axios.get(
          `http://localhost:8000/api/v1/s3/get-pdf-by-key/${encodeURIComponent(pdfS3Key)}`,
          {
            responseType: 'blob'  // Important: tell axios to expect binary data
          }
        );

        // Create a blob URL from the PDF data
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

      } catch (error) {
        console.error('Error fetching PDF:', error);
        setError(error.message);
      }
    };

    fetchPdfUrl();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfS3Key]);

  if (!pdfUrl && !error) {
    return (
      <div>
        <div>Loading PDF...</div>
        <div>S3 Key: {pdfS3Key || 'No key provided'}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div>Error loading PDF: {error}</div>
        <div>S3 Key attempted: {pdfS3Key}</div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <div style={{ marginBottom: '10px' }}>
        <small>Viewing PDF with key: {pdfS3Key}</small>
      </div>
      <iframe
        src={pdfUrl}
        title="PDF Viewer"
        style={{
          width: '100%',
          height: 'calc(100% - 20px)',
          border: 'none'
        }}
      />
    </div>
  );
};

export default PdfViewer;