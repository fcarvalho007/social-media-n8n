import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface DeviceFrameProps {
  type: 'phone' | 'desktop';
  children: ReactNode;
  className?: string;
}

export function DeviceFrame({ type, children, className }: DeviceFrameProps) {
  if (type === 'phone') {
    return (
      <div className={cn("relative mx-auto", className)} style={{ maxWidth: '320px' }}>
        {/* Phone Frame */}
        <div className="rounded-[2.5rem] border-[10px] border-gray-900 dark:border-gray-700 bg-gray-900 dark:bg-gray-700 shadow-xl">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-gray-900 dark:bg-gray-700 rounded-b-2xl z-10" />
          
          {/* Dynamic Island indicator */}
          <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-3 bg-black rounded-full z-20" />
          
          {/* Screen */}
          <div className="rounded-[1.75rem] overflow-hidden bg-background relative">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-6 py-1.5 bg-background text-xs">
              <span className="font-medium">9:41</span>
              <div className="flex items-center gap-1">
                <div className="flex gap-0.5">
                  {[...Array(4)].map((_, i) => (
                    <div 
                      key={i} 
                      className="w-1 bg-foreground rounded-sm" 
                      style={{ height: `${8 + i * 2}px` }}
                    />
                  ))}
                </div>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/>
                </svg>
              </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto max-h-[540px]">
              {children}
            </div>
          </div>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gray-600 rounded-full" />
      </div>
    );
  }

  // Desktop Frame
  return (
    <div className={cn("relative mx-auto", className)} style={{ maxWidth: '100%' }}>
      {/* Browser Frame */}
      <div className="rounded-lg border border-border shadow-lg overflow-hidden bg-background">
        {/* Browser Top Bar */}
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b">
          {/* Traffic Lights */}
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          
          {/* URL Bar */}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-background/80 rounded-md px-3 py-1 text-xs text-muted-foreground flex items-center gap-2 min-w-[200px]">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="m7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <span>linkedin.com</span>
            </div>
          </div>
          
          <div className="w-16" /> {/* Spacer for symmetry */}
        </div>
        
        {/* Browser Content */}
        <div className="overflow-y-auto max-h-[500px]">
          {children}
        </div>
      </div>
    </div>
  );
}
