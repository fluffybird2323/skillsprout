import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { X, Heart, CheckCircle, AlertCircle, LayoutDashboard, BookOpen, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from './ui/Button';
import { AppState } from '../types';
import { storageValidator } from '../utils/storageValidation';
import { storageRecovery } from '../services/storageRecovery';
import { ResourceStage } from './interactive/ResourceStage';
import { InteractiveStage } from './interactive/InteractiveStage';

// Number of consecutive wrong answers before showing reference tip
const WRONG_ANSWER_TIP_THRESHOLD = 2;

// Fisher-Yates shuffle algorithm for randomizing options
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Normalize text for comparison (remove prefixes, trim, lowercase)
function normalizeAnswer(text: string): string {
  return text
    .replace(/^[A-D]\)\s*/i, '') // Remove A), B), C), D) prefixes
    .trim()
    .toLowerCase();
}

export const Lesson: React.FC = () => {
  const store = useStore();
  const { currentLesson, hearts, setAppState, completeLesson, processAnswer } = store;

  const activeCourse = store.courses.find(c => c.id === store.activeCourseId);
  const currentUnit = activeCourse?.units.find(u => u.chapters.some(c => c.id === currentLesson?.chapterId));
  const themeColor = currentUnit?.color || '#3B82F6';

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [stage, setStage] = useState<'intro' | 'interactive' | 'resource' | 'quiz' | 'complete'>('intro');
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [showReferenceTip, setShowReferenceTip] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  useEffect(() => {
    const validateAndRecoverLesson = async () => {
      try {
        if (!currentLesson) {
          setAppState(AppState.ROADMAP);
          return;
        }

        // Validate the lesson data before proceeding
        const validation = storageValidator.validateLessonContent(currentLesson);
        if (!validation.isValid) {
          console.error('Lesson validation failed:', validation.errors);
          
          // Attempt to recover the corrupted lesson
          try {
            const recoveryResult = await storageRecovery.recoverLessonContent(
              currentLesson,
              currentLesson.chapterId,
              currentLesson.type
            );
            
            if (recoveryResult.success && recoveryResult.recoveredData) {
              console.log('Successfully recovered lesson content');
              // Update the current lesson with recovered data
              store.setLessonContent(recoveryResult.recoveredData);
            } else {
              console.error('Failed to recover lesson:', recoveryResult.error);
              setAppState(AppState.ROADMAP);
            }
          } catch (recoveryError) {
            console.error('Recovery attempt failed:', recoveryError);
            setAppState(AppState.ROADMAP);
          }
          return;
        }

        if (store.isReviewSession) {
          setStage('quiz');
        } else {
          setStage('intro');
        }
      } catch (error) {
        console.error('Error in lesson state effect:', error);
        setAppState(AppState.ROADMAP);
      }
    };

    validateAndRecoverLesson();
  // Run this effect only when the lesson identity or review mode changes
  // to avoid resetting the stage after each question interaction
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLesson?.chapterId, store.isReviewSession]);

  // Shuffle options when question changes
  useEffect(() => {
    if (!currentLesson || !currentLesson.questions) return;

    const question = currentLesson.questions[currentQuestionIndex];
    if (question && question.type === 'multiple-choice' && question.options) {
      // Shuffle options for display
      setShuffledOptions(shuffleArray(question.options));
    } else {
      setShuffledOptions([]);
    }
  }, [currentQuestionIndex, currentLesson]);

  if (!currentLesson) return null;

  // Add safety checks for questions array
  if (!currentLesson.questions || currentLesson.questions.length === 0) {
    console.error('Lesson has no questions:', currentLesson);
    
    const handleRecoveryAttempt = async () => {
      try {
        const recoveryResult = await storageRecovery.recoverLessonContent(
          currentLesson,
          currentLesson.chapterId,
          currentLesson.type
        );
        
        if (recoveryResult.success && recoveryResult.recoveredData) {
          store.setLessonContent(recoveryResult.recoveredData);
        } else {
          console.error('Failed to recover lesson:', recoveryResult.error);
          setAppState(AppState.ROADMAP);
        }
      } catch (error) {
        console.error('Recovery attempt failed:', error);
        setAppState(AppState.ROADMAP);
      }
    };
    
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Lesson Error</h2>
        <p className="text-gray-600 mb-6">This lesson appears to be incomplete or corrupted.</p>
        <div className="flex gap-4">
          <Button onClick={handleRecoveryAttempt} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Recovery
          </Button>
          <Button onClick={() => setAppState(AppState.ROADMAP)}>
            Return to Roadmap
          </Button>
        </div>
      </div>
    );
  }

  const question = currentLesson.questions[currentQuestionIndex];
  if (!question) {
    console.error('Question not found at index:', currentQuestionIndex);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Question Error</h2>
        <p className="text-gray-600 mb-6">The current question could not be loaded. Please return to the roadmap.</p>
        <Button onClick={() => setAppState(AppState.ROADMAP)}>
          Return to Roadmap
        </Button>
      </div>
    );
  }

  // Validate the current question
  const questionValidation = storageValidator.validateQuestion(question);
  if (!questionValidation.isValid) {
    console.error('Question validation failed:', questionValidation.errors);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Question Error</h2>
        <p className="text-gray-600 mb-6">The current question appears to be corrupted.</p>
        <Button onClick={() => setAppState(AppState.ROADMAP)}>
          Return to Roadmap
        </Button>
      </div>
    );
  }
  
  const progress = ((currentQuestionIndex) / currentLesson.questions.length) * 100;

  const handleCheck = () => {
    try {
      let isCorrect = false;

      if (!question || !question.correctAnswer) {
        console.error('Invalid question data:', question);
        // Try to recover by setting a default answer
        setStatus('wrong');
        if (!store.isReviewSession) store.loseHeart();
        return;
      }

      // Additional validation for question options
      if (question.type === 'multiple-choice' && (!question.options || question.options.length === 0)) {
        console.error('Multiple choice question has no options:', question);
        setStatus('wrong');
        if (!store.isReviewSession) store.loseHeart();
        return;
      }

      if (question.type === 'fill-blank') {
         isCorrect = normalizeAnswer(textAnswer) === normalizeAnswer(question.correctAnswer);
      } else {
         if (!selectedOption) return;

         // Normalize both selected and correct answers to handle any format inconsistencies
         const selectedNormalized = normalizeAnswer(selectedOption);
         const correctNormalized = normalizeAnswer(question.correctAnswer);

         isCorrect = selectedNormalized === correctNormalized;
      }

      processAnswer(question.id, isCorrect);

      if (isCorrect) {
        setStatus('correct');
        setConsecutiveWrong(0); // Reset streak on correct answer
        setShowReferenceTip(false);
        try {
          const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
          sound.volume = 0.2;
          sound.play().catch(() => {});
        } catch (soundError) {
          console.warn('Sound playback failed:', soundError);
        }
      } else {
        setStatus('wrong');
        const newConsecutiveWrong = consecutiveWrong + 1;
        setConsecutiveWrong(newConsecutiveWrong);

        // Show reference tip after threshold consecutive wrong answers
        if (newConsecutiveWrong >= WRONG_ANSWER_TIP_THRESHOLD) {
          setShowReferenceTip(true);
        }

        if (!store.isReviewSession) store.loseHeart();
        try {
          const sound = new Audio('https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3');
          sound.volume = 0.2;
          sound.play().catch(() => {});
        } catch (soundError) {
          console.warn('Sound playback failed:', soundError);
        }
      }
    } catch (error) {
      console.error('Error in handleCheck:', error);
      // Reset to idle state on error
      setStatus('idle');
    }
  };

  const handleNext = () => {
    try {
      setStatus('idle');
      setSelectedOption(null);
      setTextAnswer('');
      if (currentQuestionIndex < currentLesson.questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
      } else {
        finishLesson();
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
      // Fallback: return to roadmap on error
      setAppState(AppState.ROADMAP);
    }
  };

  const finishLesson = async () => {
    try {
      // Validate lesson completion data before proceeding
      if (!currentLesson || !currentLesson.questions || currentLesson.questions.length === 0) {
        console.error('Cannot complete lesson: invalid lesson data', currentLesson);
        setAppState(AppState.ROADMAP);
        return;
      }

      // Trigger confetti with error handling and reduced particle count
      confetti({
        particleCount: 100, // Reduced from 150 to prevent memory issues
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#34A853', '#1A73E8', '#FBBC04'],
        disableForReducedMotion: true // Respect user accessibility preferences
      });
    } catch (error) {
      console.warn('Confetti animation failed:', error);
      // Continue with lesson completion even if confetti fails
    }
    
    // Complete the lesson first, then set stage to avoid race condition
    completeLesson(3);
    
    // Use setTimeout to ensure state updates are properly processed
    setTimeout(() => {
      setStage('complete');
    }, 0);
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
           <h2 className="text-2xl font-black text-blue-600 mb-6 uppercase tracking-wider">
              {currentLesson.type === 'interactive' ? "Interactive Module" : "Knowledge Download"}
           </h2>
           <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl mb-12 shadow-xl border border-gray-200 dark:border-gray-600">
             <p className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed font-medium">
               {currentLesson.intro}
             </p>
           </div>
           <Button fullWidth size="lg" onClick={startActualLesson} className="shadow-lg shadow-blue-500/30">Start Session</Button>
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
               <button onClick={() => setAppState(AppState.ROADMAP)}><X className="text-gray-500 dark:text-gray-400 hover:text-red-500" /></button>
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
                 <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-green-200">
                    <CheckCircle className="w-16 h-16 text-green-600" />
                 </div>
                 <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">COMPLETE</h1>
                 <p className="text-xl text-gravity-success font-bold">+{10 + (3 * 5)} XP</p>
              </div>

              <div className="w-full max-w-sm space-y-4">
                 <Button 
                   fullWidth 
                   variant="primary" 
                   onClick={() => {
                     try {
                       setAppState(AppState.ROADMAP);
                     } catch (error) {
                       console.error('Failed to return to roadmap:', error);
                       // Fallback: reload the page if state transition fails
                       window.location.reload();
                     }
                   }}
                 >
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
          <X className="text-gray-500 dark:text-gray-400 w-6 h-6 hover:bg-black/5 rounded-full" />
        </button>
        <div className="flex-1 h-3 bg-white dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
          <div 
            className="h-full bg-green-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        {!store.isReviewSession && (
          <div className="flex items-center gap-1 text-red-500 font-bold text-lg">
            <Heart className="fill-current w-5 h-5" />
            <span>{hearts}</span>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col px-4 overflow-y-auto pb-32">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6 mt-4 uppercase tracking-widest">
          {question.type === 'fill-blank' && 'Input Answer'}
          {question.type === 'true-false' && 'True or False'}
          {question.type === 'multiple-choice' && 'Select One'}
        </h2>
        
        <div className="mb-12 text-2xl text-gray-900 dark:text-gray-100 font-medium leading-relaxed">
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
                  className="w-full p-6 text-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all"
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
                    ? '' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  ${status !== 'idle' && 'cursor-default'}
                `}
                style={selectedOption === option ? {
                  borderColor: themeColor,
                  color: themeColor,
                  backgroundColor: `${themeColor}10`
                } : undefined}
              >
                <span className="font-semibold text-lg">{option}</span>
                <div 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-4
                    ${selectedOption !== option ? 'border-gray-400 dark:border-gray-500' : ''}
                  `}
                  style={selectedOption === option ? {
                    borderColor: themeColor,
                    backgroundColor: themeColor
                  } : undefined}
                >
                  {selectedOption === option && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
            ))
          ) : (
            // Use shuffled options for multiple-choice questions
            (shuffledOptions.length > 0 ? shuffledOptions : question.options || []).map((option, idx) => (
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
        ${status === 'correct' ? 'bg-gravity-success/50' : ''}
        ${status === 'wrong' ? 'bg-gravity-danger/50' : ''}
      `}>
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {status === 'idle' && (
             <Button fullWidth size="lg" disabled={question.type === 'fill-blank' ? !textAnswer : !selectedOption} onClick={handleCheck}>Check Answer</Button>
          )}

          {status === 'correct' && (
            <>
              <div className="flex items-start gap-4 self-start md:self-center flex-1">
                <div className="bg-gravity-success text-white rounded-full p-2 shrink-0"><CheckCircle className="w-8 h-8" /></div>
                <div className="flex-1">
                  <div className="font-black text-gravity-success text-xl uppercase tracking-wider mb-1">Correct</div>
                  {question.explanation && (
                    <div className="text-gray-900 dark:text-gray-100 text-sm mt-2 leading-relaxed">
                      {question.explanation}
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleNext} className="w-full md:w-auto bg-gravity-success text-white hover:bg-green-600 border-transparent shadow-lg">Continue</Button>
            </>
          )}

          {status === 'wrong' && (
            <>
              <div className="flex items-start gap-4 self-start md:self-center w-full flex-1">
                 <div className="bg-gravity-danger text-white rounded-full p-2 shrink-0"><AlertCircle className="w-8 h-8" /></div>
                 <div className="flex-1">
                   <div className="font-black text-gravity-danger text-xl uppercase tracking-wider mb-1">Incorrect</div>
                   <div className="text-gray-900 dark:text-gray-100 font-bold text-sm">Correct Answer: {question.correctAnswer}</div>
                   {question.explanation && (
                     <div className="text-gray-900 dark:text-gray-100 text-sm mt-2 leading-relaxed">
                       {question.explanation}
                     </div>
                   )}
                   {/* Reference tip after consecutive wrong answers */}
                   {showReferenceTip && (
                     <div className="mt-3 p-3 bg-gravity-blue/10 border border-gravity-blue/20 rounded-xl flex items-start gap-2">
                       <BookOpen className="w-4 h-4 text-gravity-blue shrink-0 mt-0.5" />
                       <div className="text-sm">
                         <span className="text-gravity-blue font-medium">Tip:</span>
                         <span className="text-gray-700 dark:text-gray-300 ml-1">
                           Having trouble? Check the unit&apos;s reference materials for additional learning resources.
                         </span>
                       </div>
                     </div>
                   )}
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
