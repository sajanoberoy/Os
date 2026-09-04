const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const modals = `
      {/* MODAL: DELETE USER */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-red-50/50">
              <h3 className="font-bold text-red-700 text-lg">Delete User</h3>
              <button onClick={() => setUserToDelete(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                Are you sure you want to permanently delete <strong>{userToDelete.name}</strong> ({userToDelete.email})? 
                This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={userActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(userToDelete.userId)}
                  disabled={userActionLoading}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 border border-transparent transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {userActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Delete User
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL: CHANGE PASSWORD */}
      {userToChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-md flex flex-col shadow-xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-lg">Change Password</h3>
              <button onClick={() => { setUserToChangePassword(null); setNewPassword(''); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Set a new password for <strong>{userToChangePassword.name}</strong> ({userToChangePassword.email}).
              </p>
              
              <div className="mb-6">
                <label className="block text-xs font-semibold text-slate-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 chars)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setUserToChangePassword(null); setNewPassword(''); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
                  disabled={userActionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleChangePassword(userToChangePassword.userId)}
                  disabled={userActionLoading || !newPassword || newPassword.length < 6}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-transparent transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {userActionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Save Password
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
`;

code = code.replace(
  "{/* ========================================================================= */}\n      {/* MODAL 1: ADD NEW SOURCE DOCUMENT */}",
  modals + "\n      {/* ========================================================================= */}\n      {/* MODAL 1: ADD NEW SOURCE DOCUMENT */}"
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
