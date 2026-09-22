import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function TutoringTerminal() {
  const [user, setUser] = useState('russell');
  const [inputCommand, setInputCommand] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = sessionStorage.getItem('tutoring_user');
    if (savedUser !== 'russell') {
      navigate('/tutoring/login');
    } else {
      setUser('russell');
      setMessages([
        {
          type: 'system',
          text: `================================================================================\nGoogle Antigravity (AGY) Interactive Terminal v1.2.8\nUser: russell @ angeld.xyz\nHost: c529072316.servercheap.net [107.152.35.192]\nType your prompt below to communicate with the AGY agent.\nTerminal commands: 'help', 'clear', 'whoami', 'logout'\n================================================================================`,
          time: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, [navigate]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleLogout = () => {
    sessionStorage.removeItem('tutoring_user');
    navigate('/tutoring/login');
  };

  const executeCommand = async (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add command to history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Add user prompt to messages log
    const userMsg = {
      type: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputCommand('');

    // Check for built-in client commands
    const cmdLower = trimmed.toLowerCase();
    if (cmdLower === 'clear') {
      setMessages([]);
      return;
    }

    if (cmdLower === 'help') {
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: `AGY Terminal Help:\n  • Ask any question or command to the AGY AI Agent\n  • clear     - Clear terminal logs\n  • whoami    - Display current machine user info\n  • help      - Show this help menu\n  • logout    - End tutoring session`,
          time: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    if (cmdLower === 'whoami') {
      setMessages((prev) => [
        ...prev,
        {
          type: 'system',
          text: `User: ${user}\nHost: c529072316.servercheap.net (107.152.35.192)\nSession: Active Tutoring Environment`,
          time: new Date().toLocaleTimeString()
        }
      ]);
      return;
    }

    if (cmdLower === 'exit' || cmdLower === 'logout') {
      handleLogout();
      return;
    }

    // Call backend API endpoint to communicate with AGY agent on server
    setIsLoading(true);
    try {
      const response = await axios.post('/api/tutoring/chat', {
        username: user,
        prompt: trimmed
      });

      if (response.data && response.data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            type: 'agent',
            text: response.data.response,
            time: new Date().toLocaleTimeString()
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: 'error',
            text: response.data.error || 'An error occurred while communicating with AGY agent.',
            time: new Date().toLocaleTimeString()
          }
        ]);
      }
    } catch (err) {
      console.error('API Error:', err);
      const errMsg = err.response?.data?.error || err.message || 'Network / Server Error';
      setMessages((prev) => [
        ...prev,
        {
          type: 'error',
          text: `[AGY_EXECUTION_ERROR]: ${errMsg}`,
          time: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(inputCommand);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIdx = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
      setHistoryIndex(nextIdx);
      setInputCommand(history[history.length - 1 - nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[history.length - 1 - nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col bg-gray-950 font-mono text-green-400 p-2 sm:p-6 select-text"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Window Container */}
      <div className="flex-1 w-full max-w-6xl mx-auto bg-black border border-green-500/40 rounded-lg shadow-2xl flex flex-col overflow-hidden">
        {/* Top Window Bar */}
        <div className="bg-gray-900 border-b border-green-500/30 px-4 py-2 flex items-center justify-between select-none">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block cursor-pointer" onClick={handleLogout}></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
            <span className="ml-2 text-xs text-gray-400 hidden sm:inline">
              {user}@angeld.xyz: ~ (agy terminal)
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="font-semibold">ONLINE</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-500/50 px-2 py-0.5 rounded transition-all cursor-pointer"
            >
              LOGOUT
            </button>
          </div>
        </div>

        {/* Terminal Content / Logs Area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-mono text-xs sm:text-sm leading-relaxed">
          {messages.map((msg, index) => (
            <div key={index} className="space-y-1">
              {msg.type === 'system' && (
                <div className="text-gray-400 whitespace-pre-wrap border-l-2 border-green-600/50 pl-3 py-1 bg-green-950/10">
                  {msg.text}
                </div>
              )}

              {msg.type === 'user' && (
                <div className="flex items-start space-x-2 text-green-400 font-semibold pt-2">
                  <span className="text-green-500 select-none">{user}@angeld.xyz:~$</span>
                  <span className="text-white bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                    agy &quot;{msg.text}&quot;
                  </span>
                  <span className="text-gray-600 text-xs ml-auto select-none">{msg.time}</span>
                </div>
              )}

              {msg.type === 'agent' && (
                <div className="pl-4 border-l-2 border-cyan-500/60 bg-gray-950/80 p-3 rounded-r border-t border-b border-r border-cyan-500/20 text-cyan-200">
                  <div className="text-xs text-cyan-400 font-bold mb-1 flex items-center justify-between select-none">
                    <span>AGY AGENT RESPONSE</span>
                    <span className="text-gray-500 font-normal">{msg.time}</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed text-gray-200 font-mono text-xs sm:text-sm">
                    {msg.text}
                  </div>
                </div>
              )}

              {msg.type === 'error' && (
                <div className="pl-4 border-l-2 border-red-500 bg-red-950/30 p-3 rounded-r text-red-400 text-xs">
                  {msg.text}
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex items-center space-x-3 text-yellow-400 pl-4 py-2 border-l-2 border-yellow-500/60 bg-yellow-950/10">
              <span className="animate-spin text-sm">⠋</span>
              <span className="text-xs tracking-wider">Executing AGY agent on 107.152.35.192...</span>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>

        {/* Command Line Input */}
        <div className="bg-gray-900/90 border-t border-green-500/30 p-3 flex items-center space-x-2">
          <span className="text-green-500 font-bold text-xs sm:text-sm select-none">
            {user}@angeld.xyz:~$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={isLoading ? 'AGY agent is processing...' : 'Type command or question for AGY...'}
            className="flex-1 bg-transparent text-green-300 focus:outline-none font-mono text-xs sm:text-sm placeholder-gray-600 disabled:opacity-50"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}

export default TutoringTerminal;
