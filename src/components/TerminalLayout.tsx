import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { Terminal, LayoutDashboard, GitBranch, Cpu, HardDrive, Wifi, Globe, Network, Menu, X, Upload, Download, Loader2, CheckCircle2, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { syncAllDataToSupabase, loadAllDataFromSupabase, syncAllDataToSupabaseWithTest, testSupabaseConnection, verifySyncFunctionality } from '@/lib/storage';

const TerminalLayout: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  // Removed sprint UI/state
  
  // Get current page name for terminal prompt
  const getCurrentPagePath = () => {
    const path = location.pathname;
    if (path === '/') return '/dashboard';
    return path;
  };

  // Removed sprint fetching/useEffect

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

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Navigation items
  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/kpis', icon: BarChart3, label: 'Weekly KPIs' },
    { path: '/visualizer', icon: BarChart3, label: 'Analytics' },
    { path: '/roadmap', icon: GitBranch, label: 'Roadmap' }
  ];

  // Format time with leading zeros
  const formatTimeComponent = (n: number) => n.toString().padStart(2, '0');
  const formattedTime = `${formatTimeComponent(currentTime.getHours())}:${formatTimeComponent(currentTime.getMinutes())}:${formatTimeComponent(currentTime.getSeconds())}`;

  // Handle test connection
  const handleTestConnection = async () => {
    if (isTesting) return;
    
    setIsTesting(true);
    setSyncMessage('Testing...');
    
    try {
      const result = await testSupabaseConnection();
      setSyncMessage(`Test: ${result.message}`);
      console.log('Connection test results:', result);
      
      setTimeout(() => setSyncMessage(''), 5000);
    } catch (error) {
      setSyncMessage('Test failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsTesting(false);
    }
  };

  // Handle upload to Supabase
  const handleUploadToSupabase = async () => {
    if (isUploading) return;
    
    setIsUploading(true);
    setSyncMessage('Testing connection...');
    
    try {
      const result = await syncAllDataToSupabaseWithTest();
      setSyncMessage(result.message);
      
      if (result.success) {
        setTimeout(() => setSyncMessage(''), 5000); // Clear success message after 5s
      }
    } catch (error) {
      setSyncMessage('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
    }
  };

  // Handle download from Supabase
  const handleDownloadFromSupabase = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setSyncMessage('');
    
    try {
      const result = await loadAllDataFromSupabase();
      setSyncMessage(result.message);
      
      if (result.success) {
        setTimeout(() => setSyncMessage(''), 3000); // Clear success message after 3s
        // Refresh the page to show updated data
        window.location.reload();
      }
    } catch (error) {
      setSyncMessage('Download failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle sync verification
  const handleVerifySync = async () => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setSyncMessage('Verifying sync...');
    
    try {
      const result = await verifySyncFunctionality();
      setSyncMessage(result.message);
      
      if (result.success) {
        console.log('✅ Sync verification successful:', result.details);
        setTimeout(() => setSyncMessage(''), 5000);
      } else {
        console.error('❌ Sync verification failed:', result.details);
      }
    } catch (error) {
      setSyncMessage('Verification failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-[#8A8D93] font-mono">
      {/* Top header bar with time and system info */}
      <div className="flex justify-between items-center px-2 sm:px-4 py-1 border-b border-[#333] bg-sidebar text-xs">
        <div className="text-[#4eb4ff] text-lg sm:text-xl font-bold tracking-widest">
          {formattedTime}
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs uppercase">
          <span className="text-[#8A8D93] mr-3">USER: NOCTISIUM</span>
          <span className="text-[#8A8D93]">OS: DEBIAN LINUX WIRED</span>
          
          {/* Sync Controls */}
          <div className="flex items-center gap-1 ml-4">
            {syncMessage && (
              <div className={`text-xs px-1 ${
                syncMessage.includes('success') || syncMessage.includes('accessible') ? 'text-[#5FE3B3]' : 'text-[#FF6B6B]'
              }`}>
                {syncMessage.slice(0, 25)}...
              </div>
            )}
            
            <button
              onClick={handleTestConnection}
              disabled={isUploading || isDownloading || isTesting}
              className="p-1 hover:bg-[#333] transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
              title="Test Supabase connection"
            >
              {isTesting ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                '?'
              )}
            </button>
            
            <button
              onClick={handleUploadToSupabase}
              disabled={isUploading || isDownloading || isTesting}
              className="p-1 hover:bg-[#333] transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
              title="Upload all data to Supabase"
            >
              {isUploading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Upload size={10} />
              )}
            </button>
            
            <button
              onClick={handleDownloadFromSupabase}
              disabled={isUploading || isDownloading || isTesting}
              className="p-1 hover:bg-[#333] transition-colors min-h-[24px] min-w-[24px] flex items-center justify-center"
              title="Download all data from Supabase"
            >
              {isDownloading ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Download size={10} />
              )}
            </button>
          </div>
        </div>
        {/* Mobile menu button */}
        <button
          className="sm:hidden p-2 hover:bg-[#333] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          {/* Terminal top bar */}
          <div className="flex flex-col p-1 bg-sidebar border-b border-[#333] text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center overflow-hidden">
                <Terminal size={14} className="mr-2 text-[#5FE3B3] shrink-0" />
                <span className="mr-4 truncate">noctisium@terminal:~$ cd {getCurrentPagePath()}</span>
                <span className={cn("shrink-0", cursorVisible ? "opacity-100" : "opacity-0")}>_</span>
              </div>
              <div className="hidden md:flex gap-2 lg:gap-4 text-xs">
                <span className="flex items-center">
                  <Cpu size={12} className="mr-1" /> {systemStats.cpu}%
                </span>
                <span className="hidden lg:block">RAM: {systemStats.ram}%</span>
                <span className="flex items-center">
                  <HardDrive size={12} className="mr-1" /> {systemStats.disk}%
                </span>
                <span className="hidden lg:flex items-center">
                  <Wifi size={12} className="mr-1" /> {systemStats.net} KB/s
                </span>
                {/* Sprint indicators removed */}
              </div>

            </div>
            {/* Sprint progress bar removed */}
          </div>

          {/* Terminal content */}
          <div className="flex flex-1 min-h-0">
            {/* Side navigation - Mobile overlay when menu is open */}
            {mobileMenuOpen && (
              <div 
                className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
            )}
            
            <div className={cn(
              "border-r border-[#333] bg-sidebar shrink-0 z-50",
              "sm:relative sm:z-auto",
              mobileMenuOpen 
                ? "fixed left-0 top-0 h-full w-64 sm:w-16 md:w-48" 
                : "w-12 sm:w-16 md:w-48"
            )}>
              <nav className="p-1 sm:p-2">
                <div className="mb-4 text-center sm:text-left text-xs opacity-70 hidden md:block">
                  -- Navigation --
                </div>
                <ul className="space-y-1 sm:space-y-2">
                  {navItems.map((item) => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={cn(
                          "flex items-center justify-center md:justify-start p-3 hover:bg-[#5FE3B3] hover:text-black transition-colors text-xs min-h-[44px] rounded-sm",
                          location.pathname === item.path && "bg-[#1D1D1D]",
                          mobileMenuOpen ? "justify-start pl-4" : ""
                        )}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <item.icon className="h-5 w-5 md:h-4 md:w-4 md:mr-2 shrink-0" />
                        <span className={cn(
                          "hidden md:inline ml-2",
                          mobileMenuOpen && "inline"
                        )}>
                          {item.label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>

            {/* Main content */}
            <div className="flex-1 bg-panel p-2 sm:p-4 overflow-y-auto relative min-h-0">
              <Outlet />
              <div className="absolute bottom-4 right-4 h-4 flex items-center">
                <span className={cn("w-2 h-4 bg-[#5FE3B3]", cursorVisible ? "opacity-100" : "opacity-0")}></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer branding */}
      <div className="border-t border-accent-pink bg-sidebar text-[10px] sm:text-[12px] p-1 flex justify-center shrink-0">
        <span className="text-accent-cyan/70">noctisium v0.3.2 — uptime: 23 d</span>
      </div>
    </div>
  );
};

export default TerminalLayout;

