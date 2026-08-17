import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import axios from 'axios';

const hostname = window.location.hostname === 'localhost' ? '127.0.0.1' : window.location.hostname;
const SOCKET_URL = `${window.location.protocol}//${hostname}`;
const API_URL = `${window.location.protocol}//${hostname}/api/tv`;

const TicketCard = ({ t, isServing, index, stage }) => {
  if (index === 0) {
    return (
      <div className={`rounded-xl flex items-center justify-between transform transition-all shadow-2xl scale-[1.02] border border-gray-100 ${stage === 2 ? 'p-1.5' : 'p-4'} ${isServing ? 'bg-white text-gray-900 animate-bounce-short border-l-8 border-l-gray-800' : 'bg-gray-50 text-gray-800 border-l-8 border-l-gray-400'}`}>
        <div>
          <div className={`font-bold uppercase tracking-widest ${stage === 2 ? 'text-[8px]' : 'text-xs'} ${isServing ? 'text-gray-500' : 'text-gray-500'}`}>
            {t.customer_type} • {t.division_name}
          </div>
          <div className={`font-black mt-1 mb-1 drop-shadow-sm ${stage === 2 ? 'text-xl' : 'text-4xl md:text-5xl'}`}>
            {t.ticket_number}
          </div>
          <div className={`font-bold ${stage === 2 ? 'text-xs' : 'text-lg'} ${isServing ? 'text-gray-800' : 'text-gray-700'}`}>
            {t.purpose}
          </div>
          {t.customer_name && (
            <div className={`font-medium mt-1 ${stage === 2 ? 'text-[10px]' : 'text-base'} ${isServing ? 'text-gray-600' : 'text-gray-500'}`}>
              {t.customer_name}
            </div>
          )}
        </div>
        <div className={`rounded-full font-bold shadow-inner ${stage === 2 ? 'px-1.5 py-0 text-[10px]' : 'px-3 py-1 text-sm'} ${isServing ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
          {t.customer_type}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg shadow-lg flex items-center justify-between transition-all scale-[1.01] border border-gray-100 ${stage === 2 ? 'p-1' : 'p-3'} ${isServing ? 'bg-white text-gray-900 border-l-4 border-l-gray-800' : 'bg-gray-50 text-gray-700 border-l-4 border-l-gray-300'}`}>
      <div className={`flex items-center gap-4 ${stage === 2 ? 'pr-8' : 'pr-16'}`}>
        <div className={`font-black ${stage === 2 ? 'text-base' : 'text-2xl'}`}>
          {t.ticket_number}
        </div>
        <div className="flex flex-col">
          <div className={`font-bold uppercase ${stage === 2 ? 'text-[7px]' : 'text-xs'} ${isServing ? 'text-gray-500' : 'text-gray-500'}`}>
            {t.division_name}
          </div>
          <div className={`font-medium ${stage === 2 ? 'text-[9px]' : 'text-sm'} ${isServing ? 'text-gray-700' : 'text-gray-600'}`}>
            {t.purpose} {t.customer_name ? `- ${t.customer_name}` : ''}
          </div>
        </div>
      </div>
      <div className={`absolute top-2 right-2 font-bold rounded ${stage === 2 ? 'text-[0.45rem] px-1 py-0' : 'text-[0.65rem] px-2 py-0.5'} ${isServing ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
        {t.customer_type}
      </div>
    </div>
  );
};

export default function TvViewer() {
  const { tvId } = useParams();
  const [currentTime, setCurrentTime] = useState(new Date());

  
  // STAGES: 1 = Full Queue, 2 = PiP Split Screen, 3 = Full Screen Ads
  const [stage, setStage] = useState(1);
  const [settings, setSettings] = useState({ tv_idle_seconds: 30, periodic_return_timer: 0 });
  const [ads, setAds] = useState([]);
  const [inQueue, setInQueue] = useState([]);
  const [serving, setServing] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [idleTimer, setIdleTimer] = useState(0);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const socketRef = useRef(null);
  const idleTimerRef = useRef(null);
  const adCarouselTimerRef = useRef(null);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const synth = window.speechSynthesis;

  useEffect(() => {
    const isMuted = stage === 1;
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = isMuted ? 'mute' : 'unMute';
      iframeRef.current.contentWindow.postMessage(JSON.stringify({ event: 'command', func: command, args: [] }), '*');
    }
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [stage]);

  const fetchState = async () => {
    try {
      const res = await axios.get(`${API_URL}/state/${tvId}`);
      setSettings(res.data.settings);
      setAds(res.data.ads);
      setInQueue(res.data.queue.in_queue);
      setServing(res.data.queue.serving);
    } catch (err) {
      console.error(err);
    }
  };

  const speechQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);

  const speakNext = () => {
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) return;
    isSpeakingRef.current = true;
    const audioUrl = speechQueueRef.current.shift();
    
    const bellAudio = new Audio('/bell.mp3');
    
    bellAudio.onended = () => {
      const audio = new Audio(`${SOCKET_URL}${audioUrl}`);
      
      audio.onended = () => {
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      };
      audio.onerror = (e) => {
        console.error("Audio Error:", e);
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      };
      
      audio.play().catch(e => {
        console.error("Play Error:", e);
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      });
    };
    
    bellAudio.onerror = (e) => {
      console.error("Bell Audio Error:", e);
      // Fallback: just play TTS
      const audio = new Audio(`${SOCKET_URL}${audioUrl}`);
      audio.onended = () => {
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      };
      audio.play().catch(err => {
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      });
    };
    
    bellAudio.play().catch(e => {
      console.error("Bell Play Error:", e);
      // Fallback
      const audio = new Audio(`${SOCKET_URL}${audioUrl}`);
      audio.onended = () => {
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      };
      audio.play().catch(err => {
        isSpeakingRef.current = false;
        setTimeout(speakNext, 500);
      });
    });
  };

  const speak = (audioUrl) => {
    if (audioUrl) {
      speechQueueRef.current.push(audioUrl);
      speakNext();
    }
  };
  useEffect(() => {
    fetchState();
    const interval = setInterval(() => {
      setIdleTimer((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [tvId]);

  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    if (!settings) return;

    const totalTimeToCollapse = settings.shrink_timeout + settings.collapse_timeout;

    if (settings.periodic_return_timer > 0 && idleTimer > totalTimeToCollapse) {
      let timeInAdsPhase = idleTimer - totalTimeToCollapse;
      let cycleDuration = settings.periodic_return_timer + 10; // 10 seconds for the queue view
      let currentCyclePos = timeInAdsPhase % cycleDuration;
      
      // If we are in the last 10 seconds of the cycle, show the full queue
      if (currentCyclePos >= settings.periodic_return_timer) {
        setStage(settings.periodic_return_mode === 'pip' ? 2 : 1);
        return;
      }
    }

    if (idleTimer >= totalTimeToCollapse) {
      setStage(3);
    } else if (idleTimer >= settings.shrink_timeout) {
      setStage(2);
    } else {
      setStage(1);
    }
  }, [idleTimer, settings]);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    
    // Sync state on socket reconnect
    socketRef.current.on('connect', () => {
      fetchState();
    });
    
    socketRef.current.on('TICKET_CREATED', (ticket) => {
      if (ticket.tv_id !== parseInt(tvId)) return;
      setInQueue((prev) => [...prev, ticket]);
      if (ticket.audio_url) speak(ticket.audio_url);
      setIdleTimer(0);
    });
    
    socketRef.current.on('TICKET_SERVING', (ticket) => {
      if (ticket.tv_id !== parseInt(tvId)) return;
      setInQueue((prev) => prev.filter(t => t.id !== ticket.id));
      setServing((prev) => [ticket, ...prev.filter(t => t.id !== ticket.id)]);
      if (ticket.audio_url) speak(ticket.audio_url);
      setIdleTimer(0);
    });

    socketRef.current.on('TICKET_COMPLETED', (data) => {
      if (data.tv_id !== parseInt(tvId)) return;
      setServing((prev) => prev.filter(t => t.id !== data.id));
      setIdleTimer(0);
    });
    
    socketRef.current.on('TICKET_CANCELLED', (data) => {
      if (data.tv_id !== parseInt(tvId)) return;
      setInQueue((prev) => prev.filter(t => t.id !== data.id));
      setIdleTimer(0);
    });

    socketRef.current.on('SETTINGS_UPDATED', (newSettings) => {
      setSettings(newSettings);
      setIdleTimer(0);
    });

    socketRef.current.on('ADS_UPDATED', () => {
      fetchState();
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [tvId]);

  useEffect(() => {
    if ((stage === 2 || stage === 3) && ads.length > 0) {
      const currentAd = ads[currentAdIndex];
      if (currentAd?.file_type !== 'video') {
        const duration = (currentAd?.duration || 10) * 1000;
        adCarouselTimerRef.current = setTimeout(() => {
          setCurrentAdIndex((prev) => (prev + 1) % ads.length);
        }, duration);
      }
      if (videoRef.current) {
        videoRef.current.play().catch(console.error);
      }
    }
    return () => {
      if (adCarouselTimerRef.current) clearTimeout(adCarouselTimerRef.current);
    };
  }, [stage, currentAdIndex, ads]);

  const handleVideoEnded = () => {
    if (ads.length <= 1) {
      if (videoRef.current) {
        videoRef.current.play().catch(console.error);
      }
    } else {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }
  };

  const queueContainerClass = 
    stage === 1 ? 'w-full h-full flex transition-all duration-700 ease-in-out' :
    stage === 2 ? 'w-1/4 h-full absolute top-0 left-0 bg-white/95 z-20 shadow-2xl transition-all duration-700 ease-in-out translate-x-0' :
    'w-1/4 h-full absolute top-0 left-0 bg-white/95 z-20 shadow-2xl transition-all duration-700 ease-in-out -translate-x-full';

  const adContainerClass = 
    stage === 1 ? 'opacity-0 scale-95 pointer-events-none absolute inset-0 transition-all duration-700 ease-in-out z-10' :
    stage === 2 ? 'opacity-100 scale-100 absolute w-3/4 right-0 h-full transition-all duration-700 ease-in-out z-10' :
    'opacity-100 scale-100 absolute w-full h-full inset-0 transition-all duration-700 ease-in-out z-10';

  const [activationCountdown, setActivationCountdown] = useState(3);

  useEffect(() => {
    if (!audioEnabled && activationCountdown > 0) {
      const timer = setTimeout(() => setActivationCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (!audioEnabled && activationCountdown === 0) {
      setAudioEnabled(true);
    }
  }, [audioEnabled, activationCountdown]);

  if (!audioEnabled) {
    return (
      <div 
        onClick={() => setAudioEnabled(true)}
        className="w-screen h-screen bg-gray-900 flex items-center justify-center cursor-pointer group"
      >
        <button 
          className="bg-gray-800 text-white text-3xl font-bold py-8 px-16 rounded-3xl shadow-2xl group-hover:bg-gray-700 group-hover:scale-105 transition-all pointer-events-none text-center"
        >
          <div className="mb-2">Starting QMS in {activationCountdown}...</div>
          <div className="text-xl font-normal text-gray-400">Click here to start immediately</div>
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen flex flex-col overflow-hidden bg-gray-100 text-gray-800">
      <div className={`w-full bg-[linear-gradient(90deg,#94a3b8_0%,#f8fafc_20%,#cbd5e1_50%,#f8fafc_80%,#94a3b8_100%)] shadow flex items-center z-50 shrink-0 border-gray-400 transition-all duration-700 ease-in-out overflow-hidden ${stage === 3 ? 'h-0 opacity-0 border-b-0 px-0' : 'h-[72px] px-8 border-b opacity-100'}`}>
        <img src="/logo.png" alt="Logo" className="h-12 w-12 mr-6 rounded-full object-cover shrink-0" />
        <h1 className="text-2xl font-bold tracking-wide text-gray-800 uppercase flex items-center whitespace-nowrap">
          Personnel Management Center <span className="text-gray-400 font-light mx-4 text-3xl">|</span> <span className="font-medium text-gray-600">QMS</span>
        </h1>
      </div>
      <div className="relative flex-1 w-full overflow-hidden">
        <div className={queueContainerClass}>
          <div 
            className={`flex flex-col w-full h-full ${stage === 1 ? 'flex-row' : ''}`}
          >
          <div className={`p-6 flex flex-col ${stage === 1 ? 'w-1/2 border-r-4' : 'w-full h-1/2 border-b-4'} border-gray-400 bg-[linear-gradient(135deg,#94a3b8_0%,#e2e8f0_25%,#cbd5e1_50%,#f8fafc_75%,#94a3b8_100%)]`}>
            <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 uppercase tracking-wider">Now Serving</h1>
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 p-2">
              {serving.length > 0 && (
                <TicketCard key={serving[0].id} t={serving[0]} isServing={true} index={0} stage={stage} />
              )}
              {serving.length > 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {serving.slice(1).map((t, i) => <TicketCard key={t.id} t={t} isServing={true} index={i + 1} stage={stage} />)}
                </div>
              )}
              {serving.length === 0 && (
                <div className="text-center text-gray-500 text-2xl mt-10">No active counters</div>
              )}
            </div>
          </div>
          <div className={`p-6 flex flex-col ${stage === 1 ? 'w-1/2' : 'w-full h-1/2'} bg-[linear-gradient(160deg,#e2e8f0_0%,#f8fafc_25%,#cbd5e1_50%,#f1f5f9_75%,#e2e8f0_100%)]`}>
            <h1 className="text-4xl font-bold mb-8 text-center text-gray-700 uppercase tracking-wider">In Queue</h1>
            <div className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-4 p-2">
              {inQueue.length > 0 && (
                <TicketCard key={inQueue[0].id} t={inQueue[0]} isServing={false} index={0} stage={stage} />
              )}
              {inQueue.length > 1 && (
                <div className="grid grid-cols-2 gap-4">
                  {inQueue.slice(1).map((t, i) => <TicketCard key={t.id} t={t} isServing={false} index={i + 1} stage={stage} />)}
                </div>
              )}
              {inQueue.length === 0 && (
                <div className="text-center text-gray-400 text-2xl mt-10 italic">Queue is empty</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className={adContainerClass}>
        {settings.media_mode === 'youtube' ? (
          settings.youtube_id ? (
            <div className="w-full h-full bg-black">
              <iframe
                ref={iframeRef}
                src={settings.youtube_id.startsWith('PL') 
                  ? `https://www.youtube.com/embed/videoseries?list=${settings.youtube_id}&autoplay=1&mute=1&controls=0&loop=1&enablejsapi=1`
                  : `https://www.youtube.com/embed/${settings.youtube_id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${settings.youtube_id}&enablejsapi=1`
                }
                className="w-full h-full object-cover"
                allow="autoplay; encrypted-media"
                frameBorder="0"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-2xl font-light">
              YouTube ID Missing
            </div>
          )
        ) : (
          <>
            {ads.length > 0 && (
              <div className="w-full h-full bg-black flex items-center justify-center">
                {ads[currentAdIndex]?.file_type !== 'video' ? (
                  <img src={`${SOCKET_URL}/uploads/${ads[currentAdIndex].filename}`} className="w-full h-full object-contain" alt="Advertisement" />
                ) : (
                  <video ref={videoRef} src={`${SOCKET_URL}/uploads/${ads[currentAdIndex].filename}`} className="w-full h-full object-contain" autoPlay muted={stage === 1} onEnded={handleVideoEnded} />
                )}
              </div>
            )}
            {ads.length === 0 && (
              <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500 text-2xl font-light">
                Ad Media Missing
              </div>
            )}
          </>
        )}
      </div>
      </div>
      <div className={`w-full bg-[linear-gradient(90deg,#94a3b8_0%,#f8fafc_20%,#cbd5e1_50%,#f8fafc_80%,#94a3b8_100%)] shadow-inner flex items-center justify-center z-50 shrink-0 border-gray-400 transition-all duration-700 ease-in-out overflow-hidden ${stage === 3 ? 'h-0 opacity-0 border-t-0 px-0' : 'h-12 px-8 border-t opacity-100'}`}>
        {settings.announcement ? (
          <div className="w-full flex items-center justify-between text-gray-800 font-bold text-2xl tracking-widest whitespace-nowrap">
            <div className="shrink-0">{currentTime.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}</div>
            <div className="flex-1 overflow-hidden mx-8 flex items-center h-full relative">
              <div className="animate-marquee whitespace-nowrap uppercase tracking-wider text-xl text-gray-800 drop-shadow-sm font-black">
                {settings.announcement}
              </div>
            </div>
            <div className="shrink-0">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          </div>
        ) : (
          <div className="text-gray-800 font-bold text-2xl tracking-widest whitespace-nowrap">
            {currentTime.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })} <span className="text-gray-400 font-light mx-2 text-3xl">|</span> {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        )}
      </div>
    </div>
  );
}
