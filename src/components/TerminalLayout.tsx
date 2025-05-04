
import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Terminal, LayoutDashboard, Calendar, GitBranch, Square } from 'lucide-react';
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

  return (
    <div className="flex flex-col min-h-screen bg-terminal-bg text-terminal-text font-mono">
      {/* Terminal top bar */}
      <div className="flex items-center justify-between p-1 border-b border-terminal-accent text-xs">
        <div className="flex items-center">
          <Terminal size={14} className="mr-2" />
          <span className="mr-4">midnight@terminal:~$</span>
          <span className="opacity-70">{currentTime.toLocaleTimeString()}</span>
        </div>
        <div className="flex gap-4">
          <span>CPU: {systemStats.cpu}%</span>
          <span>RAM: {systemStats.ram}%</span>
          <span>DISK: {systemStats.disk}%</span>
          <span>NET: {systemStats.net} KB/s</span>
        </div>
      </div>

      {/* Terminal window with border */}
      <div className="flex flex-1 border border-terminal-accent/30 m-2">
        {/* Side navigation */}
        <div className="w-16 sm:w-48 border-r border-terminal-accent/50 shrink-0">
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
                      "flex items-center p-2 hover:bg-terminal-accent hover:text-terminal-bg transition-colors",
                      location.pathname === item.path && "bg-terminal-accent/30"
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
            <span className={cn("w-2 h-4 bg-terminal-accent/70", cursorVisible ? "opacity-100" : "opacity-0")}></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalLayout;
