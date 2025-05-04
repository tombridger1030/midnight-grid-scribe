
import MidnightTracker from '@/components/MidnightTracker';
import TypewriterText from '@/components/TypewriterText';

const Index = () => {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <TypewriterText text="Metrics Input" className="text-xl mb-2" />
        <p className="text-terminal-accent/70 text-sm">Track your sprint metrics and habits.</p>
      </div>
      <div className="flex-1">
        <MidnightTracker />
      </div>
    </div>
  );
};

export default Index;
