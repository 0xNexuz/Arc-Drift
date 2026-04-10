
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
  Cpu,
  Activity,
  Zap
} from 'lucide-react';
import { DriftType, DriftStatus, DriftRule, DriftStats } from './types';
import { DRIFT_CONFIG, ARC_TESTNET_EXPLORER, DEMO_WALLET_ADDRESS } from './constants';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useSwitchChain, useChainId } from 'wagmi';
import { arcTestnet } from './Web3Provider';

const ArcLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 15C31.5 15 17 35.5 17 65V85H31V65C31 46.5 39.5 33 50 33C60.5 33 69 46.5 69 65V78C69 79.5 67.5 81 66 81H54V68H40V81C40 83.5 42 85.5 44.5 85.5H79C81.5 85.5 83.5 83.5 83.5 81V65C83.5 35.5 68.5 15 50 15Z" fill="url(#arc-gradient)" />
    <defs>
      <linearGradient id="arc-gradient" x1="50" y1="15" x2="50" y2="85.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="white" />
        <stop offset="1" stopColor="#8B5CF6" />
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
  
  // Real Wallet Integration
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({
    address: address,
  });

  const isWrongNetwork = isConnected && chainId !== arcTestnet.id;
  const account = isConnected ? address : DEMO_WALLET_ADDRESS;

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
  const handleCreateDrift = () => {
    if (!recipient || amount <= 0) return;
    
    setIsCreating(true);
    
    setTimeout(() => {
      const newDrift: DriftRule = {
        id: Math.random().toString(36).substr(2, 9),
        sender: account,
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
    }, 800);
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

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen pb-20 px-4 md:px-8 bg-[#0a0a0c] text-slate-200">
      {/* Network Enforcement Banner */}
      {isWrongNetwork && (
        <div className="max-w-7xl mx-auto pt-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-amber-400 text-sm font-bold">
              <ShieldCheck className="w-5 h-5" />
              <span>Wrong Network Detected: Please switch to Arc Testnet</span>
            </div>
            <button 
              onClick={() => switchChain({ chainId: arcTestnet.id })}
              className="px-6 py-2 bg-amber-500 text-black text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-400 transition-all"
            >
              Switch to Arc
            </button>
          </div>
        </div>
      )}

      {/* Simulation Banner */}
      {!isConnected && (
        <div className="max-w-7xl mx-auto pt-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-blue-400 text-xs font-bold uppercase tracking-widest">
              <Cpu className="w-4 h-4 animate-pulse" />
              <span>Protocol Simulation Mode Active</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              Connect wallet to use Live Testnet
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <nav className="flex flex-col sm:flex-row items-center justify-between py-8 max-w-7xl mx-auto gap-6 sm:gap-4">
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <ArcLogo className="w-10 h-10 md:w-12 md:h-12" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent">ARC Drift</h1>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="hidden md:flex items-center gap-6 mr-4 border-r border-white/5 pr-6">
              {isConnected && balance && (
                <div className="text-right">
                  <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest">Balance</div>
                  <div className="text-white font-mono font-bold">{parseFloat(balance.formatted).toFixed(2)} {balance.symbol}</div>
                </div>
              )}
              <div className="text-right">
                <div className="text-[10px] uppercase text-slate-500 font-black tracking-widest">TVL</div>
                <div className="text-white font-mono font-bold">{stats.totalValueLocked.toFixed(2)} ARC</div>
              </div>
           </div>
           
           <ConnectButton />
        </div>
      </nav>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        
        {/* Creation Panel */}
        <div className="lg:col-span-5 space-y-8">
          <div className="glass-card rounded-[32px] p-8 border-white/5 shadow-2xl relative overflow-hidden group bg-slate-900/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px]"></div>
            
            <div className="flex items-center justify-between mb-10">
              <h2 className="text-xl font-bold flex items-center gap-3 text-slate-100">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                Deploy Drift
              </h2>
              <div className="text-[10px] font-black px-3 py-1 bg-white/5 border border-white/10 rounded-full text-slate-500 tracking-widest uppercase">Simulation v2.4</div>
            </div>

            {/* Drift Types */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {Object.entries(DRIFT_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type as DriftType)}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-3 ${
                    selectedType === type 
                    ? `bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]` 
                    : 'bg-transparent border-white/5 hover:border-white/10 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl w-fit ${config.bg} ${config.color}`}>
                    {config.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-200">{config.label}</span>
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Recipient Address</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..." 
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500/50 transition-all font-mono text-sm text-slate-200"
                  />
                  <Activity className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Amount (ARC)</label>
                  <input 
                    type="number" 
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500/50 transition-all font-mono text-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Duration (Hrs)</label>
                  <input 
                    type="number" 
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-blue-500/50 transition-all font-mono text-slate-200"
                  />
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5 text-blue-400" />
                  Logic Preview
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  {DRIFT_CONFIG[selectedType].description}
                </p>
              </div>

              <button 
                onClick={handleCreateDrift}
                disabled={isCreating || !recipient}
                className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${
                  isCreating || !recipient ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20'
                }`}
              >
                {isCreating ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Deploy to Simulator
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Simulation Tools */}
          <div className="glass-card rounded-[32px] p-6 border-white/5 bg-slate-900/20">
            <h3 className="text-[10px] font-black text-slate-500 flex items-center gap-2 mb-4 uppercase tracking-[0.2em]">
              <FastForward className="w-4 h-4 text-blue-400" />
              Temporal Controls
            </h3>
            <div className="flex gap-3">
              <button onClick={() => fastForward(1)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all">+1h</button>
              <button onClick={() => fastForward(24)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-300 text-xs font-bold hover:bg-white/10 transition-all">+24h</button>
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
              Protocol Registry
            </h2>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 bg-white/5 px-4 py-1.5 rounded-full border border-white/5 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
              Network Live
            </div>
          </div>

          <div className="space-y-6">
            {drifts.length === 0 ? (
              <div className="glass-card rounded-[32px] p-20 text-center border-dashed border-white/10 bg-slate-900/20">
                <Waves className="w-12 h-12 text-slate-800 mx-auto mb-6" />
                <h3 className="text-lg font-bold text-slate-500 mb-2">No Active Drifts</h3>
                <p className="text-xs text-slate-600 max-w-xs mx-auto">Deploy a rule to see the protocol logic in action.</p>
              </div>
            ) : (
              drifts.map((drift) => {
                const config = DRIFT_CONFIG[drift.type];
                const available = calculateAvailable(drift);
                const progress = Math.min(100, ((effectiveTime - drift.startTime) / (drift.endTime - drift.startTime)) * 100);
                
                return (
                  <div key={drift.id} className="glass-card rounded-[28px] p-6 border-white/5 bg-slate-900/40 hover:border-white/10 transition-all relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${config.bg} ${config.color} shadow-inner shrink-0`}>
                          {config.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <h4 className="font-bold text-base text-slate-100">{config.label}</h4>
                            <span className={`text-[9px] px-2.5 py-1 rounded-full uppercase font-black tracking-widest ${
                              drift.status === DriftStatus.EXECUTED ? 'bg-green-500/10 text-green-400' :
                              drift.status === DriftStatus.CANCELED ? 'bg-red-500/10 text-red-400' :
                              'bg-blue-500/10 text-blue-400'
                            }`}>
                              {drift.status}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-1.5 truncate">
                            To: {drift.recipient}
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <div className="text-xl font-bold text-white font-mono">{drift.amount} <span className="text-xs text-slate-500 font-sans ml-0.5">ARC</span></div>
                        <div className="text-[10px] text-slate-600 uppercase font-black tracking-widest mt-1">Simulated Asset</div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mb-8 p-5 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-slate-500 mb-3">
                        <span>Temporal Progress</span>
                        <span className="text-slate-300 font-mono">{Math.max(0, progress).toFixed(2)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            drift.status === DriftStatus.CANCELED ? 'bg-red-500/40' : 
                            drift.status === DriftStatus.EXECUTED ? 'bg-green-500' : 
                            'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                          }`}
                          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
                        />
                      </div>
                      
                      {(drift.type === DriftType.STREAMING || drift.status === DriftStatus.EXECUTED) && drift.status !== DriftStatus.CANCELED && (
                         <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/5">
                            <div>
                               <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Available</div>
                               <div className="text-sm font-bold text-blue-400 font-mono">
                                  {available.toFixed(6)} ARC
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Withdrawn</div>
                               <div className="text-sm font-bold text-slate-400 font-mono">{drift.withdrawn.toFixed(2)} ARC</div>
                            </div>
                         </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                        <Activity className="w-3 h-3" />
                        TX: {drift.id}
                      </div>
                      <div className="flex gap-3 w-full sm:w-auto">
                        {(drift.status === DriftStatus.PENDING || drift.status === DriftStatus.STREAMING) && drift.type === DriftType.CANCELABLE && (
                          <button 
                            onClick={() => handleCancel(drift.id)}
                            className="px-4 py-2 rounded-xl bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all flex-1 sm:flex-none"
                          >
                            Revoke
                          </button>
                        )}
                        {drift.status === DriftStatus.STREAMING && available > 0 && (
                          <button 
                            onClick={() => handleWithdraw(drift.id)}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all flex-1 sm:flex-none"
                          >
                            Claim Flow
                          </button>
                        )}
                        {drift.status === DriftStatus.EXECUTED && drift.amount > drift.withdrawn && (
                           <button 
                            onClick={() => handleWithdraw(drift.id)}
                            className="px-4 py-2 rounded-xl bg-green-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-green-500 transition-all flex-1 sm:flex-none"
                          >
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
    </div>
  );
};

export default App;
