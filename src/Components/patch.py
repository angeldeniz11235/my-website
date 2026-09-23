import sys

path = 'src/Components/TutorDashboard.js'
with open(path, 'r') as f:
    content = f.read()

if 'if (!isAuthenticated)' not in content:
    idx = content.find('  return (')
    if idx != -1:
        login_view = '''  if (!isAuthenticated) {
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

  return ('''
        content = content[:idx] + login_view + content[idx+len('  return ('):]

old_btn = "{isPlanningLesson ? '⏳ Generating Lesson...' : '⚡ Generate Next Lesson'}</span>
          </button>
        </div>"
new_btn = "{isPlanningLesson ? '⏳ Generating Lesson...' : '⚡ Generate Next Lesson'}</span>
          </button>

          <button
            onClick={handleAdminLogout}
            className="text-xs text-slate-300 hover:text-red-400 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-xl transition-all cursor-pointer font-medium shadow-sm"
          >
            Logout
          </button>
        </div>"
if old_btn in content:
    content = content.replace(old_btn, new_btn)

target_logs = '{/* Email Logs */}'
password_card = '''{/* Admin Password & Security Settings */}
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

            {/* Email Logs */}'''

if target_logs in content:
    content = content.replace(target_logs, password_card)

with open(path, 'w') as f:
    f.write(content)

print('Patch applied successfully')
