import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ArticleList.css';

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

const ArticleView = ({ article, onClose }) => {
  const [showPDF, setShowPDF] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);

  const handleViewPDF = async () => {
    try {
      console.log('Article data:', article);
      const response = await axios.get(`http://localhost:8000/api/v1/s3/get-presigned-url/${article.id}`);
      console.log('S3 response:', response.data);
      setPdfUrl(response.data.url);
      setShowPDF(true);
    } catch (err) {
      console.error('Error getting PDF URL:', err);
      alert(`Failed to load PDF: ${err.response?.data?.detail || err.message}`);
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
          <button className="btn-close" onClick={onClose}>Close</button>
        </div>
      </div>
      {showPDF && pdfUrl && (
        <PDFViewer pdfUrl={pdfUrl} onClose={() => setShowPDF(false)} />
      )}
    </div>
  );
};

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/article-queue/');
      console.log('Articles data:', response.data);
      setArticles(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch articles');
      setLoading(false);
      console.error('Error fetching articles:', err);
    }
  };

  const handleView = (articleId) => {
    const article = articles.find(a => a.id === articleId);
    setSelectedArticle(article);
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
                  <button className="btn-edit" onClick={() => console.log('Edit', article.id)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedArticle && (
        <ArticleView 
          article={selectedArticle} 
          onClose={() => setSelectedArticle(null)} 
        />
      )}
    </div>
  );
};

export default ArticleList; 