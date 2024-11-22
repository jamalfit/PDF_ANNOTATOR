import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PdfViewer from './PdfViewer';

const ArticleList = () => {
  const [articles, setArticles] = useState([]);
  const [showAnnotator, setShowAnnotator] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/v1/articles');
        setArticles(response.data);
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    };

    fetchArticles();
  }, []);

  return (
    <div>
      <h2>Article List</h2>
      {articles.length ? (
        articles.map((article) => (
          <div key={article.id}>
            <h3>{article.title}</h3>
            <button
              onClick={() => {
                setSelectedArticle(article);
                setShowAnnotator(true);
              }}
            >
              Annotate
            </button>
          </div>
        ))
      ) : (
        <p>No articles found.</p>
      )}

      {showAnnotator && selectedArticle && (
        <div
          className="annotator-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '95%',
              height: '95vh',
              backgroundColor: 'white',
              borderRadius: '8px',
              overflow: 'hidden',
              maxWidth: '1200px'
            }}
          >
            <button
              onClick={() => {
                setShowAnnotator(false);
                setSelectedArticle(null);
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                zIndex: 2,
                padding: '8px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
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