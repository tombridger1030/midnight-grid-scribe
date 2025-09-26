import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const SubNavButton: React.FC<{ to: string; label: string; active: boolean }> = ({ to, label, active }) => (
  <Link
    to={to}
    className={cn(
      'px-3 py-1.5 rounded-sm text-xs uppercase tracking-wide border',
      active ? 'bg-accent-cyan text-black border-accent-cyan cyberpunk-glow-cyan' : 'bg-[#1D1D1D] text-[#8A8D93] border-[#333] hover:bg-accent-cyan/10 hover:text-accent-cyan hover:border-accent-cyan/30 cyberpunk-tab'
    )}
  >
    {label}
  </Link>
);

const Content: React.FC = () => {
  const location = useLocation();
  const base = '/content';
  const isDashboard = location.pathname === base || location.pathname === `${base}/dashboard`;
  const isWeekly = location.pathname === `${base}/weekly`;
  const isInput = location.pathname === `${base}/input`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-terminal-accent text-sm cyberpunk-header">Content</div>
        <div className="flex items-center gap-2">
          <SubNavButton to={`${base}/dashboard`} label="Dashboard" active={isDashboard} />
          <SubNavButton to={`${base}/weekly`} label="Weekly Review" active={isWeekly} />
          <SubNavButton to={`${base}/input`} label="Per Content Input" active={isInput} />
        </div>
      </div>

      {/* Cyberpunk Divider */}
      <div className="cyberpunk-divider"></div>

      <div className="border border-[#333] bg-[#0F0F0F] rounded-sm p-3">
        <Outlet />
      </div>
    </div>
  );
};

export default Content;


