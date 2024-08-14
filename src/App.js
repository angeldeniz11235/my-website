import React, { useState, useEffect } from 'react';
import { fetchHomePageURL } from './services/api';

function App() {
  const [homepageURL, setHomepageURL] = useState('');

  useEffect(() => {
    fetchHomePageURL()
      .then((url) => {
        setHomepageURL(url);
      })
      .catch((error) => {
        console.error('Error fetching homepage URL:', error);
      });
  }, []);

  return (
    <div>
      <h1>My Website</h1>
      <p>Homepage URL: {homepageURL}</p>
    </div>
  );
}

export default App;
