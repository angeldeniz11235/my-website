import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TutorDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [lessons, setLessons] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [agentConfigs, setAgentConfigs] = useState([]);
  const [settings, setSettings] = useState({ notification_email: 'angeldeniz11235@gmail.com', smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_user: 'angeldeniz11235@gmail.com', smtp_pass: '' });
  const [emailLogs, setEmailLogs] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Toast / Status banner
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [isPlanningLesson, setIsPlanningLesson] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const showToast = (type, text) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg({ type: '', text: '' }), 4000);
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
      const res = await axios.post('/api/admin/lessons/approve', { lesson_id: lessonId });
      if (res.data && res.data.ok) {
        showToast('success', 'Lesson approved and published for Russell!');
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

  return (
    <div className="min-h-screen w-full bg-slate-950 font-sans text-slate-100 p-4 sm:p-8">
      {/* Top Admin Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🎓</span>
            <h1 className="text-xl font-bold text-white tracking-wide">
              High-Rollers Tutor & Multi-Agent Dashboard
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage weekly lessons, fine-tune AI agents, inspect student work, and manage email verifications.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerPlanner}
            disabled={isPlanningLesson}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer flex items-center space-x-2"
          >
            <span>{isPlanningLesson ? '⏳ Generating Lesson...' : '⚡ Generate Next Lesson'}</span>
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

      {/* Main Navigation Tabs */}
      <div className="max-w-7xl mx-auto mb-6 border-b border-slate-800 flex space-x-6 text-sm font-semibold select-none overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📊 Overview
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'lessons'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📚 Lesson Plans Manager
        </button>
        <button
          onClick={() => setActiveTab('submissions')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'submissions'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          📝 Work Submissions
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'agents'
              ? 'border-emerald-500 text-emerald-400 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          🤖 Agent Tuning & Prompts
        </button>
        <button
          onClick={() => setActiveTab('email')}
          className={`pb-3 border-b-2 transition-all cursor-pointer ${
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
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-bold text-slate-400 block uppercase">Total Lessons</span>
                <span className="text-2xl font-bold text-emerald-400 mt-1 block">{lessons.length}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-bold text-slate-400 block uppercase">Pending Approval</span>
                <span className="text-2xl font-bold text-yellow-400 mt-1 block">
                  {lessons.filter((l) => l.status === 'pending_approval').length}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-bold text-slate-400 block uppercase">Active Student</span>
                <span className="text-2xl font-bold text-cyan-400 mt-1 block">Russell (Win10)</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <span className="text-xs font-bold text-slate-400 block uppercase">Weekly Email Target</span>
                <span className="text-xs font-bold text-slate-200 mt-2 block truncate">{settings.notification_email}</span>
              </div>
            </div>

            {/* Active Lesson Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
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
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
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
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-yellow-950 text-yellow-400 border border-yellow-500/30'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{l.summary}</p>
                </div>
              ))}
            </div>

            <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-6">
              {selectedLesson ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Week {selectedLesson.week_number}: {selectedLesson.title}
                      </h3>
                      <span className="text-xs text-slate-400">Max Workload: {selectedLesson.max_minutes} Mins (Constraint: &lt;=90 mins)</span>
                    </div>

                    {selectedLesson.status === 'pending_approval' && (
                      <button
                        onClick={() => handleApproveLesson(selectedLesson.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg shadow cursor-pointer"
                      >
                        ✓ Approve & Publish Lesson
                      </button>
                    )}
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
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
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Weekly Email Verification & SMTP Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Configure notification recipient email (`angeldeniz11235@gmail.com`) and Gmail/SMTP credentials.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Verification Notification Email</label>
                  <input
                    type="email"
                    value={settings.notification_email || ''}
                    onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
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
              </div>
            </div>

            {/* Email Logs */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
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
