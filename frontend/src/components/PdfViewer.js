import React, { useEffect, useState } from 'react';
import axios from 'axios';
import PdfAnnotator from './PdfAnnotator';

const PdfViewer = ({ pdfS3Key, articleId }) => {
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
        
        const response = await axios.get(
          `http://localhost:8000/api/v1/s3/get-pdf-by-key/${encodeURIComponent(pdfS3Key)}`,
          {
            responseType: 'blob'
          }
        );

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
    return <div>Loading PDF...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden'
      }}
    >
      <PdfAnnotator 
        pdfUrl={pdfUrl} 
        articleId={articleId}
      />
    </div>
  );
};

export default PdfViewer;