import React, { useState, useEffect } from 'react';
import { ExternalLink, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { ResourceContent } from '../../types';

interface ResourceStageProps {
  config: ResourceContent;
  onComplete: () => void;
}

export const ResourceStage: React.FC<ResourceStageProps> = ({ config, onComplete }) => {
  const [canContinue, setCanContinue] = useState(false);
  const [timer, setTimer] = useState(10);

  // Reset timer when config changes (new lesson)
  useEffect(() => {
    setTimer(10);
    setCanContinue(false);
  }, [config]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setCanContinue(true);
    }
  }, [timer]);

  const openResource = () => {
    window.open(config.url, '_blank');
  };

  return (
    <div className="min-h-screen w-full bg-transparent overflow-y-auto animate-in fade-in duration-500">
      <div className="flex flex-col items-center justify-center min-h-screen p-6 py-12">
        
        <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark p-8 rounded-3xl max-w-lg w-full text-center shadow-2xl relative">
          
          <div className="bg-gravity-light dark:bg-gravity-dark w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-gravity-border-light dark:border-gravity-border-dark">
             <ExternalLink className="w-10 h-10 text-gravity-blue" />
          </div>
          
          <h2 className="text-2xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2 uppercase tracking-wide">External Link</h2>
          <p className="text-xs font-bold text-gravity-blue font-mono mb-6 pb-4 inline-block">
             SOURCE: {config.sourceName}
          </p>
          
          <h3 className="text-xl font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-6">"{config.title}"</h3>
          
          <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark leading-relaxed mb-8 text-left font-medium bg-gravity-light dark:bg-black/10 p-6 rounded-2xl">
            {config.summary}
          </p>

          <div className="space-y-4">
            <Button 
              onClick={openResource}
              fullWidth 
              variant="outline" 
              className="h-14 text-lg border-gravity-blue/30 text-gravity-blue hover:bg-gravity-blue/5"
            >
               Open Resource <ExternalLink className="w-5 h-5" />
            </Button>

            <Button 
              onClick={onComplete}
              fullWidth
              variant="primary"
              disabled={!canContinue}
              className="h-14"
            >
               {canContinue ? (
                 <>Mark Read <CheckCircle className="w-5 h-5" /></>
               ) : (
                 <>Reading... ({timer}s) <Clock className="w-5 h-5" /></>
               )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
