import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building2, UserCircle2, ArrowRight, XCircle } from 'lucide-react';

const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const API_URL = `${window.location.protocol}//${hostname}/api/kiosk`;

export default function TabletKiosk() {
  const [divisions, setDivisions] = useState([]);
  const [purposes, setPurposes] = useState([]);
  
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [customerType, setCustomerType] = useState('Active');
  const [customerName, setCustomerName] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isDivisionDropdownOpen, setIsDivisionDropdownOpen] = useState(false);
  const [isPurposeModalOpen, setIsPurposeModalOpen] = useState(false);
  
  const [generatedTicket, setGeneratedTicket] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/divisions`).then(res => setDivisions(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    setSelectedDivision('');
    setSelectedPurpose('');
  }, []);

  useEffect(() => {
    if (selectedDivision) {
      axios.get(`${API_URL}/purposes/${selectedDivision}`).then(res => setPurposes(res.data)).catch(console.error);
      setSelectedPurpose('');
      setIsPurposeModalOpen(true);
    }
  }, [selectedDivision]);

  const handleGenerate = async () => {
    try {
      const res = await axios.post(`${API_URL}/ticket`, {
        division_id: selectedDivision,
        purpose_id: selectedPurpose,
        customer_type: customerType,
        customer_name: customerName,
        additional_info: additionalInfo
      });
      setGeneratedTicket(res.data);
    } catch (err) {
      alert('Error generating ticket. Please try again.');
    }
  };

  const handleCancel = async () => {
    if (generatedTicket) {
      try {
        await axios.post(`${API_URL}/ticket/${generatedTicket.id}/cancel`);
        alert('Ticket cancelled successfully.');
        resetKiosk();
      } catch (err) {
        alert('Could not cancel ticket.');
      }
    }
  };

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    let timer;
    if (generatedTicket) {
      timer = setTimeout(() => {
        resetKiosk();
      }, 5000);
    }
    return () => clearTimeout(timer);
  }, [generatedTicket]);

  const resetKiosk = () => {
    setGeneratedTicket(null);
    setSelectedDivision('');
    setSelectedPurpose('');
    setCustomerType('Active');
    setCustomerName('');
    setAdditionalInfo('');
    setHasStarted(false);
  };

  if (!hasStarted) {
    return (
      <div 
        className="min-h-screen bg-[linear-gradient(160deg,#e2e8f0_0%,#f8fafc_25%,#cbd5e1_50%,#f1f5f9_75%,#e2e8f0_100%)] flex flex-col items-center justify-center p-8 cursor-pointer"
        onClick={() => setHasStarted(true)}
      >
        <div className="text-center group hover:scale-105 transition-transform duration-500 ease-in-out -mt-48">
          <div className="flex justify-center mb-10">
            <img src="/logo.png" alt="Logo" className="h-40 w-40 rounded-full object-cover shadow-2xl animate-pulse" />
          </div>
          <h1 className="animate-float text-7xl font-black text-gray-800 mb-6 tracking-widest uppercase drop-shadow-lg group-hover:text-[#4b5320] group-hover:drop-shadow-[0_0_15px_rgba(75,83,32,0.6)] transition-all duration-500">
            Touch to Begin
          </h1>
          <p className="animate-float text-3xl text-gray-600 font-medium tracking-wide" style={{ animationDelay: '0.5s' }}>
            Tap anywhere to get your queue ticket
          </p>
        </div>
      </div>
    );
  }

  if (generatedTicket) {
    return (
      <div className="min-h-screen bg-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <UserCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 uppercase tracking-wide">You're in the queue!</h2>
          <p className="text-gray-500 mb-8 italic">Please wait for your number to be called.</p>
          
          <div className="bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] border-2 border-gray-400 rounded-2xl p-6 mb-8 shadow-inner">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Ticket Number</div>
            <div className="text-6xl font-black text-gray-800 tracking-wider">{generatedTicket.ticket_number}</div>
          </div>
          
          <div className="flex flex-col gap-4">
            <button 
              onClick={resetKiosk}
              className="w-full bg-[linear-gradient(90deg,#64748b_0%,#475569_100%)] text-white font-bold text-xl py-4 rounded-xl shadow-lg hover:opacity-90 transition-all uppercase tracking-wide"
            >
              Done
            </button>
            <button 
              onClick={handleCancel}
              className="w-full bg-red-50 text-red-600 font-bold text-lg py-3 rounded-xl flex items-center justify-center gap-2 border border-red-200 hover:bg-red-100 transition-all uppercase tracking-wide"
            >
              <XCircle size={24} /> Cancel My Ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,#e2e8f0_0%,#f8fafc_25%,#cbd5e1_50%,#f1f5f9_75%,#e2e8f0_100%)] p-8 flex flex-col items-center">
      <div className="w-full max-w-3xl flex-1 flex flex-col justify-center">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4"><img src="/logo.png" alt="Logo" className="h-20 w-20 rounded-full object-cover shadow-lg" /></div>
          <h1 className="text-5xl font-black text-gray-800 mb-4 tracking-widest uppercase">Welcome</h1>
          <p className="text-xl text-gray-600 font-medium">Please select your desired service to get a ticket.</p>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/50 p-8 flex flex-col gap-8">
          
          {/* Transaction Details Label */}
          <h2 className="text-2xl font-black text-gray-700 -mb-2 uppercase tracking-wide">Transaction Details</h2>
          
          {/* Division Selection */}
          <div className="relative">
            <label className="block text-lg font-bold text-gray-600 mb-4 uppercase tracking-wider">Select Division</label>
            <div 
              className="w-full p-4 rounded-xl border-2 border-gray-300 text-xl font-semibold bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] text-gray-800 hover:border-gray-400 shadow-sm outline-none cursor-pointer flex justify-between items-center transition-all"
              onClick={() => setIsDivisionDropdownOpen(!isDivisionDropdownOpen)}
            >
              <span>{selectedDivision ? divisions.find(d => d.id == selectedDivision)?.name : "-- Select Division --"}</span>
              <svg className={`w-6 h-6 text-gray-500 transition-transform ${isDivisionDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
            {isDivisionDropdownOpen && (
              <div className="absolute z-20 w-full mt-2 bg-white border-2 border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto animate-fade-in">
                {divisions.map(d => (
                  <div 
                    key={d.id} 
                    className="p-4 text-xl font-bold text-gray-700 hover:bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] cursor-pointer border-b last:border-b-0 transition-all"
                    onClick={() => {
                      setSelectedDivision(d.id);
                      setIsDivisionDropdownOpen(false);
                    }}
                  >
                    {d.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purpose Selection */}
          {selectedDivision && (
            <div>
              <label className="block text-lg font-bold text-gray-600 mb-4 uppercase tracking-wider">Select Purpose</label>
              <div 
                className="w-full p-6 rounded-2xl border-4 border-gray-200 text-xl font-bold bg-white text-gray-700 hover:border-gray-400 shadow-sm outline-none cursor-pointer flex justify-between items-center transition-all"
                onClick={() => setIsPurposeModalOpen(true)}
              >
                <span>{selectedPurpose ? purposes.find(p => p.id == selectedPurpose)?.name : "-- Tap to Select Purpose --"}</span>
                <span className="text-sm font-bold text-blue-500 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-lg">Change</span>
              </div>

              {isPurposeModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-[100] p-4 md:p-8 backdrop-blur-sm animate-fade-in">
                  <div className="bg-white rounded-3xl shadow-2xl w-full h-full max-w-7xl overflow-hidden flex flex-col">
                    <div className="p-6 md:p-8 border-b flex justify-between items-center bg-gray-50 shrink-0">
                      <h2 className="text-3xl md:text-4xl font-black text-gray-800 uppercase tracking-widest drop-shadow-sm">Select Purpose</h2>
                      <button onClick={() => setIsPurposeModalOpen(false)} className="text-gray-400 hover:text-red-500 transition-colors">
                        <XCircle size={48} />
                      </button>
                    </div>
                    <div className="flex-1 p-6 md:p-8 grid grid-cols-1 gap-6 overflow-y-auto scrollbar-hide bg-gray-100/50 content-start">
                      {purposes.map(p => (
                        <button 
                          key={p.id}
                          onClick={() => {
                            setSelectedPurpose(p.id);
                            setIsPurposeModalOpen(false);
                          }}
                          className={`p-6 rounded-2xl border-4 text-center font-bold text-xl transition-all shadow-sm h-min w-full ${
                            selectedPurpose === p.id ? 'border-gray-500 bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] text-gray-800 scale-[1.02]' : 'border-gray-200 hover:border-gray-400 bg-white text-gray-600 hover:bg-gray-50 hover:scale-[1.01]'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                      {purposes.length === 0 && (
                        <div className="text-center text-gray-500 text-2xl py-20 italic">
                          No purposes available for this division.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional Info Input */}
          <div>
            <label className="block text-lg font-bold text-gray-600 mb-4 uppercase tracking-wider">Additional Information <span className="text-gray-400 font-normal text-sm lowercase tracking-normal">(Optional)</span></label>
            <input 
              type="text"
              placeholder="Enter Details"
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-gray-300 text-xl bg-white focus:border-gray-500 shadow-sm outline-none transition-colors"
            />
          </div>

          <hr className="my-2 border-gray-300" />
          
          {/* Personnel Details Label */}
          <h2 className="text-2xl font-black text-gray-700 -mb-2 uppercase tracking-wide">Personnel Details</h2>

          {/* Full Name Input */}
          <div>
            <label className="block text-lg font-bold text-gray-600 mb-4 uppercase tracking-wider">Enter full name <span className="text-gray-400 font-normal text-sm lowercase tracking-normal">(Optional)</span></label>
            <input 
              type="text"
              placeholder="Juan Dela Cruz"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-4 rounded-xl border-2 border-gray-300 text-xl bg-white focus:border-gray-500 shadow-sm outline-none transition-colors"
            />
          </div>

          {/* Classification */}
          <div>
            <label className="block text-lg font-bold text-gray-600 mb-4 uppercase tracking-wider">Personnel Type</label>
            <div className="grid grid-cols-3 gap-4">
              <button 
                onClick={() => setCustomerType('Active')}
                className={`p-6 rounded-2xl border-4 text-xl font-bold transition-all shadow-sm uppercase tracking-wider ${
                  customerType === 'Active' ? 'border-gray-500 bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] text-gray-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Active
              </button>
              <button 
                onClick={() => setCustomerType('Retired')}
                className={`p-6 rounded-2xl border-4 text-xl font-bold transition-all shadow-sm uppercase tracking-wider ${
                  customerType === 'Retired' ? 'border-gray-500 bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] text-gray-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Retired
              </button>
              <button 
                onClick={() => setCustomerType('Civillian')}
                className={`p-6 rounded-2xl border-4 text-xl font-bold transition-all shadow-sm uppercase tracking-wider ${
                  customerType === 'Civillian' ? 'border-gray-500 bg-[linear-gradient(135deg,#e2e8f0_0%,#cbd5e1_100%)] text-gray-800' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                Civillian
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button 
            disabled={!selectedDivision || !selectedPurpose}
            onClick={handleGenerate}
            className={`mt-4 w-full py-6 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-xl uppercase tracking-widest ${
              (!selectedDivision || !selectedPurpose) 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-[linear-gradient(90deg,#94a3b8_0%,#64748b_100%)] text-white hover:opacity-90 hover:scale-[1.01]'
            }`}
          >
            Get Ticket <ArrowRight size={28} />
          </button>

        </div>
      </div>
    </div>
  );
}
