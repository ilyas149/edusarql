import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLES, login } from '../services/auth';
import { Loader2 } from 'lucide-react';
import '../styles/Login.css';

import Footer from '../components/Footer';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username) {
      setError('Please enter your username');
      return;
    }
    setLoading(true);
    const result = await login(username, password);
    if (result.success) {
      if ((result.role === ROLES.STUDENT || result.role === ROLES.PARENT) && result.studentId) {
        navigate(`/dashboard/students/${result.studentId}`);
      } else {
        navigate('/dashboard');
      }
    } else {
      setError('Invalid username or password');
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card glass">
        <div className="login-header">
          <img src="/img/logo.png" alt="Logo" className="login-logo-img" />
          <h1>EduSarql</h1>
          <p>College Student Management</p>
        </div>
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text"
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="login-input"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              className="login-input"
              required
            />
          </div>

          {error && <div className="error-msg">{error}</div>}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? <><Loader2 className="spin" size={18} /> Verifying...</> : 'Sign In'}
          </button>
        </form>
        <Footer variant="login" />
      </div>
    </div>
  );
};

export default Login;
