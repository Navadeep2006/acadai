import { useState, useEffect, useCallback } from 'react';
import { getUser, clearAuth } from './api';
import LoginPage from './pages/LoginPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';

export default function App() {
  const [user, setUser] = useState(getUser);

  const handleLogin = useCallback((u) => setUser(u), []);

  const handleLogout = useCallback(async () => {
    clearAuth();
    setUser(null);
  }, []);

  if (!user) return <LoginPage onLogin={handleLogin} />;
  if (user.role === 'teacher') return <TeacherDashboard user={user} onLogout={handleLogout} />;
  return <StudentDashboard user={user} onLogout={handleLogout} />;
}
