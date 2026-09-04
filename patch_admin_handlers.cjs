const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const handlers = `
  const handleDeleteUser = async (userId: string) => {
    setUserActionLoading(true);
    try {
      const res = await fetch(\`/api/admin/students/\${userId}\`, {
        method: 'DELETE',
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success) {
        showNotification('User deleted successfully');
        setUserToDelete(null);
        fetchStudents(true);
      } else {
        showNotification(data.error || 'Failed to delete user', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setUserActionLoading(false);
    }
  };

  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      showNotification('Password must be at least 6 characters', 'error');
      return;
    }
    setUserActionLoading(true);
    try {
      const res = await fetch(\`/api/admin/students/\${userId}/password\`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (data.success) {
        showNotification('Password updated successfully');
        setUserToChangePassword(null);
        setNewPassword('');
      } else {
        showNotification(data.error || 'Failed to update password', 'error');
      }
    } catch (err: any) {
      showNotification(err.message, 'error');
    } finally {
      setUserActionLoading(false);
    }
  };
`;

code = code.replace(
  "  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {\n    setStatusMessage({ text, type });\n    setTimeout(() => {\n      setStatusMessage(null);\n    }, 4000);\n  };\n",
  "  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {\n    setStatusMessage({ text, type });\n    setTimeout(() => {\n      setStatusMessage(null);\n    }, 4000);\n  };\n" + handlers
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
