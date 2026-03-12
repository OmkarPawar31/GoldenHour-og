const fs = require('fs');

const filePath = 'c:\\Hackathon\\GoldenHour-og\\client\\app\\private-emergency\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to help match
const normalizedContent = content.replace(/\r\n/g, '\n');

const targetIndex = normalizedContent.indexOf('  return (\n    <>\n      <ToastUI />');

if (targetIndex === -1) {
  console.log("Failed to find replacement index");
  process.exit(1);
}

const newReturnContent = `  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col overflow-hidden relative">
      <ToastUI />
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/[0.03] rounded-full blur-[120px] animate-float" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px] animate-float" style={{ animationDelay: '3s', animationDuration: '10s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-600/[0.02] rounded-full blur-[150px]" />
      </div>

      {/* Top Header & Actions */}
      <header className="border-b border-white/[0.04] bg-[#020617]/90 backdrop-blur-2xl px-6 py-3.5 z-50 shadow-2xl relative overflow-hidden">
        {/* Header gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[600px] h-[40px] bg-blue-500/[0.03] rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between gap-4 relative z-10">
          {/* Left: Title + Status */}
          <div className="flex items-center gap-3 min-w-0">
            <div className={\`w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center transition-all duration-500 \${
              session === "active" ? "shadow-[0_0_20px_rgba(59,130,246,0.4)] animate-pulse-glow" : "shadow-[0_0_12px_rgba(59,130,246,0.15)]"
            }\`}>
              <span className="text-lg">🚗</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-[0.2em] text-white uppercase whitespace-nowrap leading-tight">
                GoldenHour
                <span className="text-gray-600 font-light ml-2 text-xs">
                  PRIVATE EMERGENCY
                </span>
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                {/* Live GPS indicator */}
                <div className="flex items-center gap-1">
                  <div className={\`w-1.5 h-1.5 rounded-full transition-colors duration-500 \${origin ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-amber-400 animate-pulse'}\`} />
                  <span className="text-[9px] font-mono text-gray-500 tracking-wider uppercase">
                    {origin ? 'GPS LIVE' : 'GPS ACQUIRING'}
                  </span>
                </div>
                {session === "active" && (
                  <div className="flex items-center gap-1 ml-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_6px_rgba(59,130,246,0.8)]" />
                    <span className="text-[9px] font-mono text-blue-400 tracking-wider uppercase font-bold">
                      CORRIDOR ACTIVE
                    </span>
                  </div>
                )}
                {plateSubmitted && (
                  <span className="text-[9px] text-emerald-500 font-mono tracking-widest px-1.5 py-0.5 bg-emerald-500/10 rounded ml-1 border border-emerald-500/20">
                    {plateNumber.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Activation Button */}
          <div className="flex-shrink-0 flex items-center gap-4">
            {session === "idle" && (
              <button
                onClick={requestCorridor}
                disabled={!plateSubmitted || !mapReady}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 flex items-center gap-2 whitespace-nowrap border border-blue-500/30"
              >
                {!mapReady ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>🚨 Request Emergency Corridor</>
                )}
              </button>
            )}
            {session === "pending" && (
               <button className="px-6 py-2.5 bg-amber-600/20 text-amber-500 border border-amber-500/30 font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl flex items-center gap-2" disabled>
                 <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /> Awaiting Approval
               </button>
            )}
            {session === "active" && (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-6 py-2.5 bg-gray-900/60 hover:bg-gray-800/80 text-gray-300 border border-gray-600/50 font-bold tracking-[0.15em] text-[11px] uppercase rounded-xl transition-all duration-300 whitespace-nowrap"
              >
                ⏹ Terminate
              </button>
            )}
            <Link href="/" className="text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest transition-colors ml-2">
              Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-5 lg:p-6 gap-5 overflow-hidden relative z-10 max-w-[2000px] mx-auto w-full">
        {/* Top: Stats Bar */}
        <div className="shrink-0">
          <DashboardStats
            activeEmergencies={session === "active" ? 1 : 0}
            availableAmbulances={availableAmbulances.length}
            resolvedToday={1}
            greenSignalsActivated={sim.trafficSignals.filter(s => s.status === 'green').length}
          />
        </div>

        {/* Middle/Bottom: Split View */}
        <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0">
          {/* Main Map Area */}
          <div className={\`flex-[2] lg:flex-[3] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.4)] bg-[#0B1221] border relative transition-all duration-1000 \${
            session === "active"
              ? 'border-blue-500/30 shadow-[0_0_60px_rgba(59,130,246,0.15)] animate-border-glow'
              : 'border-white/[0.06]'
          }\`}>
            {mapReady ? (
               <MapView
                origin={origin}
                ambulancePosition={session === "active" ? (sim.ambulancePosition || origin) : null}
                destination={activeMode === "DRIVING_TO_HOSPITAL" ? (selectedHospitalId ? hospitals.find(h => h.id === selectedHospitalId)?.location : DESTINATION) : origin}
                destinationName={destName}
                routePoints={routePoints}
                isEmergencyActive={session === "active"}
                bearing={sim.bearing} 
                etaMinutes={sim.etaMinutes}
                remainingDistanceM={sim.remainingDistanceM}
                trafficSignals={sim.trafficSignals}
                dummyCars={session === "active" ? sim.dummyCars : []}
                nearbyAmbulances={session === "idle" ? nearbyAmbulances.filter(a => a.lat && a.lng).map(a => ({ id: a.id, lat: a.lat!, lng: a.lng! })) : []}
                viewMode="ambulance"
                hospitals={hospitals}
                selectedHospitalId={selectedHospitalId}
                onHospitalSelect={handleHospitalSelect}
                currentLeg={currentLeg}
                ambulanceDepot={ambulanceDepot}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-[#0B1221]">
                <div className="relative">
                  <div className="w-14 h-14 border-[3px] border-[#2979FF]/15 border-t-[#2979FF] rounded-full animate-spin" />
                  <div className="absolute inset-1 w-12 h-12 border-[3px] border-transparent border-b-blue-400/25 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />
                  <div className="absolute inset-0 w-14 h-14 rounded-full shadow-[0_0_30px_rgba(41,121,255,0.15)]" />
                </div>
                <p className="mt-5 font-mono text-gray-500 text-[10px] tracking-[0.25em] uppercase">
                  Initializing Map Engine
                </p>
                <div className="mt-2 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-blue-500/40 animate-pulse" style={{ animationDelay: \`\${i * 300}ms\` }} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Hospital/Ambulance Cards */}
          <div id="hospital-cards-panel" className="flex-[1] lg:w-[32%] lg:h-full overflow-y-auto dark-scroll p-5 flex flex-col gap-3.5 rounded-2xl border border-white/[0.06] bg-[#0B1221]/80 backdrop-blur-2xl shadow-2xl">
            {session === "idle" ? (
              <>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-white font-bold tracking-[0.15em] uppercase text-[11px] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <span className="text-xs">🚑</span>
                    </div>
                    Nearby Ambulances
                    {nearbyAmbulances.length > 0 && (
                      <span className="text-[10px] text-gray-500 font-mono font-normal tracking-normal bg-white/[0.03] px-1.5 py-0.5 rounded">{nearbyAmbulances.length}</span>
                    )}
                  </h2>
                </div>

                {!plateSubmitted && (
                   <div className="p-3.5 rounded-xl border border-white/[0.05] bg-white/[0.02]">
                     <div className="text-[10px] uppercase text-gray-500 tracking-wider mb-2 font-mono flex items-center gap-1.5">
                        <span className="text-[8px] px-1 py-px bg-amber-500/20 text-amber-500 rounded border border-amber-500/30">LOCKED</span>
                        Vehicle Plate Number *
                     </div>
                     <div className="flex gap-2">
                       <input
                         className="flex-1 bg-[#050b14] border border-white/[0.1] rounded-lg px-3 py-2 text-sm font-mono text-white outline-none focus:border-blue-500/50"
                         type="text"
                         placeholder="MH-12-AB-1234"
                         value={plateNumber}
                         onChange={(e) => setPlateNumber(e.target.value)}
                         maxLength={15}
                       />
                       <button
                         onClick={handlePlateSubmit}
                         disabled={!plateNumber.trim()}
                         className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold tracking-widest text-[10px] uppercase rounded-lg border border-blue-500/20 transition-all disabled:opacity-50"
                       >
                         Set
                       </button>
                     </div>
                   </div>
                )}

                {/* List Ambulances using standard logic styled nicely */}
                {nearbyAmbulances.length === 0 ? (
                  <div className="text-center py-6 text-[10px] font-mono tracking-widest text-gray-500 uppercase"><div className="spinner border-t-blue-500 w-4 h-4 mx-auto mb-2 opacity-50"/>Scanning for Dispatch...</div>
                ) : (
                  nearbyAmbulances.map((a, i) => (
                    <div key={a.id} className="p-3.5 rounded-xl flex flex-col gap-3 transition-colors border bg-[#0B1221] hover:bg-white/[0.04] shadow-lg relative overflow-hidden group border-white/[0.06]">
                      {/* Gradient Accent Base */}
                      <div className={\`absolute top-0 left-0 bottom-0 w-1 \${
                        a.status === 'available' ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_0_10px_rgba(52,211,153,0.5)]' :
                        a.status === 'en-route' ? 'bg-gradient-to-b from-orange-400 to-orange-600 shadow-[0_0_10px_rgba(251,146,60,0.5)]' :
                        'bg-gradient-to-b from-red-400 to-red-600 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                      }\`} />
                      <div className="flex justify-between items-center pl-2 relative z-10">
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg opacity-80 group-hover:scale-110 transition-transform">🚑</span>
                          <div>
                            <div className="text-xs font-mono font-bold text-white tracking-wider title-glow">{a.id}</div>
                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">{a.distance} · {a.eta} AWAY</div>
                          </div>
                        </div>
                        <div className={\`text-[9px] font-mono uppercase tracking-widest px-2 py-1 flex items-center justify-center rounded border \${
                           a.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                           a.status === 'en-route' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                           'bg-red-500/10 text-red-400 border-red-500/20'
                        }\`}>
                          {a.status === 'available' && <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse mr-1.5"/>}
                          {a.status}
                        </div>
                      </div>
                      
                      {a.status !== "busy" && (
                        <div className="pl-2 relative z-10">
                          <button
                            onClick={() => assignAmbulance(a)}
                            disabled={!plateSubmitted}
                            className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold tracking-[0.1em] text-[10px] uppercase rounded-lg border border-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-50"
                          >
                            Assign Dispatch Request
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </>
            ) : (
               <>
                 <div className="flex items-center justify-between mb-1 mt-2">
                  <h2 className="text-white font-bold tracking-[0.15em] uppercase text-[11px] flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                      <span className="text-xs">🏥</span>
                    </div>
                    Route Path Facilities
                  </h2>
                </div>

                {/* Re-use HospitalCards logic directly */}
                {hospitals.slice(0, 5).map((h, i) => (
                  <HospitalCard
                    key={h.id}
                    hospital={h}
                    isNearest={i === 0 || h.id === selectedHospitalId}
                    isSelected={h.id === selectedHospitalId}
                    onSelect={(hospital) => handleHospitalSelect(hospital)}
                  />
                ))}
               </>
            )}

            {/* Session Logs Panel replacing Priority panel */}
            <div className={\`mt-auto pt-4 border-t border-white/[0.05] transition-all duration-500 \${session === 'idle' && nearbyAmbulances.length > 0 ? 'h-[140px]' : 'h-1/3'}\`}>
               <div className="text-[10px] font-mono tracking-widest text-gray-500 uppercase flex items-center gap-1.5 mb-2">
                 <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                 </svg>
                 Session Logs
               </div>
               <div className="h-full overflow-y-auto dark-scroll flex flex-col gap-1.5 text-[10px] font-mono pr-2 pb-5" ref={logRef}>
                 {log.map((e, i) => (
                   <div key={i} className="flex gap-2">
                     <span className="text-gray-600 shrink-0">[{e.time}]</span>
                     <span className={\`leading-snug \${
                       e.type === 'success' ? 'text-emerald-400' :
                       e.type === 'error' ? 'text-red-400' :
                       e.type === 'warn' ? 'text-amber-400' : 'text-gray-400'
                     }\`}>
                       {e.type === 'success' && <span className="mr-1">✓</span>}
                       {e.type === 'warn' && <span className="mr-1">⚠</span>}
                       {e.msg}
                     </span>
                   </div>
                 ))}
                 {log.length === 0 && <div className="text-gray-600 text-center mt-2 lowercase text-[9px] tracking-widest relative"><div className="flex gap-1 justify-center mb-1"><div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse"/><div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse opacity-50"/><div className="w-1 h-1 bg-gray-600 rounded-full animate-pulse opacity-25"/></div> awaiting action logs...</div>}
               </div>
            </div>
          </div>
        </div>
      </div>

       {/* Confirm Terminate Modal */}
       {showConfirm && (
        <div className="fixed inset-0 bg-[#020617]/80 backdrop-blur-sm z-[200] flex items-center justify-center">
          <div className="bg-[#0B1221] border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl border-glow">
            <h3 className="text-lg font-bold tracking-widest text-red-500 uppercase mb-2">Terminate Session?</h3>
            <p className="text-xs text-gray-400 leading-relaxed mb-6 font-mono">
              This will close the virtual corridor, lift the geo-fence, and clear all drivers alerts. Stop tracking?
            </p>
            <div className="flex gap-3">
              <button className="flex-1 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white text-[11px] font-bold tracking-wider uppercase transition-colors" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold tracking-wider uppercase transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]" onClick={terminate}>Terminate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

content = normalizedContent.substring(0, targetIndex) + newReturnContent;
fs.writeFileSync(filePath, content, 'utf8');
console.log("SUCCESS");
