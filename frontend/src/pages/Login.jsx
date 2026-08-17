import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = `${window.location.protocol}//${window.location.hostname}/api/auth`;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/login`, { username, password });
      // Very basic session storage for demo
      localStorage.setItem('user', JSON.stringify(res.data));
      
      if (res.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/teller');
      }
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">System Login</h1>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-center text-sm">{error}</div>}
        
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Username</label>
            <input 
              type="text"
              required
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Password</label>
            <input 
              type="password"
              required
              className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg mt-4 hover:bg-blue-700 transition">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
