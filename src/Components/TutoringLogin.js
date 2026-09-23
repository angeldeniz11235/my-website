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
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-4 flex items-center justify-between select-none">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-base shadow-sm">
              🤖
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                AGY Tutoring Workspace
              </h1>
              <p className="text-[11px] text-slate-400">
                Godot Tutor & Lesson System
              </p>
            </div>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-full">
            v1.2.8
          </span>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white mb-1">
              Student Sign In
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your machine username to initialize your interactive chat tutor & Godot workspace.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-red-950/70 border border-red-500/40 rounded-xl text-red-300 text-xs leading-relaxed flex items-start space-x-2">
              <span className="text-base">⚠️</span>
              <span className="flex-1">{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. russell"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl px-4 py-3 text-sm placeholder-slate-500 outline-none transition-all font-sans"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-xs tracking-wider transition-all duration-150 uppercase shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span>Initialize Workspace Session</span>
              <span>→</span>
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span>High-Rollers Project</span>
            <a
              href="/admin"
              className="text-emerald-400 hover:underline font-medium"
            >
              Admin Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TutoringLogin;
