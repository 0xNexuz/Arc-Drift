
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Waves, 
  Ban, 
  Repeat, 
  Plus, 
  ArrowRight, 
  CheckCircle2, 
  Info,
  TrendingUp,
  ShieldCheck,
  FastForward,
  Wallet,
  ExternalLink,
  Trash2,
  LogOut
} from 'lucide-react';
import { BrowserProvider } from 'ethers';
import { DriftType, DriftStatus, DriftRule, DriftStats } from './types';
import { DRIFT_CONFIG, ARC_TESTNET_EXPLORER, DEMO_WALLET_ADDRESS } from './constants';

const ArcLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 15C31.5 15 17 35.5 17 65V85H31V65C31 46.5 39.5 33 50 33C60.5 33 69 46.5 69 65V78C69 79.5 67.5 81 66 81H54V68H40V81C40 83.5 42 85.5 44.5 85.5H79C81.5 85.5 83.5 83.5 83.5 81V65C83.5 35.5 68.5 15 50 15Z" fill="url(#arc-gradient)" />
    <defs>
      <linearGradient id="arc-gradient" x1="50" y1="15" x2="50" y2="85.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
  </svg>
);

const App: React.FC = () => {
  // State
  const [drifts, setDrifts] = useState<DriftRule[]>([]);
  const [selectedType, setSelectedType] = useState<DriftType>(DriftType.STREAMING);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState(10);
  const [duration, setDuration] = useState(24); // in hours
  const [isCreating, setIsCreating] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [simulationOffset, setSimulationOffset] = useState(0);
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Derived Values
  const effectiveTime = currentTime + simulationOffset;

  const stats: DriftStats = useMemo(() => {
    const active = drifts.filter(d => d.status === DriftStatus.PENDING || d.status === DriftStatus.STREAMING);
    return {
      totalValueLocked: active.reduce((acc, curr) => acc + (curr.amount - curr.withdrawn), 0),
      activeDrifts: active.length,
      totalVolume: drifts.reduce((acc, curr) => acc + curr.amount, 0),
      longestDriftDays: Math.max(0, ...drifts.map(d => (d.endTime - d.startTime) / (1000 * 60 * 60 * 24)))
    };
  }, [drifts]);

  // Effects
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for existing connection
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0].address);
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };
    checkConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });
    }
  }, []);

  // Update statuses based on time
  useEffect(() => {
    setDrifts(prev => prev.map(drift => {
      if (drift.status === DriftStatus.CANCELED || drift.status === DriftStatus.EXECUTED) return drift;

      if (drift.type === DriftType.STREAMING) {
        if (effectiveTime >= drift.endTime) return { ...drift, status: DriftStatus.EXECUTED };
        if (effectiveTime >= drift.startTime) return { ...drift, status: DriftStatus.STREAMING };
      } else {
        if (effectiveTime >= drift.endTime && drift.status !== DriftStatus.EXECUTED) {
           if (drift.type === DriftType.DELAYED) return { ...drift, status: DriftStatus.EXECUTED };
        }
      }
      return drift;
    }));
  }, [effectiveTime]);

  // Handlers
  const connectWallet = async () => {
    if (!window.ethereum) {
      setWalletError("No wallet detected. If you have MetaMask installed, try opening this app in a new tab using the button in the top right of the preview.");
      setShowErrorModal(true);
      return;
    }
    
    setIsConnecting(true);
    setWalletError(null);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setIsDemoMode(false);
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      if (error.code === 4001) {
        setWalletError("Connection request was rejected. Please try again.");
      } else {
        setWalletError("Failed to connect wallet. Please ensure your wallet is unlocked and try again.");
      }
      setShowErrorModal(true);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setIsDemoMode(false);
  };

  const enterDemoMode = () => {
    setAccount(null);
    setIsDemoMode(true);
  };

  const formatAddress = (addr: string) => {
    if (isDemoMode) return "Demo Wallet";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCreateDrift = () => {
    const activeSender = isDemoMode ? DEMO_WALLET_ADDRESS : account;
    if (!recipient || amount <= 0 || !activeSender) return;
    
    setIsCreating(true);
    
    setTimeout(() => {
      const newDrift: DriftRule = {
        id: Math.random().toString(36).substr(2, 9),
        sender: activeSender,
        recipient,
        amount,
        withdrawn: 0,
        startTime: effectiveTime + (selectedType === DriftType.DELAYED ? 0 : 2000), 
        endTime: effectiveTime + (duration * 60 * 60 * 1000),
        type: selectedType,
        status: DriftStatus.PENDING,
        createdAt: effectiveTime,
        label: `${selectedType} to ${recipient.slice(0, 6)}...`
      };
      
      setDrifts([newDrift, ...drifts]);
      setIsCreating(false);
      setRecipient('');
      setAmount(10);
    }, 1200);
  };

  const handleCancel = (id: string) => {
    setDrifts(prev => prev.map(d => d.id === id ? { ...d, status: DriftStatus.CANCELED } : d));
  };

  const handleWithdraw = (id: string) => {
    setDrifts(prev => prev.map(d => {
      if (d.id === id) {
        const available = calculateAvailable(d);
        return { ...d, withdrawn: d.withdrawn + available };
      }
      return d;
    }));
  };

  const calculateAvailable = (drift: DriftRule) => {
    if (drift.status === DriftStatus.CANCELED) return 0;
    if (drift.status === DriftStatus.EXECUTED) return drift.amount - drift.withdrawn;
    if (drift.type !== DriftType.STREAMING) return 0;
    
    const totalDuration = drift.endTime - drift.startTime;
    const elapsed = Math.max(0, effectiveTime - drift.startTime);
    const ratio = Math.min(1, elapsed / totalDuration);
    const totalEarned = drift.amount * ratio;
    return Math.max(0, totalEarned - drift.withdrawn);
  };

  const fastForward = (hours: number) => {
    setSimulationOffset(prev => prev + (hours * 60 * 60 * 1000));
  };

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8">
      {/* Header */}
      <nav className="flex flex-col sm:flex-row items-center justify-between py-6 md:py-8 max-w-7xl mx-auto gap-6 sm:gap-4">
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <ArcLogo className="w-10 h-10 md:w-12 md:h-12" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight arc-logo-gradient">ARC Drift</h1>
        </div>
        
        <div className="flex flex-wrap items-center justify-end gap-3 md:gap-4 w-full sm:w-auto">
          <div className="hidden lg:flex items-center gap-8 text-sm text-slate-400 font-medium">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500 tracking-widest">Locked Value</span>
              <span className="text-white font-mono">{stats.totalValueLocked.toFixed(2)} ARC</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase text-slate-500 tracking-widest">Active Drifts</span>
              <span className="text-white font-mono">{stats.activeDrifts}</span>
            </div>
          </div>
          
          {account || isDemoMode ? (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button className="flex items-center gap-3 px-4 md:px-5 py-2.5 rounded-2xl glass-card border-white/5 hover:bg-white/5 transition-all group flex-1 sm:flex-none justify-center sm:justify-start">
                <div className={`w-2 h-2 rounded-full ${isDemoMode ? 'bg-blue-400' : 'bg-green-400'} animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]`}></div>
                <span className="text-xs md:text-sm font-mono text-slate-200">{formatAddress(account || '')}</span>
              </button>
              <button 
                onClick={disconnectWallet}
                className="p-2.5 rounded-xl glass-card border-white/5 hover:bg-red-500/10 hover:text-red-400 transition-all text-slate-500"
                title={isDemoMode ? "Exit Demo" : "Disconnect"}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto justify-end">
              <button 
                onClick={enterDemoMode}
                className="px-4 md:px-5 py-2.5 rounded-2xl glass-card border-white/5 hover:bg-white/5 text-slate-400 text-xs md:text-sm font-medium transition-all flex-1 sm:flex-none"
              >
                Try Demo
              </button>
              <button 
                onClick={connectWallet}
                disabled={isConnecting}
                className="flex items-center gap-2 md:gap-3 px-5 md:px-6 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] disabled:opacity-50 flex-1 sm:flex-none justify-center"
              >
                {isConnecting ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
                <span className="whitespace-nowrap">Connect Wallet</span>
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mt-4">
        
        {/* Creation Panel */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-card rounded-[32px] p-8 border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] group-hover:bg-blue-500/10 transition-all duration-700"></div>
            
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                New Drift Rule
              </h2>
              <div className="text-[10px] font-black px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 tracking-widest uppercase">TESTNET v1.0</div>
            </div>

            {/* Drift Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-8">
              {Object.entries(DRIFT_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type as DriftType)}
                  className={`p-3 md:p-4 rounded-[20px] border transition-all text-left flex flex-col gap-2 md:gap-3 group/btn ${
                    selectedType === type 
                    ? `bg-white/5 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]` 
                    : 'bg-transparent border-white/5 hover:border-white/10 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl w-fit ${config.bg} ${config.color} transition-transform group-hover/btn:scale-110`}>
                    {config.icon}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-200">{config.label}</span>
                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-1">{config.description}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Recipient</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..." 
                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono text-sm text-slate-200 placeholder:text-slate-600"
                  />
                  <Wallet className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Amount</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500/50 transition-all font-mono text-slate-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">ARC</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1">Duration</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500/50 transition-all font-mono text-slate-200"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">HRS</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                  <Info className="w-3.5 h-3.5" />
                  Execution Logic
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {selectedType === DriftType.STREAMING && (
                    <>Value flows to <span className="text-slate-200 font-mono text-xs">{recipient.slice(0, 10) || '...'}</span> linearly at <span className="text-blue-400 font-bold">{(amount / duration).toFixed(2)} ARC/hr</span>.</>
                  )}
                  {selectedType === DriftType.DELAYED && (
                    <>Full escrowed balance unlocks for recipient in <span className="text-blue-400 font-bold">{duration} hours</span>.</>
                  )}
                  {selectedType === DriftType.CANCELABLE && (
                    <>Funds remain in vault. Withdrawal blocked for <span className="text-blue-400 font-bold">{duration} hours</span> unless retracted by sender.</>
                  )}
                  {selectedType === DriftType.RECURRING && (
                    <>Smart logic splits total into 4 weekly payments of <span className="text-blue-400 font-bold">{(amount / 4).toFixed(2)} ARC</span>.</>
                  )}
                </p>
              </div>

              <button 
                onClick={(account || isDemoMode) ? handleCreateDrift : connectWallet}
                disabled={isCreating || ((account || isDemoMode) && !recipient)}
                className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-xl ${
                  isCreating || ((account || isDemoMode) && !recipient) ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-slate-100 text-slate-900 hover:bg-white hover:scale-[1.01] active:scale-[0.99] shadow-white/5'
                }`}
              >
                {isCreating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin"></div>
                    Broadcasting...
                  </>
                ) : !(account || isDemoMode) ? (
                  <>
                    <Wallet className="w-5 h-5" />
                    Connect Wallet First
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Deploy Rule
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Simulation Tools */}
          <div className="glass-card rounded-3xl p-6 border-white/5 bg-slate-900/40">
            <h3 className="text-xs font-bold text-slate-500 flex items-center gap-2 mb-4 uppercase tracking-widest">
              <FastForward className="w-4 h-4 text-blue-400" />
              Time Simulator
            </h3>
            <div className="flex gap-3">
              <button onClick={() => fastForward(1)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all hover:border-blue-500/30">+1 Hour</button>
              <button onClick={() => fastForward(24)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all hover:border-blue-500/30">+24 Hours</button>
              <button onClick={() => setSimulationOffset(0)} className="px-5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-all">Reset</button>
            </div>
          </div>
        </div>

        {/* Drifts List */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
              <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              Rule Registry
            </h2>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              Live Protocol
            </div>
          </div>

          <div className="space-y-6">
            {drifts.length === 0 ? (
              <div className="glass-card rounded-[32px] p-20 text-center border-dashed border-white/10">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Waves className="w-10 h-10 text-slate-700" />
                </div>
                <h3 className="text-xl font-bold text-slate-400 mb-2">Registry is Empty</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Deploy a time-based drift rule to begin streaming value on ARC Testnet.</p>
              </div>
            ) : (
              drifts.map((drift) => {
                const config = DRIFT_CONFIG[drift.type];
                const available = calculateAvailable(drift);
                const progress = Math.min(100, ((effectiveTime - drift.startTime) / (drift.endTime - drift.startTime)) * 100);
                
                return (
                  <div key={drift.id} className="glass-card rounded-[28px] p-6 border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
                    {drift.status === DriftStatus.STREAMING && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    )}
                    
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${config.bg} ${config.color} shadow-inner shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            <h4 className="font-bold text-base text-slate-100 whitespace-nowrap">{config.label}</h4>
                            <span className={`text-[9px] px-2.5 py-1 rounded-full uppercase font-black tracking-widest ${
                              drift.status === DriftStatus.EXECUTED ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              drift.status === DriftStatus.CANCELED ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                              drift.status === DriftStatus.STREAMING ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                              'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}>
                              {drift.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-1.5 flex items-center gap-1.5 truncate">
                            <ArrowRight className="w-3 h-3 opacity-50 shrink-0" />
                            <span className="truncate">To: {drift.recipient}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <div className="text-xl font-bold text-white leading-tight font-mono">{drift.amount} <span className="text-xs text-slate-500 font-sans ml-0.5">ARC</span></div>
                        <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Contract Payload</div>
                      </div>
                    </div>

                    {/* Progress Visualizer */}
                    <div className="mb-8 p-5 bg-black/20 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Time Elapsed
                        </span>
                        <span className="text-slate-300 font-mono">{Math.max(0, progress).toFixed(2)}%</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            drift.status === DriftStatus.CANCELED ? 'bg-red-500/40' : 
                            drift.status === DriftStatus.EXECUTED ? 'bg-green-500' : 
                            'bg-gradient-to-r from-blue-600 via-blue-400 to-slate-200 animate-flow'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                        />
                      </div>
                      {(drift.type === DriftType.STREAMING || drift.status === DriftStatus.EXECUTED) && drift.status !== DriftStatus.CANCELED && (
                         <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/5">
                            <div>
                               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Available Flow</div>
                               <div className="text-sm font-bold text-blue-400 flex items-center gap-2 font-mono">
                                  <Waves className="w-4 h-4 animate-bounce" />
                                  {available.toFixed(6)}
                                  <span className="text-[10px] font-sans text-slate-600">ARC</span>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Withdrawn</div>
                               <div className="text-sm font-bold text-slate-300 font-mono">{drift.withdrawn.toFixed(2)} <span className="text-[10px] font-sans text-slate-600 uppercase">ARC</span></div>
                            </div>
                         </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <a 
                        href={`${ARC_TESTNET_EXPLORER}${drift.id}`} 
                        target="_blank" 
                        className="text-[10px] font-bold text-slate-500 hover:text-blue-400 flex items-center gap-2 transition-all uppercase tracking-widest self-start sm:self-auto"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Onchain Proof
                      </a>
                      <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
                        {(drift.status === DriftStatus.PENDING || drift.status === DriftStatus.STREAMING) && drift.type === DriftType.CANCELABLE && (
                          <button 
                            onClick={() => handleCancel(drift.id)}
                            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        )}
                        {drift.status === DriftStatus.STREAMING && available > 0 && (
                          <button 
                            onClick={() => handleWithdraw(drift.id)}
                            className="px-4 py-2 rounded-xl bg-blue-500 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)] text-[10px] font-black uppercase tracking-widest hover:bg-blue-400 hover:scale-105 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Claim
                          </button>
                        )}
                        {drift.status === DriftStatus.EXECUTED && drift.amount > drift.withdrawn && (
                           <button 
                            onClick={() => handleWithdraw(drift.id)}
                            className="px-4 py-2 rounded-xl bg-green-500 text-white shadow-[0_4px_12px_rgba(34,197,94,0.3)] text-[10px] font-black uppercase tracking-widest hover:bg-green-400 transition-all flex items-center gap-2 flex-1 sm:flex-none justify-center"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Finalize
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>

      {/* Floating Network Indicator */}
      <div className="fixed bottom-6 right-6 md:bottom-8 md:right-8 flex items-center gap-4 z-50">
        <div className="glass-card rounded-2xl p-3 md:p-4 pr-5 md:pr-6 flex items-center gap-4 md:gap-5 shadow-2xl border-white/10 group cursor-default">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-900 flex items-center justify-center text-slate-400 border border-white/5 group-hover:border-blue-500/30 transition-all">
                <ShieldCheck className="w-5 h-5 md:w-6 md:h-6 group-hover:text-blue-400" />
            </div>
            <div>
                <div className="text-[9px] md:text-[10px] uppercase font-black text-slate-500 tracking-[0.2em] mb-0.5">Testnet Node</div>
                <div className="text-xs md:text-sm font-bold text-slate-100 flex items-center gap-2">
                   <span className="hidden xs:inline">ARC Protocol 2.0</span>
                   <span className="xs:hidden">ARC 2.0</span>
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                </div>
            </div>
        </div>
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-[32px] p-8 max-w-md w-full border-white/10 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
              <Info className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Wallet Connection Issue</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {walletError}
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setShowErrorModal(false)}
                className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all"
              >
                Close
              </button>
              {!window.ethereum && (
                <p className="text-[10px] text-slate-500 text-center mt-2">
                  Tip: Browser wallets often don't work inside previews. Try the "Open in New Tab" button.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
