import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Heart, CheckCircle, AlertCircle, LayoutDashboard } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from './ui/Button';
import { AppState } from '../types';
import { ResourceStage } from './interactive/ResourceStage';
import { InteractiveStage } from './interactive/InteractiveStage';

export const Lesson: React.FC = () => {
  const store = useStore();
  const { currentLesson, hearts, setAppState, completeLesson, processAnswer } = store;
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [stage, setStage] = useState<'intro' | 'interactive' | 'resource' | 'quiz' | 'complete'>('intro');

  useEffect(() => {
     if (!currentLesson) {
       setAppState(AppState.ROADMAP);
       return;
     }
     if (store.isReviewSession) {
       setStage('quiz');
     } else {
       setStage('intro');
     }
  }, [currentLesson, store.isReviewSession, setAppState]);

  if (!currentLesson) return null;

  const question = currentLesson.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex) / currentLesson.questions.length) * 100;

  const handleCheck = () => {
    let isCorrect = false;

    if (question.type === 'fill-blank') {
       isCorrect = textAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    } else {
       if (!selectedOption) return;
       isCorrect = selectedOption.toLowerCase() === question.correctAnswer.toLowerCase();
    }
    
    processAnswer(question.id, isCorrect);
    
    if (isCorrect) {
      setStatus('correct');
      const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); 
      sound.volume = 0.2;
      sound.play().catch(() => {});
    } else {
      setStatus('wrong');
      if (!store.isReviewSession) store.loseHeart();
      const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
      sound.volume = 0.2;
      sound.play().catch(() => {});
    }
  };

  const handleNext = () => {
    setStatus('idle');
    setSelectedOption(null);
    setTextAnswer('');
    if (currentQuestionIndex < currentLesson.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      finishLesson();
    }
  };

  const finishLesson = () => {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#34A853', '#1A73E8', '#FBBC04']
      });
      completeLesson(3);
      setStage('complete');
  };

  const startActualLesson = () => {
    if (currentLesson.type === 'interactive' && currentLesson.interactiveConfig) {
       setStage('interactive');
    } else if (currentLesson.type === 'resource' && currentLesson.resourceConfig) {
       setStage('resource');
    } else {
       setStage('quiz');
    }
  };

  if (stage === 'intro') {
     return (
        <div className="min-h-screen flex flex-col p-6 items-center justify-center text-center max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h2 className="text-2xl font-black text-gravity-blue mb-6 uppercase tracking-wider">
              {currentLesson.type === 'interactive' ? "Interactive Module" : "Knowledge Download"}
           </h2>
           <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark p-8 rounded-3xl mb-12 shadow-xl border border-gravity-border-light dark:border-gravity-border-dark">
             <p className="text-lg text-gravity-text-main-light dark:text-gravity-text-main-dark leading-relaxed font-medium">
               {currentLesson.intro}
             </p>
           </div>
           <Button fullWidth size="lg" onClick={startActualLesson} className="shadow-lg shadow-gravity-blue/30">Start Session</Button>
        </div>
     );
  }

  if (stage === 'resource' && currentLesson.resourceConfig) {
     return <ResourceStage key={currentLesson.chapterId} config={currentLesson.resourceConfig} onComplete={() => setStage('quiz')} />;
  }

  if (stage === 'interactive' && currentLesson.interactiveConfig) {
     return (
        <div className="h-screen p-4 flex flex-col overflow-hidden">
            <div className="mb-4 flex items-center justify-between shrink-0">
               <button onClick={() => setAppState(AppState.ROADMAP)}><X className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:text-gravity-danger" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
               <InteractiveStage config={currentLesson.interactiveConfig} onComplete={() => setStage('quiz')} />
            </div>
        </div>
     );
  }

  if (stage === 'complete') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-8 animate-bounce">
                 <div className="w-32 h-32 bg-gravity-success/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-gravity-success/20">
                    <CheckCircle className="w-16 h-16 text-gravity-success" />
                 </div>
                 <h1 className="text-4xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2 tracking-tight">COMPLETE</h1>
                 <p className="text-xl text-gravity-success font-bold">+10 XP</p>
              </div>

              <div className="w-full max-w-sm space-y-4">
                 <Button fullWidth variant="primary" onClick={() => setAppState(AppState.ROADMAP)}>
                    <LayoutDashboard className="w-5 h-5 mr-2" /> Return to Map
                 </Button>
              </div>
          </div>
      )
  }

  return (
    <div className="h-screen flex flex-col max-w-2xl mx-auto relative overflow-hidden">
      <div className="px-4 py-6 flex items-center gap-4 relative z-10 shrink-0">
        <button onClick={() => setAppState(AppState.ROADMAP)}>
          <X className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark w-6 h-6 hover:bg-black/5 rounded-full" />
        </button>
        <div className="flex-1 h-3 bg-gravity-surface-light dark:bg-gravity-surface-dark rounded-full overflow-hidden border border-gravity-border-light dark:border-gravity-border-dark">
          <div 
            className="h-full bg-gravity-success transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!store.isReviewSession && (
          <div className="flex items-center gap-1 text-gravity-danger font-bold text-lg">
            <Heart className="fill-current w-5 h-5" />
            <span>{hearts}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col px-4 overflow-y-auto pb-32">
        <h2 className="text-sm font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark mb-6 mt-4 uppercase tracking-widest">
          {question.type === 'fill-blank' && 'Input Answer'}
          {question.type === 'true-false' && 'True or False'}
          {question.type === 'multiple-choice' && 'Select One'}
        </h2>
        
        <div className="mb-12 text-2xl text-gravity-text-main-light dark:text-gravity-text-main-dark font-medium leading-relaxed">
           {question.question}
        </div>

        <div className="space-y-4">
          {question.type === 'fill-blank' ? (
             <div className="flex flex-col gap-4">
                <input 
                  type="text"
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  placeholder="Type here..."
                  className="w-full p-6 text-xl bg-gravity-surface-light dark:bg-gravity-surface-dark border-2 border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-main-light dark:text-gravity-text-main-dark rounded-2xl focus:border-gravity-blue focus:outline-none transition-all"
                  disabled={status !== 'idle'}
                  autoFocus
                />
             </div>
          ) : question.type === 'true-false' ? (
            ['True', 'False'].map((option, idx) => (
              <div 
                key={idx}
                onClick={() => status === 'idle' && setSelectedOption(option)}
                className={`
                  p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between group shadow-sm
                  ${selectedOption === option 
                    ? 'bg-gravity-blue/5 border-gravity-blue text-gravity-blue' 
                    : 'bg-gravity-surface-light dark:bg-gravity-surface-dark border-gravity-border-light dark:border-gravity-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 text-gravity-text-main-light dark:text-gravity-text-main-dark'}
                  ${status !== 'idle' && 'cursor-default'}
                `}
              >
                <span className="font-semibold text-lg">{option}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-4
                  ${selectedOption === option ? 'border-gravity-blue bg-gravity-blue' : 'border-gravity-text-sub-light dark:border-gravity-text-sub-dark'}
                `}>
                  {selectedOption === option && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            ))
          ) : (
            question.options?.map((option, idx) => (
              <div 
                key={idx}
                onClick={() => status === 'idle' && setSelectedOption(option)}
                className={`
                  p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between group shadow-sm
                  ${selectedOption === option 
                    ? 'bg-gravity-blue/5 border-gravity-blue text-gravity-blue' 
                    : 'bg-gravity-surface-light dark:bg-gravity-surface-dark border-gravity-border-light dark:border-gravity-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 text-gravity-text-main-light dark:text-gravity-text-main-dark'}
                  ${status !== 'idle' && 'cursor-default'}
                `}
              >
                <span className="font-semibold text-lg">{option}</span>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-4
                  ${selectedOption === option ? 'border-gravity-blue bg-gravity-blue' : 'border-gravity-text-sub-light dark:border-gravity-text-sub-dark'}
                `}>
                  {selectedOption === option && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className={`
        fixed bottom-0 left-0 right-0 border-t border-gravity-border-light dark:border-gravity-border-dark p-6 transition-all transform duration-300 ease-out z-30
        ${status === 'idle' ? 'bg-gravity-light dark:bg-gravity-dark' : ''}
        ${status === 'correct' ? 'bg-gravity-success/10' : ''}
        ${status === 'wrong' ? 'bg-gravity-danger/10' : ''}
      `}>
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {status === 'idle' && (
             <Button fullWidth size="lg" disabled={question.type === 'fill-blank' ? !textAnswer : !selectedOption} onClick={handleCheck}>Check Answer</Button>
          )}

          {status === 'correct' && (
            <>
              <div className="flex items-center gap-4 self-start md:self-center">
                <div className="bg-gravity-success text-white rounded-full p-2"><CheckCircle className="w-8 h-8" /></div>
                <div className="font-black text-gravity-success text-xl uppercase tracking-wider">Correct</div>
              </div>
              <Button onClick={handleNext} className="w-full md:w-auto bg-gravity-success text-white hover:bg-green-600 border-transparent shadow-lg">Continue</Button>
            </>
          )}

          {status === 'wrong' && (
            <>
              <div className="flex items-center gap-4 self-start md:self-center w-full">
                 <div className="bg-gravity-danger text-white rounded-full p-2 shrink-0"><AlertCircle className="w-8 h-8" /></div>
                 <div className="flex-1">
                   <div className="font-black text-gravity-danger text-xl uppercase tracking-wider mb-1">Incorrect</div>
                   <div className="text-gravity-danger font-medium text-sm">Correct Answer: {question.correctAnswer}</div>
                 </div>
              </div>
              <Button onClick={handleNext} className="w-full md:w-auto bg-gravity-danger text-white hover:bg-red-600 border-transparent shadow-lg">Continue</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
