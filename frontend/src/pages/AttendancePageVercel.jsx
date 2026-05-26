import React, { useState, useEffect, useRef } from 'react';
import { CameraOff, CheckCircle, XCircle, Shield, AlertTriangle, Users, Play, Square, Loader2 } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AttendancePage() {
  // Portal State
  const [activeTab, setActiveTab] = useState('student');
  
  // Camera State
  const [cameraError, setCameraError] = useState('');
  
  // Render Cold Start / Server States
  const [serverStatus, setServerStatus] = useState('idle'); // idle, connecting, error
  const [serverMessage, setServerMessage] = useState('');
  
  // Admin (Registration) States
  const [adminMovements, setAdminMovements] = useState({ left: false, right: false, up: false, down: false });
  const allMovementsVerified = Object.values(adminMovements).every(Boolean);

  // Student (Liveness) States
  const [livenessStatus, setLivenessStatus] = useState('idle'); // idle, checking, success, failed
  
  // Teacher States
  const [teacherSession, setTeacherSession] = useState(false);
  const dummyStudents = [
    { id: 1, name: 'John Doe', roll: 'CS-001', status: 'pending' },
    { id: 2, name: 'Jane Smith', roll: 'CS-002', status: 'present' },
    { id: 3, name: 'Alice Johnson', roll: 'CS-003', status: 'absent' },
  ];

  // Camera & Permissions Check
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const checkCameraPermissions = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera access requires HTTPS or secure permissions.');
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      return true;
    } catch (err) {
      setCameraError('Camera access requires HTTPS or secure permissions. Please allow access.');
      return false;
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    // Only mount camera for Admin and Student views
    if (activeTab === 'admin' || activeTab === 'student') {
      checkCameraPermissions();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  // Mock API Calls with Render Cold-Start Handling
  const handleAdminUpload = async () => {
    if (!allMovementsVerified) return;
    setServerStatus('connecting');
    setServerMessage('Connecting to secure AI server, please wait... (Render cold start may take up to 50s)');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ face_data: 'mock_vector' })
      });
      if (response.ok) alert('Student Face Registered Successfully!');
    } catch (e) {
      setServerStatus('error');
      alert('Error connecting to backend.');
    } finally {
      if (serverStatus !== 'error') {
        setServerStatus('idle');
      }
      setServerMessage('');
    }
  };

  const handleStudentBlink = async () => {
    setLivenessStatus('checking');
    setServerStatus('connecting');
    setServerMessage('Connecting to secure AI server, please wait... (Render cold start may take up to 50s)');
    
    try {
      // API call mockup to backend
      const response = await fetch(`${API_BASE_URL}/api/ai/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frame: 'mock_base64_frame' })
      });
      
      // Simulate network response
      setTimeout(() => {
        setLivenessStatus('success');
        setServerStatus('idle');
        setServerMessage('');
      }, 1500);
      
    } catch (e) {
      setLivenessStatus('failed');
      setServerStatus('error');
      setServerMessage('Failed to reach backend server.');
    }
  };

  // Render Helpers
  const renderCameraBox = (overlayContent, pulseBorder = false) => (
    <div className={`relative w-full max-w-md mx-auto aspect-[4/3] bg-slate-900 rounded-2xl overflow-hidden shadow-xl ${pulseBorder ? 'ring-4 ring-emerald-500/50 animate-pulse' : 'ring-1 ring-white/10'}`}>
      {cameraError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-800">
          <CameraOff className="w-12 h-12 text-red-400 mb-4 opacity-75" />
          <p className="text-red-300 text-sm font-medium">{cameraError}</p>
        </div>
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
          {overlayContent}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary-500/30 pb-20">
        
        {/* Top Navigation / Tab Bar */}
        <div className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-primary-500" />
              <span className="font-bold text-lg text-white">IntelliAttend Demo</span>
            </div>
            <div className="flex bg-slate-800/50 rounded-lg p-1 border border-white/5">
              {['admin', 'student', 'teacher'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setLivenessStatus('idle');
                    setServerStatus('idle');
                    setAdminMovements({ left: false, right: false, up: false, down: false });
                  }}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md capitalize transition-all ${
                    activeTab === tab 
                      ? 'bg-primary-600 text-white shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Global Server Cold Start Warning Overlay */}
        {serverStatus === 'connecting' && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-amber-500/90 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg shadow-amber-500/20 flex items-center gap-2 animate-in slide-in-from-top-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            {serverMessage}
          </div>
        )}

        {/* Main Content Area */}
        <main className="max-w-5xl mx-auto px-4 mt-8 animate-in fade-in duration-500">
          
          {/* ───────────────────────────────────────────────────────── */}
          {/* ADMIN PORTAL VIEW */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'admin' && (
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-white">Student Registration</h1>
                  <p className="text-slate-400 mt-1 text-sm">Follow the head movements to verify liveness.</p>
                </div>
                {renderCameraBox(
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-64 border-2 border-dashed border-primary-500/50 rounded-full" />
                  </div>
                )}
              </div>
              
              <div className="w-full md:w-80 flex flex-col gap-4">
                <div className="bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-lg">
                  <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Liveness Checklist</h3>
                  <div className="space-y-3">
                    {['left', 'right', 'up', 'down'].map((dir) => (
                      <div key={dir} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-white/5">
                        <span className="capitalize font-medium text-slate-300">{dir}</span>
                        {adminMovements[dir] ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500 transition-colors" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Dev Helper: Toggle movements quickly */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex gap-2 justify-center">
                    <button onClick={() => setAdminMovements({left: true, right: true, up: true, down: true})} className="text-xs text-primary-400 hover:underline">Mock Pass</button>
                    <button onClick={() => setAdminMovements({left: false, right: false, up: false, down: false})} className="text-xs text-slate-500 hover:underline">Reset</button>
                  </div>
                </div>

                <button
                  onClick={handleAdminUpload}
                  disabled={!allMovementsVerified || serverStatus === 'connecting'}
                  className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {serverStatus === 'connecting' ? <span className="animate-pulse">Encoding...</span> : 'Upload & Encode Face'}
                </button>
              </div>
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* STUDENT PORTAL VIEW */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'student' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">Daily Attendance</h1>
                <p className="text-slate-400 mt-1 text-sm">Please verify your identity to mark present.</p>
              </div>

              {livenessStatus === 'success' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-in zoom-in duration-300">
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Attendance Marked Successfully!</h2>
                  <p className="text-emerald-300/80 text-sm mt-2">You may now close this window.</p>
                  <button onClick={() => setLivenessStatus('idle')} className="mt-6 text-sm text-slate-400 hover:text-white underline">Mark another</button>
                </div>
              ) : (
                <>
                  {renderCameraBox(
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className={`backdrop-blur-md border rounded-xl p-3 flex items-center justify-center gap-2 transition-colors duration-300 ${livenessStatus === 'checking' ? 'bg-amber-500/90 border-amber-400 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-900/80 border-white/10 text-slate-200'}`}>
                        {livenessStatus === 'checking' ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="font-semibold text-sm">Verifying Blink... Please wait.</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="font-medium text-sm">Keep looking at the camera and blink...</span>
                          </>
                        )}
                      </div>
                    </div>,
                    livenessStatus === 'idle' // pulse border when not yet checking
                  )}
                  
                  {/* Dev Helper */}
                  {livenessStatus === 'idle' && !cameraError && (
                     <button onClick={handleStudentBlink} className="w-full py-2 bg-slate-800 text-slate-400 rounded-lg text-sm hover:bg-slate-700 transition-colors">
                       [Dev] Force Blink Trigger
                     </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TEACHER PORTAL VIEW */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'teacher' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-lg">
                <div>
                  <h1 className="text-xl font-bold text-white">Session Dashboard</h1>
                  <p className="text-slate-400 text-sm mt-1">Control AI attendance or manually override records.</p>
                </div>
                <button
                  onClick={() => setTeacherSession(!teacherSession)}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-colors ${
                    teacherSession 
                    ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/30' 
                    : 'bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  }`}
                >
                  {teacherSession ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {teacherSession ? 'End Session' : 'Activate Attendance Session'}
                </button>
              </div>

              {teacherSession ? (
                <div className="bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-lg flex flex-col max-h-[600px]">
                  <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary-400" />
                      <h2 className="font-semibold text-white">Manual Override Grid</h2>
                    </div>
                    <span className="text-xs text-slate-400">Class CS-101</span>
                  </div>
                  
                  <div className="overflow-y-auto p-4 space-y-2">
                    {dummyStudents && dummyStudents.map((stu) => (
                      <div key={stu.id} className="flex flex-wrap sm:flex-nowrap items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-white/5 hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-4 min-w-[200px]">
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold">
                            {stu.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">{stu.name}</p>
                            <p className="text-xs text-slate-500">{stu.roll}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-3 sm:mt-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            stu.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' :
                            stu.status === 'absent' ? 'bg-red-500/20 text-red-400' :
                            'bg-slate-700 text-slate-300'
                          }`}>
                            {stu.status.toUpperCase()}
                          </span>
                          <div className="flex gap-2 ml-4 border-l border-white/10 pl-4">
                            <button className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-slate-900 border border-white/5 rounded-2xl flex flex-col items-center">
                  <AlertTriangle className="w-12 h-12 text-slate-600 mb-4" />
                  <h3 className="text-lg font-medium text-slate-300">No Active Session</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm">Click "Activate Attendance Session" above to open the AI scanning window for your students and reveal the manual override controls.</p>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </>
  );
}
