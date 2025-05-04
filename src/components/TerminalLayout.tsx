
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Terminal, LayoutDashboard, Calendar, GitBranch, Square, Cpu, HardDrive, Wifi } from 'lucide-react';
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

  return (
    <div className="flex flex-col min-h-screen bg-[#1A1F2B] text-[#CED4DA] font-mono">
      {/* Terminal top bar */}
      <div className="flex items-center justify-between p-1 border-b border-[#5FE3B3]/30 text-xs">
        <div className="flex items-center">
          <Terminal size={14} className="mr-2 text-[#5FE3B3]" />
          <span className="mr-4">midnight@terminal:~$</span>
          <span className="opacity-70">{currentTime.toLocaleTimeString()}</span>
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

      {/* Terminal window with border */}
      <div className="flex flex-1 border border-[#5FE3B3]/30 m-2">
        {/* Side navigation */}
        <div className="w-16 sm:w-48 border-r border-[#5FE3B3]/50 shrink-0">
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
                      "flex items-center p-2 hover:bg-[#5FE3B3] hover:text-[#1A1F2B] transition-colors",
                      location.pathname === item.path && "bg-[#5FE3B3]/30"
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
        <div className="flex-1 p-1 sm:p-4 overflow-auto relative">
          <Outlet />
          <div className="absolute bottom-2 left-2 h-4 flex items-center">
            <span className={cn("w-2 h-4 bg-[#5FE3B3]", cursorVisible ? "opacity-100" : "opacity-0")}></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalLayout;
