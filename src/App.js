import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Login from './Components/Login';
import ProtectedRoute from './Components/ProtectedRoute';
import { fetchHomePageURL, getImageUrls } from './services/api';
import MoviePlayer from './Components/MoviePlayer';
import TutoringLogin from './Components/TutoringLogin';
import TutoringTerminal from './Components/TutoringTerminal';

function MainLayout({ children, backgroundImgURL, homepageURL }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: `url(${backgroundImgURL})`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center'
      }}
    >
      <nav className="bg-gray-800 p-4">
        <ul className="flex justify-around">
          <li><a href={homepageURL} className="text-white">Home</a></li>
          <li><a href="#about" className="text-white">About</a></li>
          <li><a href="#services" className="text-white">Services</a></li>
          <li><a href="#contact" className="text-white">Contact</a></li>
          <li><Link to="/admin" className="text-white">Admin</Link></li>
        </ul>
      </nav>
      <div className="flex-grow flex items-center justify-center bg-black bg-opacity-50">
        {children}
      </div>
    </div>
  );
}

function App() {
  const [backgroundImgURL, setBackgroundImgURL] = useState('');
  const [homepageURL, setHomepageURL] = useState('');
  const [auth, setAuth] = useState(false);

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
      const bgImgURLs = await getImageUrls('global-value', 'background');
      console.log(bgImgURLs);
      // Set the background image URL state to the 'large' format
      console.log(bgImgURLs?.large);
      setBackgroundImgURL(bgImgURLs?.large);
    })();
  }, []);

  return (
    <Router>
      <Routes>
        {/* Dedicated Tutoring Terminal Routes */}
        <Route path="/tutoring/login" element={<TutoringLogin />} />
        <Route path="/tutoring/chat" element={<TutoringTerminal />} />
        <Route path="/tutoring" element={<Navigate to="/tutoring/login" replace />} />

        {/* Default Website Routes */}
        <Route
          path="/*"
          element={
            <MainLayout backgroundImgURL={backgroundImgURL} homepageURL={homepageURL}>
              <Routes>
                <Route path="/login" element={<Login setAuth={setAuth} />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute auth={auth}>
                      <h1 className="text-4xl font-bold text-white">Admin Page</h1>
                    </ProtectedRoute>
                  }
                />
                <Route path="/warfare-2025" element={<MoviePlayer />} />
                <Route path="/" element={<h1 className="text-4xl font-bold text-white">Welcome to My Website</h1>} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
