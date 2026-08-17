import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const API_URL = `${window.location.protocol}//${hostname}/api/teller`;
const SOCKET_URL = `${window.location.protocol}//${hostname}`;

export default function TellerDesk() {
  const [user, setUser] = useState(null);
  const [queue, setQueue] = useState([]);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' or 'settings'
  
  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Purpose state
  const [newPurposeName, setNewPurposeName] = useState('');
  const [purposes, setPurposes] = useState([]);

  // Reroute state
  const [rerouteTicket, setRerouteTicket] = useState(null);
  const [rerouteDivisions, setRerouteDivisions] = useState([]);
  const [targetDivisionId, setTargetDivisionId] = useState('');
  const [targetPurposes, setTargetPurposes] = useState([]);
  const [targetPurposeId, setTargetPurposeId] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'teller' && parsedUser.role !== 'admin') {
      navigate('/login');
      return;
    }
    setUser(parsedUser);
    
    // Fetch initial queue
    fetchQueue(parsedUser.division_id);
    
    // Play activation sound on login
    try {
      const initAudio = new Audio('/bell.mp3');
      initAudio.play().catch(console.error);
    } catch(e) {}
    
    // Listen for realtime queue updates
    const socket = io(SOCKET_URL);
    
    const reload = () => fetchQueue(parsedUser.division_id);
    
    // Sync state on socket reconnect
    socket.on('connect', reload);
    
    socket.on('TICKET_CREATED', (data) => {
      if (data && data.division_id === parsedUser.division_id) {
        try {
          const bell = new Audio('/bell.mp3');
          bell.play().catch(console.error);
        } catch(e) {}
      }
      reload();
    });
    socket.on('TICKET_SERVING', reload);
    socket.on('TICKET_COMPLETED', reload);
    socket.on('TICKET_CANCELLED', reload);

    return () => socket.disconnect();
  }, [navigate]);

  const fetchQueue = async (divisionId) => {
    if (!divisionId) return;
    try {
      const res = await axios.get(`${API_URL}/queue/${divisionId}`);
      setQueue(res.data);
      const pRes = await axios.get(`${API_URL}/purposes?division_id=${divisionId}`);
      setPurposes(pRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAccept = async (ticketId) => {
    try {
      await axios.post(`${API_URL}/ticket/${ticketId}/accept`, { teller_id: user.id });
      fetchQueue(user.division_id);
    } catch (err) {
      alert('Could not accept ticket. It might have been cancelled or taken.');
    }
  };

  const handleComplete = async (ticketId) => {
    try {
      await axios.post(`${API_URL}/ticket/${ticketId}/complete`);
      fetchQueue(user.division_id);
    } catch (err) {
      alert('Could not complete ticket.');
    }
  };

  const handleExport = () => {
    window.open(`${API_URL}/export/${user.division_id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return alert("New passwords don't match");
    try {
      await axios.put(`${window.location.protocol}//${window.location.hostname}/api/auth/teller/password`, {
        user_id: user.id,
        old_password: oldPassword,
        new_password: newPassword
      });
      alert('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch(err) {
      alert(err.response?.data?.error || 'Error updating password');
    }
  };

  const handleCreatePurpose = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/purposes`, {
        name: newPurposeName,
        division_id: user.division_id
      });
      alert('Purpose created successfully!');
      setNewPurposeName('');
      fetchQueue(user.division_id);
    } catch(err) {
      alert('Error creating purpose');
    }
  };

  const handleDeletePurpose = async (purposeId) => {
    if (!window.confirm("Delete this purpose? Note: It cannot be deleted if there are tickets linked to it.")) return;
    try {
      await axios.delete(`${API_URL}/purposes/${purposeId}`);
      fetchQueue(user.division_id);
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting purpose');
    }
  };

  const openRerouteModal = async (ticket) => {
    setRerouteTicket(ticket);
    try {
      const res = await axios.get(`${window.location.protocol}//${hostname}/api/kiosk/divisions`);
      setRerouteDivisions(res.data.filter(d => d.id !== user.division_id));
      setTargetDivisionId('');
      setTargetPurposes([]);
      setTargetPurposeId('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTargetDivisionChange = async (e) => {
    const divId = e.target.value;
    setTargetDivisionId(divId);
    setTargetPurposeId('');
    if (!divId) {
      setTargetPurposes([]);
      return;
    }
    try {
      const res = await axios.get(`${window.location.protocol}//${hostname}/api/kiosk/purposes/${divId}`);
      setTargetPurposes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const confirmReroute = async () => {
    if (!targetDivisionId || !targetPurposeId) {
      alert('Please select both division and purpose.');
      return;
    }
    try {
      await axios.post(`${API_URL}/ticket/${rerouteTicket.id}/reroute`, {
        target_division_id: targetDivisionId,
        target_purpose_id: targetPurposeId
      });
      alert('Ticket rerouted successfully.');
      setRerouteTicket(null);
      fetchQueue(user.division_id);
    } catch (err) {
      alert(err.response?.data?.error || 'Error rerouting ticket.');
    }
  };

  if (!user) return null;

  const servingTickets = queue.filter(t => t.status === 'SERVING');
  const waitingTickets = queue.filter(t => t.status === 'IN_QUEUE');

  const TellerTicketCard = ({ t, isServing, onAction }) => (
    <div className={`w-full max-w-sm rounded-2xl p-6 shadow-md flex flex-col justify-between border-l-8 ${isServing ? 'bg-blue-600 text-white border-blue-400' : 'bg-white text-gray-800 border-gray-400 border border-t-0 border-b-0 border-r-0 shadow-lg'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className={`text-sm uppercase tracking-widest font-bold ${isServing ? 'text-blue-200' : 'text-gray-500'}`}>
            {isServing ? 'Now Serving' : 'Waiting In Queue'}
          </div>
          <div className={`text-5xl font-black mt-1 ${isServing ? 'text-white' : 'text-gray-800'}`}>
            {t.ticket_number}
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${isServing ? 'bg-white text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
          {t.customer_type}
        </div>
      </div>
      
      <div className="flex flex-col gap-1 mb-6 text-sm">
        {t.customer_name && (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isServing ? 'text-blue-200' : 'text-gray-500'}`}>Name:</span>
            <span className={`text-lg font-bold ${isServing ? 'text-white' : 'text-gray-900'}`}>{t.customer_name}</span>
          </div>
        )}
        {t.purpose && (
          <div className="flex items-center gap-2">
            <span className={`font-bold ${isServing ? 'text-blue-200' : 'text-gray-500'}`}>Purpose:</span>
            <span className={`text-lg font-medium ${isServing ? 'text-white' : 'text-gray-900'}`}>{t.purpose}</span>
          </div>
        )}
        {t.additional_info && (
          <div className="flex items-start gap-2 mt-2">
            <span className={`font-bold ${isServing ? 'text-blue-200' : 'text-gray-500'}`}>Note:</span>
            <span className={`italic break-words text-md ${isServing ? 'text-blue-100' : 'text-gray-700'}`}>{t.additional_info}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <button 
          onClick={() => onAction(t.id)}
          className={`w-full font-bold text-lg py-3 rounded-xl transition ${isServing ? 'bg-white text-blue-600 hover:bg-gray-100 shadow-lg' : 'bg-green-500 text-white hover:bg-green-600 shadow-md'}`}
        >
          {isServing ? 'Finish Ticket' : 'Call Next'}
        </button>
        {isServing && (
          <button 
            onClick={() => openRerouteModal(t)}
            className="w-full font-bold text-sm py-2 rounded-xl transition bg-blue-700 text-white hover:bg-blue-800 shadow-md border border-blue-500"
          >
            Reroute Ticket
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-blue-900 text-white p-4 flex flex-col md:flex-row justify-between items-start md:items-center shadow-md gap-4">
        <div>
          <h1 className="text-2xl font-bold">Teller Workspace</h1>
          <p className="text-blue-200 text-sm">Division: {user.division_name} | Logged in as: {user.username}</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto justify-end">
          <button onClick={handleLogout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-bold">Logout</button>
        </div>
      </header>
      
      {/* Navigation Bar */}
      <div className="bg-white border-b flex px-6 shadow-sm">
        <button 
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-3 font-bold border-b-2 ${activeTab === 'queue' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-500'}`}
        >
          Queue Operations
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 font-bold border-b-2 ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-blue-500'}`}
        >
          Account Settings
        </button>
      </div>

      <div className="flex-1 p-4 md:p-6 flex flex-col md:flex-row gap-6 overflow-y-auto md:overflow-hidden">
        
        {!user.division_id && (
          <div className="w-full bg-yellow-100 text-yellow-800 p-4 rounded-xl border border-yellow-300 font-bold mb-4 shadow text-center absolute top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-lg">
            Warning: You are logged in without a specific Division Assignment (e.g., as Admin). 
            You will not see any incoming tickets here. Please login with a Teller account (e.g., teller_mib).
          </div>
        )}

        {activeTab === 'queue' ? (
          <>
            {/* Waiting Queue */}
            <div className="w-full md:w-1/2 bg-white shadow rounded-xl flex flex-col min-h-0">
              <div className="bg-gray-100 p-4 border-b rounded-t-xl flex justify-between items-center shrink-0">
                <h2 className="text-xl font-bold text-gray-700">Waiting ({waitingTickets.length})</h2>
                <button onClick={handleExport} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs font-bold">Export All</button>
              </div>
              <div className="flex-1 p-6 overflow-y-auto flex flex-wrap gap-6 items-start bg-gray-50">
                {waitingTickets.map(t => (
                  <TellerTicketCard key={t.id} t={t} isServing={false} onAction={handleAccept} />
                ))}
                {waitingTickets.length === 0 && <p className="text-gray-400 text-center mt-6 w-full italic">No tickets waiting.</p>}
              </div>
            </div>

            {/* Currently Serving */}
            <div className="w-full md:w-1/2 bg-white shadow rounded-xl flex flex-col min-h-0">
              <div className="bg-blue-50 p-4 border-b rounded-t-xl border-blue-100 shrink-0">
                <h2 className="text-xl font-bold text-blue-800">Currently Serving ({servingTickets.length})</h2>
              </div>
              <div className="flex-1 p-6 overflow-y-auto flex flex-wrap gap-6 items-start bg-gray-50">
                {servingTickets.map(t => (
                  <TellerTicketCard key={t.id} t={t} isServing={true} onAction={handleComplete} />
                ))}
                {servingTickets.length === 0 && (
                  <div className="w-full text-center mt-6 text-gray-400 italic">
                    No active tickets right now. Call a ticket from the queue.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Settings Tab */
          <div className="w-full flex flex-col md:flex-row gap-8 items-start mt-10">
            {/* Create Purpose */}
            <div className="w-full md:w-1/2 bg-white p-8 rounded-xl shadow flex flex-col gap-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Add New Purpose</h2>
                <form onSubmit={handleCreatePurpose} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Purpose Name</label>
                    <input 
                      type="text" required className="w-full border p-3 rounded bg-gray-50"
                      placeholder="e.g. Follow-up"
                      value={newPurposeName} onChange={e => setNewPurposeName(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-2">This purpose will automatically be added to the Kiosk for your division ({user.division_name}).</p>
                  </div>
                  <button type="submit" className="bg-green-600 text-white font-bold py-3 rounded mt-2 hover:bg-green-700">Add Purpose</button>
                </form>
              </div>

              <div>
                <h3 className="text-lg font-bold text-gray-700 mb-2 border-b pb-1">Manage Purposes</h3>
                <div className="flex flex-col gap-2 max-h-48 overflow-auto">
                  {purposes.map(p => (
                    <div key={p.id} className="flex justify-between items-center bg-gray-50 p-2 rounded border">
                      <span className="font-bold text-gray-800">{p.name}</span>
                      <button onClick={() => handleDeletePurpose(p.id)} className="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>
                    </div>
                  ))}
                  {purposes.length === 0 && <p className="text-sm text-gray-400">No purposes found.</p>}
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="w-full md:w-1/2 bg-white p-8 rounded-xl shadow">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-2">Change Password</h2>
              <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Current Password</label>
                  <input 
                    type="password" required className="w-full border p-3 rounded bg-gray-50"
                    value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                  <input 
                    type="password" required className="w-full border p-3 rounded bg-gray-50"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                  <input 
                    type="password" required className="w-full border p-3 rounded bg-gray-50"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="bg-blue-600 text-white font-bold py-3 rounded mt-2 hover:bg-blue-700">Update Password</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {rerouteTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Reroute Ticket</h2>
            <p className="text-gray-600 mb-6">Transfer Ticket <strong className="text-gray-900">{rerouteTicket.ticket_number}</strong> to another division.</p>
            
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-1">Destination Division</label>
              <select 
                className="w-full border p-3 rounded bg-gray-50 font-semibold"
                value={targetDivisionId}
                onChange={handleTargetDivisionChange}
              >
                <option value="">-- Select Division --</option>
                {rerouteDivisions.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-1">New Purpose</label>
              <select 
                className="w-full border p-3 rounded bg-gray-50 font-semibold disabled:opacity-50"
                value={targetPurposeId}
                onChange={e => setTargetPurposeId(e.target.value)}
                disabled={!targetDivisionId}
              >
                <option value="">-- Select Purpose --</option>
                {targetPurposes.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {!targetDivisionId && <p className="text-xs text-gray-500 mt-1">Select a division first to view its purposes.</p>}
              {targetDivisionId && targetPurposes.length === 0 && <p className="text-xs text-red-500 mt-1">This division has no purposes configured. Rerouting is blocked.</p>}
            </div>

            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setRerouteTicket(null)}
                className="px-4 py-2 font-bold text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button 
                onClick={confirmReroute}
                disabled={!targetDivisionId || !targetPurposeId}
                className="px-4 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
              >
                Confirm Reroute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}