import React, { useState, useRef } from 'react';
import { InteractiveWidget } from '../../types';
import { Button } from '../ui/Button';
import { Sliders, Shuffle, PenTool, Wand2, RefreshCcw, Upload, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { editImageWithGemini } from '../../services/gemini';
import EnhancedSlider from './EnhancedSlider';
import { CheckCircle } from 'lucide-react';

interface InteractiveStageProps {
  config: InteractiveWidget;
  onComplete: () => void;
}

export const InteractiveStage: React.FC<InteractiveStageProps> = ({ config, onComplete }) => {
  const [status, setStatus] = useState<'active' | 'success'>('active');

  const handleSuccess = () => {
    setStatus('success');
    confetti({
       particleCount: 100,
       spread: 70,
       origin: { y: 0.6 },
       colors: ['#1A73E8', '#34A853']
    });
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
    audio.volume = 0.2;
    audio.play().catch(()=>{});
  };

  return (
    <div className="flex flex-col h-full text-gravity-text-main-light dark:text-gravity-text-main-dark">
      <div className="text-center mb-6 shrink-0">
         <h2 className="text-2xl font-black flex items-center justify-center gap-3 uppercase tracking-tight">
           {config.type === 'simulation' && <Sliders className="w-6 h-6 text-gravity-blue" />}
           {config.type === 'sorting' && <Shuffle className="w-6 h-6 text-gravity-accent" />}
           {config.type === 'canvas' && <PenTool className="w-6 h-6 text-gravity-success" />}
           {config.type === 'image-editor' && <Wand2 className="w-6 h-6 text-gravity-danger" />}
           Interactive Task
         </h2>
         <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-medium text-sm mt-2">{config.instruction}</p>
      </div>

      <div className="flex-1 bg-gravity-surface-light dark:bg-gravity-surface-dark rounded-3xl border border-gravity-border-light dark:border-gravity-border-dark p-6 relative shadow-inner overflow-y-auto">
         {config.type === 'simulation' && <SimulationWidget config={config} onSuccess={handleSuccess} />}
         {config.type === 'sorting' && <SortingWidget config={config} onSuccess={handleSuccess} />}
         {config.type === 'canvas' && <CanvasWidget config={config} onSuccess={handleSuccess} />}
         {config.type === 'image-editor' && <ImageEditorWidget config={config} onSuccess={handleSuccess} />}
      </div>

      {status === 'success' && (
        <div className="mt-6 shrink-0 animate-in slide-in-from-bottom duration-500">
           <div className="bg-gravity-success/10 border border-gravity-success text-gravity-success p-4 mb-4 rounded-xl">
              <p className="font-bold uppercase tracking-wider text-xs mb-1">Success</p>
              <p>{config.feedback}</p>
           </div>
           <Button fullWidth variant="primary" onClick={onComplete}>Continue</Button>
        </div>
      )}
    </div>
  );
};

const SimulationWidget = ({ config, onSuccess }: { config: InteractiveWidget, onSuccess: () => void }) => {
   const [values, setValues] = useState<Record<string, number>>({});
   const [submitted, setSubmitted] = useState(false);
   const [allCorrect, setAllCorrect] = useState(false);

   const handleChange = (label: string, val: number) => {
     setValues(prev => ({ ...prev, [label]: val }));
     
     // Check if all parameters are correct in real-time
     const correct = config.params?.every(p => {
        const currentVal = values[p.label] !== undefined ? values[p.label] : p.min;
        const tolerance = (p.max - p.min) * 0.15; // ±15% tolerance
        return Math.abs(currentVal - p.targetValue) <= tolerance;
     });
     setAllCorrect(correct || false);
   };

   const check = () => {
     setSubmitted(true);
     const correct = config.params?.every(p => {
        const val = values[p.label] || p.min;
        const tolerance = (p.max - p.min) * 0.15; // ±15% tolerance
        return Math.abs(val - p.targetValue) <= tolerance;
     });

     if (correct) {
       onSuccess();
     } else {
        setTimeout(() => setSubmitted(false), 1500);
     }
   };

   return (
     <div className="flex flex-col justify-center gap-8 max-w-lg mx-auto w-full py-4">
        <div className="text-center mb-4">
          <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
            Adjust the sliders to find the correct values. Green zones indicate correct ranges.
          </p>
        </div>
        
        {config.params?.map((p) => (
           <EnhancedSlider
             key={p.label}
             config={p}
             value={values[p.label] || p.min}
             onChange={(val) => handleChange(p.label, val)}
             disabled={submitted}
           />
        ))}
        
        <div className="mt-6 space-y-3">
          {!submitted && (
            <Button 
             onClick={check} 
             variant={allCorrect ? "primary" : "primary"}
             fullWidth
             className={allCorrect ? "bg-gravity-success hover:bg-green-600" : ""}
           >
             {allCorrect ? (
               <span className="flex items-center gap-2">
                 <CheckCircle className="w-4 h-4" />
                 Perfect! Submit
               </span>
             ) : "Check Answer"}
           </Button>
          )}
          {submitted && (
            <div className="text-center">
              <div className="text-gravity-danger font-bold animate-pulse mb-2">
                Keep adjusting...
              </div>
              <div className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
                Look for the green zones on each slider
              </div>
            </div>
          )}
        </div>
     </div>
   );
};

const SortingWidget = ({ config, onSuccess }: { config: InteractiveWidget, onSuccess: () => void }) => {
    const [items, setItems] = useState<string[]>([]);

    React.useEffect(() => {
       if (config.items) setItems([...config.items].sort(() => Math.random() - 0.5));
    }, [config.items]);

    const move = (idx: number, direction: -1 | 1) => {
       const newItems = [...items];
       const swapIdx = idx + direction;
       if (swapIdx < 0 || swapIdx >= newItems.length) return;
       [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
       setItems(newItems);
    };

    const check = () => {
       if (JSON.stringify(items) === JSON.stringify(config.items)) onSuccess();
       else alert("Incorrect sequence.");
    };

    return (
       <div className="flex flex-col justify-center max-w-md mx-auto w-full py-4 space-y-3">
          {items.map((item, idx) => (
             <div key={idx} className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-gravity-light dark:bg-gravity-dark border border-gravity-border-light dark:border-gravity-border-dark p-4 rounded-xl flex-1 font-bold shadow-sm">
                   {item}
                </div>
                <div className="flex flex-col gap-1">
                   <button onClick={() => move(idx, -1)} className="p-1 text-gravity-blue hover:bg-gravity-blue/10 rounded" disabled={idx === 0}>▲</button>
                   <button onClick={() => move(idx, 1)} className="p-1 text-gravity-blue hover:bg-gravity-blue/10 rounded" disabled={idx === items.length-1}>▼</button>
                </div>
             </div>
          ))}
          <Button onClick={check} className="mt-4">Check Order</Button>
       </div>
    );
};

const CanvasWidget = ({ config, onSuccess }: { config: InteractiveWidget, onSuccess: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
       const canvas = canvasRef.current;
       if (!canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       setIsDrawing(true);
       const { x, y } = getPos(e, canvas);
       ctx.beginPath();
       ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
       if (!isDrawing) return;
       const canvas = canvasRef.current;
       if (!canvas) return;
       const ctx = canvas.getContext('2d');
       if (!ctx) return;
       const { x, y } = getPos(e, canvas);
       ctx.lineTo(x, y);
       ctx.strokeStyle = "#1A73E8";
       ctx.lineWidth = 4;
       ctx.lineCap = 'round';
       ctx.stroke();
    };

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
       const rect = canvas.getBoundingClientRect();
       const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
       const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
       return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const clear = () => {
       const canvas = canvasRef.current;
       const ctx = canvas?.getContext('2d');
       ctx?.clearRect(0, 0, canvas!.width, canvas!.height);
    };

    return (
       <div className="flex flex-col h-full items-center justify-center py-4">
          <div className="relative border-2 border-dashed border-gravity-border-light dark:border-gravity-border-dark rounded-xl bg-white mb-6 overflow-hidden">
             {config.backgroundImage && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 text-black select-none">
                   <span className="text-9xl font-serif">{config.backgroundImage}</span> 
                </div>
             )}
             <canvas 
                ref={canvasRef}
                width={300}
                height={300}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={() => setIsDrawing(false)}
                onMouseLeave={() => setIsDrawing(false)}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={() => setIsDrawing(false)}
                className="touch-none"
             />
          </div>
          <div className="flex gap-4 w-full max-w-xs">
             <Button variant="outline" onClick={clear}><RefreshCcw className="w-5 h-5" /></Button>
             <Button fullWidth onClick={onSuccess}>Done</Button>
          </div>
       </div>
    );
};

const ImageEditorWidget = ({ config, onSuccess }: { config: InteractiveWidget, onSuccess: () => void }) => {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setGeneratedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt) return;
    setLoading(true);
    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];
      const resultUrl = await editImageWithGemini(base64Data, mimeType, prompt);
      setGeneratedImage(resultUrl);
    } catch (error) {
      alert("Error generating image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full items-center max-w-lg mx-auto w-full gap-4 py-4">
      <div className="flex-1 w-full min-h-[200px] bg-gravity-light dark:bg-black/20 rounded-2xl border-2 border-dashed border-gravity-border-light dark:border-gravity-border-dark flex items-center justify-center relative overflow-hidden group hover:border-gravity-blue transition-colors">
         {!image && (
           <div className="text-center p-4" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-12 h-12 text-gravity-text-sub-light dark:text-gravity-text-sub-dark mx-auto mb-2" />
              <p className="font-bold cursor-pointer">Click to Upload</p>
           </div>
         )}
         {image && !generatedImage && <img src={image} alt="Original" className="object-contain max-h-full w-full" />}
         {generatedImage && <img src={generatedImage} alt="Edited" className="object-contain max-h-full w-full" />}
         
         {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex items-center justify-center">
               <Loader2 className="w-10 h-10 animate-spin text-gravity-blue" />
            </div>
         )}
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      <div className="w-full space-y-3 shrink-0">
         {image && !generatedImage && (
           <div className="flex gap-2">
             <input 
               type="text" 
               value={prompt}
               onChange={(e) => setPrompt(e.target.value)}
               placeholder="Edit prompt..."
               className="flex-1 p-3 bg-gravity-light dark:bg-black/20 border border-gravity-border-light dark:border-gravity-border-dark rounded-xl focus:border-gravity-blue focus:outline-none"
             />
             <Button onClick={handleEdit} disabled={!prompt || loading}><Wand2 className="w-5 h-5" /></Button>
           </div>
         )}
         {generatedImage && (
            <div className="flex gap-3">
               <Button variant="outline" fullWidth onClick={() => setGeneratedImage(null)}>Retry</Button>
               <Button variant="primary" fullWidth onClick={onSuccess}>Use This</Button>
            </div>
         )}
      </div>
    </div>
  );
};