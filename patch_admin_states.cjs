const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

const newStates = `
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [userToChangePassword, setUserToChangePassword] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [userActionLoading, setUserActionLoading] = useState(false);
`;

code = code.replace(
  "const [studentsSearchQuery, setStudentsSearchQuery] = useState<string>('');",
  "const [studentsSearchQuery, setStudentsSearchQuery] = useState<string>('');\n" + newStates
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
