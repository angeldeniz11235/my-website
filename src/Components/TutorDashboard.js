import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TutorDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Password change state
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [settings, setSettings] = useState({
    notification_email: 'angeldeniz11235@gmail.com',
    student_email: 'angeldeniz11235@gmail.com',
    student_email_template_subject: 'New AGY Lesson Ready: Week {week_number} - {lesson_title}',
    student_email_template_body: 'Hi Russell,\n\nYour new lesson for Week {week_number} ({lesson_title}) is ready!\n\nPlease log in to access your lesson plan and interactive chat tutor:\n{login_link}\n\nHappy coding!\nAGY Tutoring System',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: 'angeldeniz11235@gmail.com',
    smtp_pass: ''
  });
  const [emailLogs, setEmailLogs] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Toast / Status banner
  // Delete modal state
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [overrideDelete, setOverrideDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isTestingStudentEmail, setIsTestingStudentEmail] = useState(false);
  const [isPlanningLesson, setIsPlanningLesson] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminPasswordInput) return;
    setIsLoggingIn(true);
    setAdminLoginError('');
    try {
      const res = await axios.post('/api/admin/login', { password: adminPasswordInput });
      if (res.data && res.data.ok) {
        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
        setAdminPasswordInput('');
        fetchDashboardData();
      } else {
        setAdminLoginError(res.data?.error || 'Invalid password.');
      }
    } catch (err) {
      setAdminLoginError(err.response?.data?.error || 'Authentication failed. Incorrect password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    setIsAuthenticated(false);
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!pwdCurrent || !pwdNew) {
      showToast('error', 'Please enter both current and new passwords.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      showToast('error', 'New passwords do not match.');
      return;
    }
    setIsUpdatingPwd(true);
    try {
      const res = await axios.post('/api/admin/update-password', {
        current_password: pwdCurrent,
        new_password: pwdNew
      });
      if (res.data && res.data.ok) {
        showToast('success', 'Admin password updated successfully!');
        setPwdCurrent('');
        setPwdNew('');
        setPwdConfirm('');
      } else {
        showToast('error', res.data?.error || 'Failed to update password.');
      }
    } catch (err) {
      showToast('error', err.response?.data?.error || 'Failed to update password.');
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [lessRes, agentRes, setRes, subRes, logRes] = await Promise.all([
        axios.get('/api/admin/lessons'),
        axios.get('/api/admin/agents'),
        axios.get('/api/admin/settings'),
        axios.get('/api/admin/submissions'),
        axios.get('/api/admin/email-logs')
      ]);

      if (lessRes.data && lessRes.data.ok) {
        setLessons(lessRes.data.lessons);
        if (lessRes.data.lessons.length > 0) {
          setSelectedLesson(lessRes.data.lessons[0]);
        }
      }
      if (agentRes.data && agentRes.data.ok) {
        setAgentConfigs(agentRes.data.agents);
      }
      if (setRes.data && setRes.data.ok) {
        setSettings(setRes.data.settings);
      }
      if (subRes.data && subRes.data.ok) {
        setSubmissions(subRes.data.submissions);
      }
      if (logRes.data && logRes.data.ok) {
        setEmailLogs(logRes.data.logs);
      }
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    }
  };

  // Delete Lesson Handler
  const handleDeleteLesson = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await axios.post('/api/admin/lessons/delete', {
        lesson_id: confirmDeleteId,
        override: overrideDelete
      });

      if (res.data && res.data.ok) {
        showToast('success', 'Lesson plan deleted successfully.');
        setConfirmDeleteId(null);
        setOverrideDelete(false);
        setSelectedLesson(null);
        fetchDashboardData();
      } else if (res.data && res.data.requires_override) {
        showToast('error', res.data.message || 'Deletion blocked: lesson has submitted/verified work or is approved. Check override box to force delete.');
      } else {
        showToast('error', res.data?.error || 'Failed to delete lesson.');
      }
    } catch (err) {
      showToast('error', 'Failed to delete lesson.');
    } finally {
      setIsDeleting(false);
    }
  };

  const showToast = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
  };

  // Set as current lesson state
  const [setAsCurrentOnApprove, setSetAsCurrentOnApprove] = useState(true);
  const [sendStudentEmailOnApprove, setSendStudentEmailOnApprove] = useState(true);

  // Set Current Lesson
  const handleSetCurrentLesson = async (lessonId) => {
    try {
      const res = await axios.post('/api/admin/lessons/set-current', { lesson_id: lessonId });
      if (res.data && res.data.ok) {
        showToast('success', 'Set as Current Active Lesson!');
        fetchDashboardData();
      } else {
        showToast('error', res.data?.error || 'Failed to set current lesson.');
      }
    } catch (e) {
      showToast('error', e.response?.data?.error || 'Failed to set current lesson.');
    }
  };

  // Save Agent Prompts
  const handleSaveAgent = async (agentName, updatedPrompt, updatedModel) => {
    setIsSaving(true);
    try {
      const res = await axios.post('/api/admin/agents/update', {
        agent_name: agentName,
        system_prompt: updatedPrompt,
        model: updatedModel
      });
      if (res.data && res.data.ok) {
        showToast('success', `Updated system prompt for ${agentName} agent!`);
        fetchDashboardData();
      }
    } catch (e) {
      showToast('error', 'Failed to update agent settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Approve Lesson
  const handleApproveLesson = async (lessonId) => {
    try {
      const res = await axios.post('/api/admin/lessons/approve', {
        lesson_id: lessonId,
        set_current: setAsCurrentOnApprove,
        send_student_email: sendStudentEmailOnApprove
      });
      if (res.data && res.data.ok) {
        let msg = 'Lesson approved and published!';
        if (res.data.email_sent) {
          msg += ' ✉ Notification email sent to student!';
        } else if (res.data.email_error) {
          msg += ` (Email notice: ${res.data.email_error})`;
        }
        showToast('success', msg);
        fetchDashboardData();
      }
    } catch (e) {
      showToast('error', 'Failed to approve lesson.');
    }
  };

  // Trigger Lesson Planner Agent manually
  const handleTriggerPlanner = async () => {
    setIsPlanningLesson(true);
    try {
      const res = await axios.post('/api/admin/trigger-planner');
      if (res.data && res.data.ok) {
        showToast('success', `Generated new lesson! Verification email sent to ${settings.notification_email}`);
        fetchDashboardData();
      }
    } catch (e) {
      showToast('error', 'Error running Lesson Planner Agent.');
    } finally {
      setIsPlanningLesson(false);
    }
  };

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const res = await axios.post('/api/admin/settings/update', { settings });
      if (res.data && res.data.ok) {
        showToast('success', 'System & SMTP settings saved successfully!');
      }
    } catch (e) {
      showToast('error', 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  // Send Test Student Notification Email
  const handleSendTestStudentEmail = async () => {
    setIsTestingStudentEmail(true);
    try {
      const res = await axios.post('/api/admin/send-test-student-email');
      if (res.data && res.data.ok) {
        showToast('success', `Test student notification email sent to ${settings.student_email || settings.notification_email || 'angeldeniz11235@gmail.com'}!`);
        fetchDashboardData();
      } else {
        showToast('error', res.data?.error || 'Failed to send test student email.');
      }
    } catch (e) {
      showToast('error', 'Failed to send test student email.');
    } finally {
      setIsTestingStudentEmail(false);
    }
  };

  // Send Test Verification Email
  const handleSendTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const res = await axios.post('/api/admin/send-test-email');
      if (res.data && res.data.ok) {
        showToast('success', `Test verification email sent to ${settings.notification_email}!`);
        fetchDashboardData();
      } else {
        showToast('error', res.data.error || 'Email sending failed.');
      }
    } catch (e) {
      showToast('error', 'Failed to send test email.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-4 flex items-center justify-between select-none">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-base shadow-sm">
                🎓
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-wide">
                  Tutor Admin Dashboard
                </h1>
                <p className="text-[11px] text-slate-400">
                  Authentication Required
                </p>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-full">
              Admin Portal
            </span>
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white mb-1">
                Admin Sign In
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your admin password to access lesson generator, agent tuning, and email settings.
              </p>
            </div>

            {adminLoginError && (
              <div className="mb-5 p-3.5 bg-red-950/70 border border-red-500/40 rounded-xl text-red-300 text-xs leading-relaxed flex items-start space-x-2">
                <span className="text-base">⚠️</span>
                <span className="flex-1">{adminLoginError}</span>
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <input
                  type="password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  placeholder="Enter admin password (default: 1234)"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-100 rounded-xl px-4 py-3 text-sm placeholder-slate-500 outline-none transition-all font-sans"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn || !adminPasswordInput}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-xs tracking-wider transition-all duration-150 uppercase shadow-lg shadow-emerald-950/50 cursor-pointer active:scale-[0.98] flex items-center justify-center space-x-2"
              >
                <span>{isLoggingIn ? 'Authenticating...' : 'Sign In to Admin Dashboard'}</span>
                <span>→</span>
              </button>
            </form>

            <div className="mt-8 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
              <span>AGY Tutoring System</span>
              <a href="/tutoring/chat" className="text-emerald-400 hover:underline font-medium">
                Student Portal →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 font-sans text-slate-100 p-4 sm:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      {/* Top Admin Header */}
      <div className="max-w-7xl mx-auto bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-xl shadow-sm">
            🎓
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
              <span>High-Rollers Tutor & Multi-Agent Dashboard</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">Admin</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Manage weekly lessons, fine-tune AI agents, inspect student work, and manage email verifications.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerPlanner}
            disabled={isPlanningLesson}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer flex items-center space-x-2 active:scale-95"
          >
            <span>{isPlanningLesson ? '⏳ Generating Lesson...' : '⚡ Generate Next Lesson'}</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="text-xs text-slate-300 hover:text-red-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Toast Banner */}
      {statusMsg.text && (
        <div
          className={`max-w-7xl mx-auto mb-6 p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg({ type: '', text: '' })} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider flex items-center space-x-2">
              <span>⚠️</span>
              <span>Confirm Delete Lesson Plan</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">Lesson ID {confirmDeleteId}</span>? This action will remove its tasks from the system.
            </p>
            <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-3 text-xs space-y-2">
              <label className="flex items-start space-x-2 text-red-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={overrideDelete}
                  onChange={(e) => setOverrideDelete(e.target.checked)}
                  className="mt-0.5 rounded border-red-500 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span>Override & force delete completed/approved lesson and submitted work</span>
              </label>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => {
                  setConfirmDeleteId(null);
                  setOverrideDelete(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLesson}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow transition-all cursor-pointer flex items-center space-x-1"
              >
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Lesson'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto mb-6 border-b border-slate-800 flex space-x-6 text-sm font-semibold select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 rounded-xl px-4 py-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 rounded-xl px-4 py-2 transition-all cursor-pointer ${
            activeTab === 'lessons'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📚 Lesson Plans Manager
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 rounded-xl px-4 py-2 transition-all cursor-pointer ${
            activeTab === 'submissions'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📝 Work Submissions
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-3 rounded-xl px-4 py-2 transition-all cursor-pointer ${
            activeTab === 'agents'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🤖 Agent Tuning & Prompts
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`pb-3 rounded-xl px-4 py-2 transition-all cursor-pointer ${
            activeTab === 'email'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📧 Email & Settings
        </button>
      </div>

      {/* Tab Contents */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 block uppercase">Total Lessons</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">{lessons.length}</span>
              </div>
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 block uppercase">Pending Approval</span>
                <span className="text-2xl font-bold text-yellow-400 mt-1 block">
                  {lessons.filter((l) => l.status === 'pending_approval').length}
                </span>
              </div>
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 block uppercase">Active Student</span>
                <span className="text-2xl font-bold text-cyan-400 mt-1 block">Russell (Win10)</span>
              </div>
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-bold text-slate-400 block uppercase">Weekly Email Target</span>
                <span className="text-xs font-bold text-slate-200 mt-2 block truncate">{settings.notification_email}</span>
              </div>
            </div>

            {/* Active Lesson Summary */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4">
                Current Published Lesson (Week {lessons[0]?.week_number || 1})
              </h2>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-emerald-400">{lessons[0]?.title}</h3>
                  <span className="bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                    {lessons[0]?.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-4">{lessons[0]?.summary}</p>
                <div className="space-y-2">
                  {lessons[0]?.tasks?.map((t, idx) => (
                    <div key={idx} className="text-xs bg-slate-900 p-2.5 rounded border border-slate-800 flex justify-between">
                      <span>Task {idx + 1}: {t.title}</span>
                      <span className="text-emerald-400 font-mono">{t.code_example}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LESSONS MANAGER TAB */}
        {activeTab === 'lessons' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Weekly Lessons</h2>
              {lessons.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLesson(l)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedLesson?.id === l.id
                      ? 'bg-slate-800 border-emerald-500/60'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">Week {l.week_number}: {l.title}</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          l.status === 'active'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : l.status === 'approved'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30'
                            : 'bg-yellow-950 text-yellow-400 border border-yellow-500/30'
                        }`}
                      >
                        {l.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(l.id);
                        }}
                        title="Delete Lesson"
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/60 px-2 py-0.5 border border-red-500/30 rounded cursor-pointer select-none transition-all"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{l.summary}</p>
                  <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-800/60" onClick={(e) => e.stopPropagation()}>
                    <label
                      className={`flex items-center space-x-1.5 text-[11px] select-none ${
                        l.status === 'pending_approval' ? 'opacity-40 cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-300'
                      }`}
                      title={l.status === 'pending_approval' ? 'Approve lesson plan to enable setting as Current Lesson' : 'Set as Current Active Lesson'}
                    >
                      <input
                        type="checkbox"
                        checked={l.status === 'active'}
                        disabled={l.status === 'pending_approval'}
                        onChange={() => handleSetCurrentLesson(l.id)}
                        className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 disabled:cursor-not-allowed cursor-pointer"
                      />
                      <span className={l.status === 'active' ? 'font-bold text-emerald-400' : ''}>
                        {l.status === 'active' ? '⭐ Current Lesson' : 'Current Lesson'}
                      </span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-8 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg">
              {selectedLesson ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Week {selectedLesson.week_number}: {selectedLesson.title}
                      </h3>
                      <span className="text-xs text-slate-400">Max Workload: {selectedLesson.max_minutes} Mins (Constraint: &lt;=90 mins)</span>
                    </div>

                    {selectedLesson.status === 'pending_approval' ? (
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={setAsCurrentOnApprove}
                              onChange={(e) => setSetAsCurrentOnApprove(e.target.checked)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Set as Current Lesson</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={sendStudentEmailOnApprove}
                              onChange={(e) => setSendStudentEmailOnApprove(e.target.checked)}
                              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span>Email Student ({settings.student_email || 'angeldeniz11235@gmail.com'})</span>
                          </label>
                        </div>
                        <button
                          onClick={() => handleApproveLesson(selectedLesson.id)}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow cursor-pointer transition-all select-none"
                        >
                          ✓ Approve & Publish Lesson
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`flex items-center space-x-1.5 text-xs select-none bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 ${
                          selectedLesson.status === 'pending_approval' ? 'opacity-40 cursor-not-allowed text-slate-500' : 'cursor-pointer text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedLesson.status === 'active'}
                          disabled={selectedLesson.status === 'pending_approval'}
                          onChange={() => handleSetCurrentLesson(selectedLesson.id)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className={selectedLesson.status === 'active' ? 'font-bold text-emerald-400' : ''}>
                          {selectedLesson.status === 'active' ? '⭐ Current Active Lesson' : 'Set as Current Lesson'}
                        </span>
                      </label>
                    )}

                    <button
                      onClick={() => setConfirmDeleteId(selectedLesson.id)}
                      className="bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center space-x-1"
                    >
                      <span>🗑</span>
                      <span>Delete Lesson</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Lesson Summary</label>
                    <textarea
                      value={selectedLesson.summary || ''}
                      onChange={(e) => setSelectedLesson({ ...selectedLesson, summary: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                      rows={3}
                    />
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasks ({selectedLesson.tasks?.length || 0})</h4>
                    {selectedLesson.tasks?.map((t, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">Task {idx + 1}: {t.title}</span>
                        </div>
                        <p className="text-xs text-slate-300">{t.description}</p>
                        <code className="block bg-slate-900 p-2 rounded text-xs font-mono text-emerald-300">{t.code_example}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-12">Select a lesson on the left to edit or approve.</div>
              )}
            </div>
          </div>
        )}

        {/* SUBMISSIONS TAB */}
        {activeTab === 'submissions' && (
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Russell&apos;s Work Review & Submissions Log</h2>
            <div className="space-y-3">
              {submissions.map((s, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400">Student: {s.student_username} (Lesson Week {s.lesson_id})</span>
                    <span className="text-slate-500">{new Date(s.submitted_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-300 whitespace-pre-wrap">{s.reviewer_feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AGENTS TUNING TAB */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-2">
                Multi-Agent System Prompt & Model Fine-Tuning
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                Fine-tune system prompts, personas, and underlying AI models for all 3 agents in the tutoring pipeline.
              </p>

              <div className="space-y-6">
                {agentConfigs.map((agent) => (
                  <div key={agent.agent_name} className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                          Agent: {agent.agent_name}
                        </span>
                        <span className="text-xs text-slate-400">{agent.role_description}</span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <select
                          value={agent.model}
                          onChange={(e) => {
                            const updated = agentConfigs.map((a) =>
                              a.agent_name === agent.agent_name ? { ...a, model: e.target.value } : a
                            );
                            setAgentConfigs(updated);
                          }}
                          className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                        >
                          <option value="gemini-3.8-flash-high">Gemini 3.8 Flash (High)</option>
                          <option value="gemini-3.7-flash-high">Gemini 3.7 Flash (High)</option>
                          <option value="gemini-3.6-flash-medium">Gemini 3.6 Flash (Medium)</option>
                          <option value="gemini-3.1-pro-high">Gemini 3.1 Pro (High)</option>
                          <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Thinking)</option>
                        </select>

                        <button
                          onClick={() => handleSaveAgent(agent.agent_name, agent.system_prompt, agent.model)}
                          disabled={isSaving}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-all cursor-pointer"
                        >
                          Save Prompt
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">System Prompt</label>
                      <textarea
                        value={agent.system_prompt || ''}
                        onChange={(e) => {
                          const updated = agentConfigs.map((a) =>
                            a.agent_name === agent.agent_name ? { ...a, system_prompt: e.target.value } : a
                          );
                          setAgentConfigs(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                        rows={4}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* EMAIL & SETTINGS TAB */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Weekly Email Verification & SMTP Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Configure notification recipient email (`angeldeniz11235@gmail.com`) and Gmail/SMTP credentials.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tutor Verification / Admin Email</label>
                  <input
                    type="email"
                    value={settings.notification_email || ''}
                    onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Student Notification Email</label>
                  <input
                    type="email"
                    value={settings.student_email || ''}
                    onChange={(e) => setSettings({ ...settings, student_email: e.target.value })}
                    placeholder="e.g. russell@example.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Default Student Email Subject Template</label>
                  <input
                    type="text"
                    value={settings.student_email_template_subject || ''}
                    onChange={(e) => setSettings({ ...settings, student_email_template_subject: e.target.value })}
                    placeholder="New AGY Lesson Ready: Week {week_number} - {lesson_title}"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">
                    Default Student Email Message Template <span className="text-slate-500">(Supports &#123;week_number&#125;, &#123;lesson_title&#125;, &#123;login_link&#125;)</span>
                  </label>
                  <textarea
                    value={settings.student_email_template_body || ''}
                    onChange={(e) => setSettings({ ...settings, student_email_template_body: e.target.value })}
                    rows={4}
                    placeholder="Hi Russell,

Your new lesson for Week {week_number} ({lesson_title}) is ready!

Please log in to access your lesson plan and interactive chat tutor:
{login_link}

Happy coding!
AGY Tutoring System"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtp_host || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SMTP User / Gmail Username</label>
                  <input
                    type="text"
                    value={settings.smtp_user || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">SMTP Password / Gmail App Password</label>
                  <input
                    type="password"
                    value={settings.smtp_pass || ''}
                    onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                    placeholder="Enter App Password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  Save Settings
                </button>

                <button
                  onClick={handleSendTestEmail}
                  disabled={isTestingEmail}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
                >
                  {isTestingEmail ? 'Sending...' : '✉ Send Test Verification Email'}
                </button>

                <button
                  onClick={handleSendTestStudentEmail}
                  disabled={isTestingStudentEmail}
                  className="bg-emerald-700 hover:bg-emerald-600 border border-emerald-500/40 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer shadow"
                >
                  {isTestingStudentEmail ? 'Sending...' : '✉ Send Test Student Notification'}
                </button>
              </div>
            </div>

            {/* Admin Password & Security Settings */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-xl">🔑</span>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                    Admin Password & Security Settings
                  </h3>
                  <p className="text-xs text-slate-400">
                    Update the password required to access the Tutor Admin Dashboard.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">New Password</label>
                  <input
                    type="password"
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-3 flex items-center justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isUpdatingPwd || !pwdCurrent || !pwdNew}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center space-x-2"
                  >
                    <span>{isUpdatingPwd ? 'Updating Password...' : 'Update Admin Password'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Email Logs */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Weekly Email Delivery Logs</h3>
              <div className="space-y-2">
                {emailLogs.map((log, idx) => (
                  <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{log.subject}</span>
                      <span className="text-slate-500">To: {log.recipient}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${log.status === 'sent' ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'}`}>
                        {log.status}
                      </span>
                      <span className="text-[10px] text-slate-500 block mt-1">{new Date(log.sent_at).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TutorDashboard;
