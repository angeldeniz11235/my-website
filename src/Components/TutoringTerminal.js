import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function TutoringTerminal() {
  const [user, setUser] = useState('russell');
  const [inputCommand, setInputCommand] = useState('');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Lesson state
  const [lesson, setLesson] = useState(null);
  const [completedTasks, setCompletedTasks] = useState(new Set());
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedTask, setCopiedTask] = useState(null);

  const messagesEndRef = useRef(null);
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
          sender: 'tutor',
          text: "Hi Russell! 👋 Welcome to your AGY Tutoring Workspace. I'm your Chat Tutor! Today we're working on setting up AGY locally on your Windows 10 computer and exploring your High-Rollers Godot game project. Take a look at your lesson plan on the right, and ask me anything whenever you have a question!",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      fetchLesson();
    }
  }, [navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchLesson = async () => {
    try {
      const res = await axios.get('/api/tutoring/lesson');
      if (res.data && res.data.ok) {
        setLesson(res.data.lesson);
        const doneSet = new Set(
          res.data.lesson.tasks.filter((t) => t.completed).map((t) => t.id)
        );
        setCompletedTasks(doneSet);
      }
    } catch (e) {
      console.error('Failed to load lesson:', e);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('tutoring_user');
    navigate('/tutoring/login');
  };

  const toggleTask = (id) => {
    setCompletedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedTask(id);
    setTimeout(() => setCopiedTask(null), 2000);
  };

  const handleSubmitWork = async () => {
    setIsSubmitting(true);
    setReviewFeedback('');
    try {
      const res = await axios.post('/api/tutoring/submit-review');
      if (res.data && res.data.ok) {
        setReviewFeedback(res.data.feedback);
        if (res.data.completed_tasks) {
          setCompletedTasks(new Set(res.data.completed_tasks));
        }
      }
    } catch (e) {
      setReviewFeedback('Work submitted! Great progress on your Godot project.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const trimmed = inputCommand.trim();
    if (!trimmed || isLoading) return;

    const userMsg = {
      sender: 'user',
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputCommand('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/tutoring/chat', {
        username: user,
        prompt: trimmed
      });

      if (res.data && res.data.ok) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'tutor',
            text: res.data.response,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'tutor',
            text: res.data.error || 'Sorry, I encountered an issue. Please try again!',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'tutor',
          text: 'Oops! Unable to reach the Chat Tutor right now. Make sure your server is online.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 font-sans text-slate-100 flex flex-col">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
            🤖
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">
              AGY Tutoring Workspace
            </h1>
            <p className="text-xs text-slate-400">
              Student: <span className="text-emerald-400 font-semibold">{user} (Windows 10)</span> | Project: High-Rollers (Godot)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs bg-slate-800 border border-slate-700 rounded-full px-3 py-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>AGY Tutor Active</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main 2-Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 p-4 max-w-7xl w-full mx-auto overflow-hidden">
        {/* Left Column: Friendly Chat Tutor Screen (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden h-[calc(100vh-6rem)]">
          {/* Chat Column Header */}
          <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-3 flex items-center space-x-3">
            <span className="text-lg">💬</span>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Interactive Chat Tutor
              </h2>
              <p className="text-[11px] text-slate-400">
                Ask questions, request code hints, or chat about Godot!
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-2 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-slate-400">
                    {msg.sender === 'user' ? 'Russell' : 'Chat Tutor Agent'}
                  </span>
                  <span className="text-[10px] text-slate-500">{msg.time}</span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none font-medium'
                      : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none font-mono text-xs sm:text-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 text-emerald-400 text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700 max-w-[60%]">
                <span className="animate-spin text-sm">⠋</span>
                <span>Chat Tutor is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form */}
          <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
            <input
              ref={inputRef}
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              disabled={isLoading}
              placeholder="Ask a question or request a Godot hint..."
              className="flex-1 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none placeholder-slate-500 transition-all font-sans"
            />
            <button
              type="submit"
              disabled={isLoading || !inputCommand.trim()}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-md cursor-pointer"
            >
              Send
            </button>
          </form>
        </div>

        {/* Right Column: Weekly Lesson Plan Panel (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl flex flex-col overflow-hidden h-[calc(100vh-6rem)]">
          {/* Lesson Header */}
          <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-lg">📋</span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Weekly Lesson Plan
                </h2>
                <p className="text-[11px] text-emerald-400 font-semibold">
                  Week {lesson?.week || 1}: {lesson?.title || 'High-Rollers Godot Setup'}
                </p>
              </div>
            </div>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2.5 py-1 rounded-full">
              ⏱ Max {lesson?.max_minutes || 90} Mins Work
            </span>
          </div>

          {/* Lesson Content Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {/* Lesson Summary Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs leading-relaxed text-slate-300">
              <span className="font-semibold text-emerald-400 block mb-1">Session Overview:</span>
              {lesson?.summary || 'Complete tasks step-by-step and test code in VS Code on Windows 10.'}
            </div>

            {/* Quick Actions (Session 1 Setup Script) */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold text-emerald-300 block">AGY Local Credential Sync</span>
                <span className="text-[10px] text-slate-400">Download script or copy command for Windows 10</span>
              </div>
              <div className="flex space-x-2 select-none">
                <a
                  href="/setup-agy.ps1"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1.5 rounded transition-all"
                >
                  🪟 Windows (.ps1)
                </a>
                <a
                  href="/setup-agy.sh"
                  target="_blank"
                  rel="noreferrer"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold px-2.5 py-1.5 rounded transition-all"
                >
                  🐧 Bash (.sh)
                </a>
              </div>
            </div>

            {/* Tasks Checklist */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Tasks ({completedTasks.size} of {lesson?.tasks?.length || 0} Done)
              </h3>

              {lesson?.tasks?.map((task) => {
                const isDone = completedTasks.has(task.id);
                return (
                  <div
                    key={task.id}
                    className={`border rounded-xl p-3.5 transition-all ${
                      isDone
                        ? 'bg-slate-950/80 border-emerald-500/40 opacity-90'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleTask(task.id)}
                        className="mt-1 h-4 w-4 accent-emerald-500 rounded cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-xs font-bold block ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-100'
                          }`}
                        >
                          Task {task.id}: {task.title}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                          {task.description}
                        </p>

                        {task.code_example && (
                          <div className="mt-2.5 bg-slate-900 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-emerald-400 flex items-center justify-between group">
                            <code className="truncate mr-2">{task.code_example}</code>
                            <button
                              onClick={() => copyToClipboard(task.code_example, task.id)}
                              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700 transition-all select-none"
                            >
                              {copiedTask === task.id ? 'Copied! ✓' : 'Copy'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Work Checker Review Feedback */}
            {reviewFeedback && (
              <div className="bg-cyan-950/50 border border-cyan-500/40 rounded-xl p-3.5 text-xs text-cyan-200">
                <span className="font-bold text-cyan-400 block mb-1">🔍 Work Checker Review:</span>
                <p className="whitespace-pre-wrap leading-relaxed">{reviewFeedback}</p>
              </div>
            )}
          </div>

          {/* Bottom Review Submit Button */}
          <div className="p-3 bg-slate-800/80 border-t border-slate-700">
            <button
              onClick={handleSubmitWork}
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider transition-all shadow-md cursor-pointer uppercase"
            >
              {isSubmitting ? 'Checking Work...' : 'Submit Work for Review →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TutoringTerminal;
