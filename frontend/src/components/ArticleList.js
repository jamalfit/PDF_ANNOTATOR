import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PdfViewer from './PdfViewer';
import './ArticleList.css';

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/article-queue');
        setArticles(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching articles:', err);
        setError('Failed to fetch articles');
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  const handleAnnotateClick = (article) => {
    setSelectedArticle(article);
    setShowAnnotator(true);
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
              <th>DOI</th>
              <th>Status</th>
              <th>PDF</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <div className="article-title">{article.title}</div>
                  <div className="article-doi">{article.doi}</div>
                </td>
                <td>{article.doi}</td>
                <td>
                  <span className={`status-badge ${article.status.toLowerCase()}`}>
                    {article.status}
                  </span>
                </td>
                <td>
                  <span className={`pdf-key ${article.pdf_s3_key ? 'has-pdf' : 'no-pdf'}`}>
                    {article.pdf_s3_key || 'No PDF'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-annotate"
                    onClick={() => handleAnnotateClick(article)}
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

      {showAnnotator && selectedArticle && (
        <div className="modal-overlay">
          <div className="pdf-viewer" style={{
            position: 'relative',
            width: '95%',
            height: '90vh',
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden'
          }}>
            <div className="pdf-header">
              <h3>{selectedArticle.title}</h3>
              <button
                className="btn-close"
                onClick={() => {
                  setShowAnnotator(false);
                  setSelectedArticle(null);
                }}
              >
                Close
              </button>
            </div>
            <div className="annotator-content" style={{
              position: 'relative',
              height: 'calc(100% - 60px)',
              overflow: 'hidden'
            }}>
              <PdfViewer
                pdfS3Key={selectedArticle.pdf_s3_key}
                articleId={selectedArticle.id}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticleList; 