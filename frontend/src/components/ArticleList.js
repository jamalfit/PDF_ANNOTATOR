import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ArticleList.css';
import PdfViewer from './PdfViewer';

const PDFViewer = ({ pdfUrl, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content pdf-viewer">
        <div className="pdf-header">
          <h3>PDF Document</h3>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
        <iframe
          src={pdfUrl}
          title="PDF Viewer"
          width="100%"
          height="100%"
        />
      </div>
    </div>
  );
};

const JsonViewer = ({ data, onClose }) => {
  // Function to format the JSON with syntax highlighting
  const formatJson = (json) => {
    if (!json) return '';
    
    // Convert special characters to HTML entities
    const htmlEntities = (str) => {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Add syntax highlighting
    const highlighted = JSON.stringify(json, null, 2)
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'json-number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'json-key';
          } else {
            cls = 'json-string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'json-boolean';
        } else if (/null/.test(match)) {
          cls = 'json-null';
        }
        return `<span class="${cls}">${htmlEntities(match)}</span>`;
      });

    return highlighted;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content json-viewer">
        <div className="json-header">
          <h3>Annotation Data</h3>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
        <div className="json-content">
          <pre dangerouslySetInnerHTML={{ __html: formatJson(data) }} />
        </div>
      </div>
    </div>
  );
};

const ArticleView = ({ article, onClose }) => {
  const [showPDF, setShowPDF] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleViewPDF = async () => {
    try {
      const response = await axios.get(`http://localhost:8000/api/v1/s3/get-presigned-url/${article.id}`);
      setPdfUrl(response.data.url);
      setShowPDF(true);
    } catch (err) {
      console.error('Error getting PDF URL:', err);
      alert(`Failed to load PDF: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleAnnotate = async () => {
    if (!article.pdf_s3_key) {
      alert('No PDF available for annotation');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:8000/api/v1/s3/get-presigned-url/${article.id}`);
      setPdfUrl(response.data.url);
      setShowAnnotator(true);
    } catch (err) {
      console.error('Error getting PDF URL:', err);
      alert(`Failed to load PDF for annotation: ${err.response?.data?.detail || err.message}`);
    }
  };

  if (!article) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Article Details</h3>
        <div className="article-details">
          <p><strong>DOI:</strong> {article.doi}</p>
          <p><strong>Title:</strong> {article.title}</p>
          <p><strong>Authors:</strong> {article.authors}</p>
          <p><strong>Journal:</strong> {article.journal}</p>
          <p><strong>Status:</strong> {article.status}</p>
          <p><strong>Publication Date:</strong> {article.publication_date || 'Not set'}</p>
          <p><strong>Description:</strong> {article.description || 'No description'}</p>
          <p><strong>Created:</strong> {new Date(article.created_at).toLocaleString()}</p>
          {article.updated_at && (
            <p><strong>Last Updated:</strong> {new Date(article.updated_at).toLocaleString()}</p>
          )}
          <p><strong>PDF Key:</strong> {article.pdf_s3_key || 'No PDF key'}</p>
        </div>
        <div className="modal-actions">
          <button 
            className="btn-view-pdf" 
            onClick={handleViewPDF}
            disabled={!article.pdf_s3_key}
          >
            View PDF
          </button>
          <button 
            className="btn-annotate" 
            onClick={handleAnnotate}
            disabled={!article.pdf_s3_key}
          >
            Annotate
          </button>
          <button 
            className="btn-view-annotations" 
            onClick={() => setShowAnnotations(true)}
            disabled={!article.annotation_data}
          >
            View Annotations
          </button>
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
      {showPDF && pdfUrl && (
        <PDFViewer pdfUrl={pdfUrl} onClose={() => setShowPDF(false)} />
      )}
      {showAnnotator && pdfUrl && (
        <div className="annotator-modal">
          <div className="annotator-header">
            <h3>PDF Annotator</h3>
            <button className="btn-close" onClick={() => setShowAnnotator(false)}>Close</button>
          </div>
          <div className="annotator-content">
            <PdfViewer fileURL={pdfUrl} />
          </div>
        </div>
      )}
      {showAnnotations && article.annotation_data && (
        <JsonViewer 
          data={article.annotation_data} 
          onClose={() => setShowAnnotations(false)} 
        />
      )}
    </div>
  );
};

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [showAnnotator, setShowAnnotator] = useState(false);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/article-queue');
        setArticles(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handleView = (articleId) => {
    const article = articles.find(a => a.id === articleId);
    setSelectedArticle(article);
  };

  const handleAnnotate = async (articleId) => {
    const article = articles.find(a => a.id === articleId);
    if (!article.pdf_s3_key) {
      alert('No PDF available for annotation');
      return;
    }
    try {
      // Set the selected article and show annotator
      setSelectedArticle(article);
      setShowAnnotator(true);
    } catch (err) {
      console.error('Error setting up annotator:', err);
      alert(`Failed to load annotator: ${err.message}`);
    }
  };

  if (loading) return <div>Loading articles...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="article-list">
      <h2>Article Queue</h2>
      <div className="article-table">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Authors</th>
              <th>Journal</th>
              <th>Status</th>
              <th>S3 Key</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <div className="article-title">
                    {article.title}
                    {article.doi && <div className="article-doi">DOI: {article.doi}</div>}
                  </div>
                </td>
                <td>{article.authors}</td>
                <td>{article.journal}</td>
                <td>
                  <span className={`status-badge ${article.status}`}>
                    {article.status}
                  </span>
                </td>
                <td>
                  <span className={`s3-key ${article.pdf_s3_key ? 'has-key' : 'no-key'}`}>
                    {article.pdf_s3_key || 'No key'}
                  </span>
                </td>
                <td>{new Date(article.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-view" onClick={() => handleView(article.id)}>
                    View
                  </button>
                  <button 
                    className="btn-annotate"
                    onClick={() => handleAnnotate(article.id)}
                    disabled={!article.pdf_s3_key}
                  >
                    Annotate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Separate the view modal from the annotator modal */}
      {selectedArticle && !showAnnotator && (
        <ArticleView 
          article={selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}

      {showAnnotator && selectedArticle && (
        <div className="annotator-modal">
          <div className="annotator-header">
            <h3>PDF Annotator</h3>
            <button className="btn-close" onClick={() => {
              setShowAnnotator(false);
              setSelectedArticle(null);
            }}>Close</button>
          </div>
          <div className="annotator-content">
            <PdfViewer 
              pdfS3Key={selectedArticle.pdf_s3_key}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleList; 