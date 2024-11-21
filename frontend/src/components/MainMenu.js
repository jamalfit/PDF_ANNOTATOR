// src/components/MainMenu.js
import React, { useState } from 'react';
import PdfViewer from './PdfViewer';

const MainMenu = () => {
  const [pdfFiles, setPdfFiles] = useState([]);

  const handleOpenPdf = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      const file = files[0];
      const fileURL = URL.createObjectURL(file);
      const newPdf = {
        id: pdfFiles.length + 1,
        fileURL,
        name: file.name,
      };
      setPdfFiles([...pdfFiles, newPdf]);
    }
  };

  return (
    <div>
      <h1>PDF_SEGMENTER</h1>
      <div className="menu-bar">
        <input
          type="file"
          accept="application/pdf"
          onChange={handleOpenPdf}
        />
      </div>
      <div className="pdf-windows">
        {pdfFiles.map((pdf) => (
          <div key={pdf.id} className="pdf-window">
            <h3>{pdf.name}</h3>
            <PdfViewer fileURL={pdf.fileURL} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainMenu;