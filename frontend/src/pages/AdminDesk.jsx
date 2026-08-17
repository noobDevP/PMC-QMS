import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const API_URL = `http://${hostname}/api/admin`;

export default function AdminDesk() {
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState({ 
    tv_idle_seconds: 30, 
    shrink_timeout: 15, 
    collapse_timeout: 30, 
    periodic_return_timer: 0, 
    ads_interval: 10,
    media_mode: 'ads',
    youtube_id: ''
  });
  const [ads, setAds] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [adDuration, setAdDuration] = useState(10);
  const [activeTab, setActiveTab] = useState('system');
  const [tellers, setTellers] = useState([]);
  const [purposes, setPurposes] = useState([]);
  const [divisions, setDivisions] = useState([]);
  
  // New Forms State
  const [newDivision, setNewDivision] = useState({ name: '', prefix: '', tv_id: '1' });
  const [newPurpose, setNewPurpose] = useState({ name: '', division_id: '' });
  const [newTeller, setNewTeller] = useState({ username: '', password: '', division_id: '' });
  
  const [selectedTellerId, setSelectedTellerId] = useState('');
  const [newTellerPassword, setNewTellerPassword] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'admin') {
      navigate('/teller');
      return;
    }
    setUser(parsedUser);
    
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    try {
      const setRes = await axios.get(`${API_URL}/settings`);
      setSettings(setRes.data);
      const adsRes = await axios.get(`${API_URL}/ads`);
      setAds(adsRes.data);
      const usersRes = await axios.get(`http://${hostname}/api/auth/users`);
      setTellers(usersRes.data.filter(u => u.role === 'teller'));
      const divRes = await axios.get(`${API_URL}/divisions`);
      setDivisions(divRes.data);
    } catch(err) {
      console.error(err);
    }
  };

  const handleSettingsSave = async () => {
    try {
      await axios.post(`${API_URL}/settings`, settings);
      alert('Settings saved successfully!');
    } catch(err) {
      alert('Error saving settings.');
    }
  };

  const handleAdUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('duration', adDuration);

    try {
      await axios.post(`${API_URL}/ads`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert('Ad uploaded!');
      setSelectedFile(null);
      setAdDuration(10);
      fetchData();
    } catch(err) {
      alert('Error uploading ad.');
    }
  };

  const handleDeleteAd = async (id) => {
    if(!window.confirm('Delete this ad?')) return;
    try {
      await axios.delete(`${API_URL}/ads/${id}`);
      fetchData();
    } catch(err) {
      alert('Error deleting ad.');
    }
  };

  const handleGlobalExport = () => {
    window.open(`${API_URL}/export`);
  };

  const handleGlobalDeleteResolved = async () => {
    if(!window.confirm('WARNING: This will delete ALL resolved and cancelled tickets across ALL divisions. This cannot be undone. Continue?')) return;
    try {
      await axios.delete(`${API_URL}/resolved`);
      alert('All resolved tickets deleted.');
    } catch (err) {
      alert('Error deleting tickets.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleResetTellerPassword = async (e) => {
    e.preventDefault();
    if(!selectedTellerId) return alert('Select a teller');
    if(!window.confirm("Are you sure you want to reset this teller's password?")) return;
    try {
      await axios.post(`http://${hostname}/api/auth/users/${selectedTellerId}/reset`, { password: newTellerPassword });
      alert('Password reset successfully!');
      setSelectedTellerId('');
      setNewTellerPassword('');
    } catch(err) {
      alert('Error resetting password');
    }
  };

  const handleCreateDivision = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/divisions`, newDivision);
      alert('Division created!');
      setNewDivision({ name: '', prefix: '', tv_id: '1' });
      fetchData();
    } catch (err) { alert('Error creating division'); }
  };

  const handleUpdateDivision = async (divId, field, value) => {
    try {
      await axios.put(`${API_URL}/divisions/${divId}`, { [field]: value });
      fetchData();
    } catch (err) { alert('Error updating division'); }
  };

  const handleDeleteDivision = async (divId) => {
    if (!window.confirm("Are you sure you want to delete this Division? This will also permanently delete all Teller Accounts, Purposes, and Tickets associated with it!")) return;
    try {
      await axios.delete(`${API_URL}/divisions/${divId}`);
      fetchData();
    } catch (err) { alert('Error deleting division'); }
  };

  const handleCreatePurpose = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://${hostname}/api/admin/purposes`, newPurpose);
      alert('Purpose created!');
      setNewPurpose({ name: '', division_id: newPurpose.division_id });
      if (newPurpose.division_id) fetchPurposes(newPurpose.division_id);
    } catch (err) { alert('Error creating purpose'); }
  };

  const fetchPurposes = async (divisionId) => {
    try {
      const res = await axios.get(`http://${hostname}/api/kiosk/purposes/${divisionId}`);
      setPurposes(res.data);
    } catch(err) { console.error(err); }
  };

  const handleDeletePurpose = async (purposeId) => {
    if (!window.confirm("Delete this purpose? Note: It cannot be deleted if there are tickets linked to it.")) return;
    try {
      await axios.delete(`http://${hostname}/api/admin/purposes/${purposeId}`);
      if (newPurpose.division_id) fetchPurposes(newPurpose.division_id);
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting purpose');
    }
  };

  const handleCreateTeller = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`http://${hostname}/api/auth/users`, {
        username: newTeller.username,
        password: newTeller.password,
        role: 'teller',
        division_id: newTeller.division_id
      });
      alert('Teller account created!');
      setNewTeller({ username: '', password: '', division_id: '' });
      fetchData();
    } catch (err) { alert('Error creating teller'); }
  };

  const handleDeleteTeller = async () => {
    if (!selectedTellerId) return alert('Please select a teller first');
    if (!window.confirm("Are you sure you want to completely delete this Teller account?")) return;
    try {
      await axios.delete(`http://${hostname}/api/auth/users/${selectedTellerId}`);
      alert('Teller deleted successfully');
      setSelectedTellerId('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting teller');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-gray-900 text-white p-4 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-md text-center sm:text-left">
        <h1 className="text-2xl font-bold">Admin Control Center</h1>
        <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold w-full sm:w-auto">Logout</button>
      </header>

      {/* Navigation Bar */}
      <div className="bg-white border-b flex px-6 shadow-sm overflow-x-auto">
        <button 
          onClick={() => setActiveTab('system')}
          className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap ${activeTab === 'system' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          System & Media Settings
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap ${activeTab === 'users' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Teller Accounts
        </button>
        <button 
          onClick={() => setActiveTab('data')}
          className={`px-4 py-3 font-bold border-b-2 whitespace-nowrap ${activeTab === 'data' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Ticket Management
        </button>
      </div>

      <div className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        
        {activeTab === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* System Settings */}
            <div className="bg-white p-6 rounded-2xl shadow h-fit">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">TV System Settings</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Queue Shrink Timeout (sec)</label>
                <input type="number" className="w-full border p-3 rounded bg-gray-50 focus:border-blue-500 outline-none" 
                  value={settings.shrink_timeout} onChange={(e) => setSettings({...settings, shrink_timeout: parseInt(e.target.value)})} />
                <p className="text-xs text-gray-500 mt-1">Time before queue screen shrinks into Picture-in-Picture.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Collapse Timeout (sec)</label>
                <input type="number" className="w-full border p-3 rounded bg-gray-50 focus:border-blue-500 outline-none" 
                  value={settings.collapse_timeout} onChange={(e) => setSettings({...settings, collapse_timeout: parseInt(e.target.value)})} />
                <p className="text-xs text-gray-500 mt-1">Time before queue fully disappears into Full Screen Ads.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Periodic Return Timer (sec)</label>
                <div className="flex gap-2">
                  <input type="number" className="flex-1 border p-3 rounded bg-gray-50 focus:border-blue-500 outline-none" 
                    value={settings.periodic_return_timer} onChange={(e) => setSettings({...settings, periodic_return_timer: parseInt(e.target.value)})} />
                  <select 
                    className="border p-3 rounded bg-gray-50 font-semibold focus:border-blue-500 outline-none"
                    value={settings.periodic_return_mode || 'full_queue'}
                    onChange={(e) => setSettings({...settings, periodic_return_mode: e.target.value})}
                  >
                    <option value="full_queue">Return to Full Queue</option>
                    <option value="pip">Return to Picture-in-Picture</option>
                  </select>
                </div>
                <p className="text-xs text-gray-500 mt-1">Force queue to pop back up periodically. 0 to disable.</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Default Ads Interval (sec)</label>
                <input type="number" className="w-full border p-3 rounded bg-gray-50 focus:border-blue-500 outline-none" 
                  value={settings.ads_interval} onChange={(e) => setSettings({...settings, ads_interval: parseInt(e.target.value)})} />
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Scrolling Announcement (TV Footer)</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="Enter announcement..." className="flex-1 border p-3 rounded bg-gray-50 focus:border-blue-500 outline-none" 
                    value={settings.announcement || ''} onChange={(e) => setSettings({...settings, announcement: e.target.value})} />
                  <button onClick={() => setSettings({...settings, announcement: ''})} className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded hover:bg-gray-300">
                    Clear
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Displayed in the footer of TV Viewer. Leave blank for none.</p>
              </div>

              <button onClick={handleSettingsSave} className="bg-blue-600 text-white font-bold px-6 py-2 rounded hover:bg-blue-700">
                Save Settings
              </button>
            </div>

            {/* Ad Media Manager */}
            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Ad Media Slideshow</h2>
              
              <div className="mb-6 flex gap-4 border-b pb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="media_mode" checked={settings.media_mode === 'ads'} 
                    onChange={() => setSettings({...settings, media_mode: 'ads'})} />
                  <span className="font-bold text-gray-700">Uploaded Ads Carousel</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="media_mode" checked={settings.media_mode === 'youtube'} 
                    onChange={() => setSettings({...settings, media_mode: 'youtube'})} />
                  <span className="font-bold text-gray-700">YouTube Player</span>
                </label>
              </div>

              {settings.media_mode === 'youtube' ? (
                <div className="mb-6 flex flex-col gap-3 border p-4 rounded bg-gray-50">
                  <label className="text-sm font-bold text-gray-700">YouTube Video ID</label>
                  <input type="text" placeholder="e.g. dQw4w9WgXcQ" className="border p-2 rounded focus:border-blue-500 outline-none w-full"
                    value={settings.youtube_id || ''} onChange={(e) => setSettings({...settings, youtube_id: e.target.value})} />
                  <p className="text-xs text-gray-500">The video will loop automatically when the screen is idle. Remember to click "Save Settings" above.</p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleAdUpload} className="mb-6 flex flex-col md:flex-row gap-3 border p-4 rounded bg-gray-50 items-start md:items-center">
                    <div className="w-full md:w-auto">
                      <input type="file" accept="image/*,video/*" onChange={e => setSelectedFile(e.target.files[0])} className="text-sm w-full" />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                      <label className="text-sm font-bold text-gray-700 whitespace-nowrap">Duration (s):</label>
                      <input type="number" min="1" className="border p-2 rounded w-20" value={adDuration} onChange={e => setAdDuration(e.target.value)} />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded w-full md:w-auto mt-2 md:mt-0">Upload Media</button>
                  </form>

                  <div className="flex flex-col gap-3 max-h-64 overflow-auto">
                    {ads.map(ad => (
                      <div key={ad.id} className="flex justify-between items-center border p-3 rounded bg-gray-50">
                        <div>
                          <div className="font-semibold text-gray-800">{ad.filename}</div>
                          <div className="text-xs text-gray-500 uppercase">{ad.file_type} - {ad.duration}s duration</div>
                        </div>
                        <button onClick={() => handleDeleteAd(ad.id)} className="text-red-500 hover:text-red-700 text-sm font-bold">Delete</button>
                      </div>
                    ))}
                    {ads.length === 0 && <p className="text-gray-400 text-sm">No ads uploaded yet.</p>}
                  </div>
                </>
              )}
            </div>
            
          </div>
        )}

        {activeTab === 'users' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Create Division */}
            <div className="bg-white p-6 rounded-2xl shadow md:col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Create New Division</h2>
              <form onSubmit={handleCreateDivision} className="flex flex-col md:flex-row gap-4 items-center">
                <input type="text" placeholder="Division Name (e.g. Pharmacy)" required className="w-full md:flex-1 border p-3 rounded bg-gray-50"
                  value={newDivision.name} onChange={(e) => setNewDivision({...newDivision, name: e.target.value})} />
                <input type="text" placeholder="Prefix (e.g. PHA)" required className="w-full md:w-48 border p-3 rounded bg-gray-50 uppercase"
                  value={newDivision.prefix} onChange={(e) => setNewDivision({...newDivision, prefix: e.target.value.toUpperCase()})} />
                <select className="w-full md:w-64 border p-3 rounded bg-gray-50" required
                  value={newDivision.tv_id} onChange={(e) => setNewDivision({...newDivision, tv_id: e.target.value})}>
                  {[...Array(10)].map((_, i) => (
                    <option key={i+1} value={i+1}>TV Viewer {i+1}</option>
                  ))}
                </select>
                <button type="submit" className="w-full md:w-auto bg-green-600 text-white font-bold py-3 px-6 rounded hover:bg-green-700">Create Division</button>
              </form>
            </div>

            {/* Create Purpose */}
            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Manage Division Purposes</h2>
              <form onSubmit={handleCreatePurpose} className="flex flex-col gap-4 mb-6">
                <select className="w-full border p-3 rounded bg-gray-50" required
                  value={newPurpose.division_id} onChange={(e) => {
                    setNewPurpose({...newPurpose, division_id: e.target.value});
                    fetchPurposes(e.target.value);
                  }}>
                  <option value="" disabled>Select a Division...</option>
                  {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <input type="text" placeholder="Purpose (e.g. Pickup)" required className="w-full border p-3 rounded bg-gray-50"
                  value={newPurpose.name} onChange={(e) => setNewPurpose({...newPurpose, name: e.target.value})} />
                <button type="submit" className="bg-green-600 text-white font-bold py-3 rounded mt-2 hover:bg-green-700">Create Purpose</button>
              </form>

              {newPurpose.division_id && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-2">Existing Purposes</h3>
                  <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                    {purposes.map(p => (
                      <div key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                        <span className="font-bold text-gray-800 text-sm">{p.name}</span>
                        <button onClick={() => handleDeletePurpose(p.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>
                      </div>
                    ))}
                    {purposes.length === 0 && <p className="text-xs text-gray-400">No purposes found.</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Create Teller */}
            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Create Teller Account</h2>
              <form onSubmit={handleCreateTeller} className="flex flex-col gap-4">
                <input type="text" placeholder="Username" required className="w-full border p-3 rounded bg-gray-50"
                  value={newTeller.username} onChange={(e) => setNewTeller({...newTeller, username: e.target.value})} />
                <input type="password" placeholder="Password" required className="w-full border p-3 rounded bg-gray-50"
                  value={newTeller.password} onChange={(e) => setNewTeller({...newTeller, password: e.target.value})} />
                <select className="w-full border p-3 rounded bg-gray-50" required
                  value={newTeller.division_id} onChange={(e) => setNewTeller({...newTeller, division_id: e.target.value})}>
                  <option value="" disabled>Assign to Division...</option>
                  {divisions.filter(d => !tellers.some(t => t.division_id === d.id)).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  {divisions.filter(d => !tellers.some(t => t.division_id === d.id)).length === 0 && <option value="" disabled>No available divisions</option>}
                </select>
                <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded mt-2 hover:bg-blue-700">Create Teller</button>
              </form>
            </div>

            {/* Manage Divisions List */}
            <div className="bg-white p-6 rounded-2xl shadow md:col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">All Divisions</h2>
              <div className="overflow-x-auto w-full">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="py-2 px-4 text-left font-semibold text-gray-700">Division Name</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-700">Prefix</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-700">Assigned TV Viewer</th>
                      <th className="py-2 px-4 text-left font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divisions.map(d => (
                      <tr key={d.id} className="border-b">
                        <td className="py-2 px-4 text-sm font-bold">{d.name}</td>
                        <td className="py-2 px-4 text-sm font-bold">{d.prefix}</td>
                        <td className="py-2 px-4">
                          <select 
                            className="border p-2 rounded bg-gray-50 w-full text-sm"
                            value={d.tv_id || 1}
                            onChange={(e) => handleUpdateDivision(d.id, 'tv_id', e.target.value)}
                          >
                            {[...Array(10)].map((_, i) => (
                              <option key={i+1} value={i+1}>TV Viewer {i+1}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-4">
                          <button onClick={() => handleDeleteDivision(d.id)} className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reset Teller Password */}
            <div className="bg-white p-6 rounded-2xl shadow">
              <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Reset Teller Password</h2>
              <form onSubmit={handleResetTellerPassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Select Teller Account</label>
                  <select 
                    className="w-full border p-3 rounded bg-gray-50"
                    value={selectedTellerId}
                    onChange={(e) => setSelectedTellerId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Select a Teller...</option>
                    {tellers.map(t => (
                      <option key={t.id} value={t.id}>{t.username}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">New Password (for reset)</label>
                  <input 
                    type="password" 
                    className="w-full border p-3 rounded bg-gray-50"
                    value={newTellerPassword}
                    onChange={(e) => setNewTellerPassword(e.target.value)}
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 mt-2">
                  <button type="submit" className="flex-1 bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700">
                    Reset Password
                  </button>
                  <button type="button" onClick={handleDeleteTeller} className="flex-1 bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700">
                    Delete Teller
                  </button>
                </div>
              </form>
            </div>
            
          </div>
        )}

        {activeTab === 'data' && (
          <div className="bg-white p-6 rounded-2xl shadow">
            <h2 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Global Ticket Management</h2>
            <div className="flex flex-col md:flex-row gap-4">
              <button onClick={handleGlobalExport} className="bg-green-600 text-white font-bold px-6 py-3 rounded shadow hover:bg-green-700 flex-1">
                Export All System Tickets to CSV
              </button>
              <button onClick={handleGlobalDeleteResolved} className="bg-red-800 text-white font-bold px-6 py-3 rounded shadow hover:bg-red-900 border border-red-500 flex-1">
                Purge All Resolved Tickets Now
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4 italic">Note: The background scheduler automatically deletes resolved tickets older than 90 days every night at midnight.</p>
          </div>
        )}

      </div>
    </div>
  );
}
