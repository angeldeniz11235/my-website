import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function TutoringLogin() {
  const [username, setUsername] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect straight to chat terminal
    const savedUser = sessionStorage.getItem('tutoring_user');
    if (savedUser === 'russell') {
      navigate('/tutoring/chat');
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();

    if (cleanUser === 'russell') {
      sessionStorage.setItem('tutoring_user', 'russell');
      setErrorMessage('');
      navigate('/tutoring/chat');
    } else {
      setErrorMessage(`[AUTHENTICATION_FAILED] Invalid machine user "${username}". Access restricted to user "russell".`);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-950 p-4 font-mono text-green-400">
      <div className="w-full max-w-md bg-black border border-green-500/40 rounded-lg shadow-2xl overflow-hidden">
        {/* Terminal Header */}
        <div className="bg-gray-900 border-b border-green-500/30 px-4 py-2 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
          </div>
          <span className="text-xs text-gray-400 font-semibold tracking-wider">
            AGY TERMINAL AUTHENTICATION
          </span>
          <div className="w-12"></div>
        </div>

        {/* Terminal Body */}
        <div className="p-6">
          <div className="mb-6 text-xs text-green-600 border-b border-green-900/50 pb-3">
            <div>SYSTEM: Linux c529072316 2026 x86_64</div>
            <div>AGENT: Google Antigravity (AGY) v1.2.8</div>
            <div>DOMAIN: angeld.xyz/tutoring</div>
          </div>

          <h1 className="text-lg font-bold text-green-400 mb-2">
            Tutoring Terminal Session
          </h1>
          <p className="text-xs text-gray-400 mb-6">
            Please enter your machine username to initialize terminal context.
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-500/50 rounded text-red-400 text-xs leading-relaxed">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-green-500 mb-1">
                login as:
              </label>
              <div className="flex items-center bg-gray-900 border border-green-500/50 rounded px-3 py-2 focus-within:border-green-400">
                <span className="text-green-500 mr-2">$</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. russell"
                  className="bg-transparent text-green-300 w-full focus:outline-none text-sm placeholder-gray-600 font-mono"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-900/40 hover:bg-green-800/60 text-green-300 border border-green-500/60 py-2 rounded text-xs font-bold tracking-wider transition-all duration-150 uppercase active:scale-95 cursor-pointer"
            >
              Initialize Session →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TutoringLogin;
