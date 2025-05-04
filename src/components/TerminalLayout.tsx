
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Terminal, LayoutDashboard, Calendar, GitBranch, Square, Cpu, HardDrive, Wifi, Globe, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

const TerminalLayout: React.FC = () => {
  const location = useLocation();
  const [systemStats, setSystemStats] = useState({
    cpu: Math.floor(Math.random() * 30) + 10,
    ram: Math.floor(Math.random() * 40) + 30,
    disk: Math.floor(Math.random() * 20) + 5,
    net: Math.floor(Math.random() * 100)
  });
  const [cursorVisible, setCursorVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [networkStatus, setNetworkStatus] = useState({
    state: 'ONLINE',
    ipv4: '86.255.116.139',
    ping: '14ms'
  });
  
  // Calculate sprint day
  const calculateSprintDay = () => {
    const startDate = new Date(2025, 0, 1); // Jan 1, 2025
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const sprintLength = 28; // 21 days on + 7 days off
    const dayOfSprint = (diffDays % sprintLength) + 1;
    const isOnPeriod = dayOfSprint <= 21;
    
    return { dayOfSprint, isOnPeriod };
  };

  // Simulate changing system stats
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStats({
        cpu: Math.floor(Math.random() * 30) + 10,
        ram: Math.floor(Math.random() * 40) + 30,
        disk: Math.floor(Math.random() * 20) + 5,
        net: Math.floor(Math.random() * 100)
      });
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530);
    
    return () => clearInterval(cursorInterval);
  }, []);

  // Update current time
  useEffect(() => {
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timeInterval);
  }, []);

  // Navigation items
  const navItems = [
    { path: '/', icon: Square, label: 'Metrics' },
    { path: '/visualizer', icon: LayoutDashboard, label: 'Visualizer' },
    { path: '/schedule', icon: Calendar, label: 'Schedule' },
    { path: '/roadmap', icon: GitBranch, label: 'Roadmap' }
  ];

  const sprint = calculateSprintDay();

  // Format time with leading zeros
  const formatTimeComponent = (n: number) => n.toString().padStart(2, '0');
  const formattedTime = `${formatTimeComponent(currentTime.getHours())}:${formatTimeComponent(currentTime.getMinutes())}:${formatTimeComponent(currentTime.getSeconds())}`;

  return (
    <div className="flex flex-col min-h-screen bg-black text-[#8A8D93] font-mono">
      {/* Top header bar with time and system info */}
      <div className="flex justify-between items-center px-4 py-1 border-b border-[#333] bg-[#121212] text-xs">
        <div className="text-[#4eb4ff] text-xl font-bold tracking-widest">
          {formattedTime}
        </div>
        <div className="text-xs uppercase">
          <span className="text-[#8A8D93] mr-3">USER: MIDNIGHT</span>
          <span className="text-[#8A8D93]">OS: DEBIAN LINUX WIRED</span>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Left sidebar with system stats */}
        <div className="w-48 border-r border-[#333] bg-[#121212] p-3 shrink-0 flex flex-col">
          <div className="mb-4">
            <div className="uppercase text-[#8A8D93] text-xs mb-1">CPU USAGE</div>
            <div className="flex items-center text-xs mb-1">
              <div className="w-2 h-2 rounded-full mr-1 bg-[#53B4FF]"></div>
              <span className="text-[#53B4FF] mr-1">1-2</span>
              <div className="flex-1 h-4 bg-[#1D1D1D] relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-[#53B4FF] opacity-30"
                  style={{ width: `${systemStats.cpu}%` }}
                ></div>
                <svg className="h-4 w-full">
                  <polyline 
                    points="0,15 10,8 20,12 30,10 40,13 50,7 60,11 70,9 80,14" 
                    fill="none" 
                    stroke="#53B4FF" 
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center text-xs">
              <div className="w-2 h-2 rounded-full mr-1 bg-[#5FE3B3]"></div>
              <span className="text-[#5FE3B3] mr-1">3-4</span>
              <div className="flex-1 h-4 bg-[#1D1D1D] relative overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-[#5FE3B3] opacity-30"
                  style={{ width: `${systemStats.ram}%` }}
                ></div>
                <svg className="h-4 w-full">
                  <polyline 
                    points="0,10 10,13 20,9 30,11 40,8 50,12 60,9 70,14 80,11" 
                    fill="none" 
                    stroke="#5FE3B3" 
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="uppercase text-[#8A8D93] text-xs mb-1">TEMP</div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div className="text-[#8A8D93]">44°C</div>
              <div className="text-center text-[#5FE3B3]">52°min</div>
              <div className="text-right text-[#ff5858]">89°max</div>
            </div>
          </div>

          <div className="mb-4">
            <div className="uppercase text-[#8A8D93] text-xs mb-1">MEMORY</div>
            <div className="text-xs text-[#8A8D93] mb-1">USING 15 OUT OF 32 GB</div>
            <div className="grid grid-cols-8 gap-[2px]">
              {Array.from({ length: 32 }).map((_, i) => (
                <div 
                  key={i}
                  className={`aspect-square border border-[#333] ${i < 15 ? 'bg-[#5FE3B3]/60' : 'bg-[#1D1D1D]'}`}
                ></div>
              ))}
            </div>
          </div>

          <div>
            <div className="uppercase text-[#8A8D93] text-xs mb-1">TOP PROCESSES</div>
            <div className="text-[10px] grid grid-cols-[20px_auto_30px_30px] gap-x-1 gap-y-[2px]">
              <div className="text-[#8A8D93]">PID</div>
              <div className="text-[#8A8D93]">NAME</div>
              <div className="text-[#8A8D93]">CPU</div>
              <div className="text-[#8A8D93]">MEM</div>

              <div>1</div>
              <div className="text-[#5FE3B3]">metrics</div>
              <div>20%</div>
              <div>0.8%</div>

              <div>2</div>
              <div className="text-[#53B4FF]">visualize</div>
              <div>15%</div>
              <div>0.6%</div>

              <div>3</div>
              <div className="text-[#FFD700]">schedule</div>
              <div>12%</div>
              <div>1.2%</div>

              <div>4</div>
              <div className="text-[#ff5858]">roadmap</div>
              <div>8%</div>
              <div>0.7%</div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col">
          {/* Terminal top bar */}
          <div className="flex items-center justify-between p-1 bg-[#121212] border-b border-[#333] text-xs">
            <div className="flex items-center">
              <Terminal size={14} className="mr-2 text-[#5FE3B3]" />
              <span className="mr-4">midnight@terminal:~$ cd /metrics</span>
              <span className={cursorVisible ? "opacity-100" : "opacity-0"}>_</span>
            </div>
            <div className="flex gap-4">
              <span className="flex items-center">
                <Cpu size={12} className="mr-1" /> {systemStats.cpu}%
              </span>
              <span>RAM: {systemStats.ram}%</span>
              <span className="flex items-center">
                <HardDrive size={12} className="mr-1" /> {systemStats.disk}%
              </span>
              <span className="flex items-center">
                <Wifi size={12} className="mr-1" /> {systemStats.net} KB/s
              </span>
              <span className={sprint.isOnPeriod ? "text-[#5FE3B3]" : "text-[#53B4FF]"}>
                Sprint: {sprint.dayOfSprint}/{sprint.isOnPeriod ? "21" : "28"}
              </span>
            </div>
          </div>

          {/* Terminal content */}
          <div className="flex flex-1">
            {/* Side navigation */}
            <div className="w-16 sm:w-48 border-r border-[#333] bg-[#121212] shrink-0">
              <nav className="p-2">
                <div className="mb-4 text-center sm:text-left text-xs opacity-70 hidden sm:block">
                  -- Navigation --
                </div>
                <ul className="space-y-2">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center p-2 hover:bg-[#5FE3B3] hover:text-black transition-colors text-xs",
                          location.pathname === item.path && "bg-[#1D1D1D]"
                        )}
                      >
                        <item.icon className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{item.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 bg-[#0C0C0C] p-4 overflow-auto relative">
              <Outlet />
              <div className="absolute bottom-2 left-2 h-4 flex items-center">
                <span className={cn("w-2 h-4 bg-[#5FE3B3]", cursorVisible ? "opacity-100" : "opacity-0")}></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l border-[#333] bg-[#121212] p-3 shrink-0 hidden lg:block">
          <div className="mb-6">
            <div className="uppercase text-xs mb-2 text-[#8A8D93] border-b border-[#333] pb-1">NETWORK STATUS</div>
            <div className="grid grid-cols-2 text-xs gap-y-1">
              <div className="text-[#8A8D93]">STATE</div>
              <div>
                <span className="text-[#5FE3B3] mr-2">ONLINE</span>
                {networkStatus.ipv4}
              </div>
              <div></div>
              <div className="text-right">{networkStatus.ping}</div>
            </div>
          </div>
          
          <div className="mb-6">
            <div className="uppercase text-xs mb-2 text-[#8A8D93] border-b border-[#333] pb-1">WORLD VIEW</div>
            <div className="h-40 flex items-center justify-center opacity-60">
              <Globe className="w-32 h-32 text-[#53B4FF]" strokeWidth={0.5} />
            </div>
            <div className="text-[10px] text-center text-[#8A8D93]">
              <span>ENDPOINT: LATLON</span>
              <span className="ml-4 text-[#53B4FF]">86.255.116.139</span>
            </div>
          </div>

          <div>
            <div className="uppercase text-xs mb-2 text-[#8A8D93] border-b border-[#333] pb-1">NETWORK TRAFFIC</div>
            <div className="text-[10px] mb-1 flex justify-between">
              <span>TOTAL</span>
              <span>69.3 MB IN | 7.9 MB OUT</span>
            </div>
            <div className="h-24 flex items-center">
              <div className="w-full bg-[#1D1D1D] h-full relative overflow-hidden">
                <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <polyline 
                    points="0,50 10,48 20,45 30,52 40,40 50,60 60,45 70,55 80,50 90,40 100,45" 
                    fill="none" 
                    stroke="#53B4FF" 
                    strokeWidth="1"
                  />
                  <polyline 
                    points="0,70 10,65 20,75 30,68 40,72 50,80 60,75 70,78 80,70 90,75 100,72" 
                    fill="none" 
                    stroke="#5FE3B3" 
                    strokeWidth="1"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal command line at bottom */}
      <div className="border-t border-[#333] bg-[#121212] text-xs p-1 flex justify-between">
        <span className="text-[#8A8D93]">~$ ./ADEX-UI</span>
        <span className="text-[#8A8D93] opacity-60">uptime: 23 days 4 hours 16 minutes</span>
      </div>
    </div>
  );
};

export default TerminalLayout;
