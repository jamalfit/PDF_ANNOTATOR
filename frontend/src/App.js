import React from 'react';
import ArticleList from './components/ArticleList';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>PDF Segmenter</h1>
      </header>
      <main>
        <ArticleList />
      </main>
    </div>
  );
}

export default App;
