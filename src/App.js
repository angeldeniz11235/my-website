import React, { useState, useEffect } from 'react';
import { fetchHomePageURL, getImageUrls } from './services/api';

function App() {
  const [homepageURL, setHomepageURL] = useState('');
  const [backgroundImgURL, setBackgroundImgURL] = useState(null);

  useEffect(() => {
    // Fetch the homepage URL
    fetchHomePageURL()
      .then((url) => {
        setHomepageURL(url);
      })
      .catch((error) => {
        console.error('Error fetching homepage URL:', error);
      });

    // Fetch the background image URLs
    (async () => {
      const bgImgURLs = await getImageUrls('home-summary', 'Logo');
      console.log(bgImgURLs);
      // Set the background image URL state to the 'large' format
      console.log(bgImgURLs?.large)
      setBackgroundImgURL(bgImgURLs?.large);
    })();
  }, []);

  return (
    <div 
      style={{ 
        backgroundImage: `url(${backgroundImgURL})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        height: '100vh' 
      }}
    >
      <h1>My Website</h1>
      <p>Homepage URL: {homepageURL}</p>
    </div>
  );
}

export default App;
