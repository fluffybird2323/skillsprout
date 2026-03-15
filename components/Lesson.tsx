import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import confetti from 'canvas-confetti';
import { X, Heart, CheckCircle, AlertCircle, LayoutDashboard, BookOpen, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { Button } from './ui/Button';
import { AppState, Question } from '../types';
import { storageValidator } from '../utils/storageValidation';
import { storageRecovery } from '../services/storageRecovery';

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
  const { t } = useTranslation();
  const store = useStore();
  const { currentLesson, hearts, setAppState, completeLesson, processAnswer } = store;

  const activeCourse = store.courses.find(c => c.id === store.activeCourseId);
  const currentUnit = activeCourse?.units.find(u => u.chapters.some(c => c.id === currentLesson?.chapterId));
  const themeColor = currentUnit?.color || '#3B82F6';

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [textAnswer, setTextAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [stage, setStage] = useState<'intro' | 'quiz' | 'complete' | 'failed'>('intro');
  const [consecutiveWrong, setConsecutiveWrong] = useState(0);
  const [showReferenceTip, setShowReferenceTip] = useState(false);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [missedQuestions, setMissedQuestions] = useState<Question[]>([]);
  const [inRevisionRound, setInRevisionRound] = useState(false);
  const [revisionIndex, setRevisionIndex] = useState(0);
  const [totalWrong, setTotalWrong] = useState(0);
  const [pendingFail, setPendingFail] = useState(false);
  const [totalCorrect, setTotalCorrect] = useState(0);

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
            // Use activeChapterId from store as the source of truth if lesson data is corrupted
            const targetChapterId = currentLesson?.chapterId || store.activeChapterId;
            const currentUnit = activeCourse?.units.find(u => u.chapters.some(c => c.id === targetChapterId));
            const currentChapter = currentUnit?.chapters.find(c => c.id === targetChapterId);
            
            const recoveryResult = await storageRecovery.recoverLessonContent(
              currentLesson,
              activeCourse?.topic || 'Unknown Topic',
              currentChapter?.title || 'Unknown Chapter'
            );
            
            if (recoveryResult.success && recoveryResult.recoveredData) {
              console.log('Successfully recovered lesson content');
              // Update the current lesson with recovered data and ensure chapterId is set
              store.setLessonContent({
                ...recoveryResult.recoveredData,
                chapterId: targetChapterId || recoveryResult.recoveredData.chapterId
              });
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

    const q = inRevisionRound
      ? missedQuestions[revisionIndex]
      : currentLesson.questions[currentQuestionIndex];
    if (q && q.type === 'multiple-choice' && q.options) {
      setShuffledOptions(shuffleArray(q.options));
    } else {
      setShuffledOptions([]);
    }
  }, [currentQuestionIndex, currentLesson, inRevisionRound, revisionIndex]);

  if (!currentLesson) return null;

  // Add safety checks for questions array
  if (!currentLesson.questions || currentLesson.questions.length === 0) {
    console.error('Lesson has no questions:', currentLesson);
    
    const handleRecoveryAttempt = async () => {
      try {
        const currentUnit = activeCourse?.units.find(u => u.chapters.some(c => c.id === currentLesson?.chapterId));
        const currentChapter = currentUnit?.chapters.find(c => c.id === currentLesson?.chapterId);

        const recoveryResult = await storageRecovery.recoverLessonContent(
          currentLesson,
          activeCourse?.topic || 'Unknown Topic',
          currentChapter?.title || 'Unknown Chapter'
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
        <h2 className="text-2xl font-bold mb-4">{t('lesson.error')}</h2>
        <p className="text-gray-600 mb-6">{t('lesson.corrupted')}</p>
        <div className="flex gap-4">
          <Button onClick={handleRecoveryAttempt} variant="secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('lesson.tryRecovery')}
          </Button>
          <Button onClick={() => setAppState(AppState.ROADMAP)}>
            {t('lesson.returnRoadmap')}
          </Button>
        </div>
      </div>
    );
  }

  const question = inRevisionRound
    ? missedQuestions[revisionIndex]
    : currentLesson.questions[currentQuestionIndex];
  if (!question) {
    console.error('Question not found at index:', currentQuestionIndex);
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-red-500 mb-4">
          <AlertCircle className="w-16 h-16 mx-auto" />
        </div>
        <h2 className="text-2xl font-bold mb-4">{t('lesson.questionError')}</h2>
        <p className="text-gray-600 mb-6">{t('lesson.questionLoadError')}</p>
        <Button onClick={() => setAppState(AppState.ROADMAP)}>
          {t('lesson.returnRoadmap')}
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
        <h2 className="text-2xl font-bold mb-4">{t('lesson.questionError')}</h2>
        <p className="text-gray-600 mb-6">{t('lesson.questionCorrupted')}</p>
        <Button onClick={() => setAppState(AppState.ROADMAP)}>
          {t('lesson.returnRoadmap')}
        </Button>
      </div>
    );
  }
  
  const progress = inRevisionRound
    ? ((revisionIndex + 1) / missedQuestions.length) * 100
    : (currentQuestionIndex / currentLesson.questions.length) * 100;

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
        setConsecutiveWrong(0);
        setShowReferenceTip(false);
        // Correct answer in revision round redeems a pending failure
        if (inRevisionRound && pendingFail) {
          setPendingFail(false);
        }
        if (!inRevisionRound) {
          setTotalCorrect(prev => prev + 1);
        }
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

        // Queue for revision if not fill-blank and not already in revision round
        if (question.type !== 'fill-blank' && !inRevisionRound) {
          setMissedQuestions(prev =>
            prev.some(q => q.id === question.id) ? prev : [...prev, question]
          );
        }

        // Track total wrongs — fail after 3 (original round only)
        if (!inRevisionRound) {
          const newTotalWrong = totalWrong + 1;
          setTotalWrong(newTotalWrong);
          if (newTotalWrong > 3) {
            setPendingFail(true);
          }
        }

        if (!store.isReviewSession && question.type !== 'fill-blank') store.loseHeart();
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

      if (pendingFail) {
        setStage('failed');
        return;
      }

      if (inRevisionRound) {
        if (revisionIndex < missedQuestions.length - 1) {
          setRevisionIndex(prev => prev + 1);
        } else {
          finishLesson();
        }
      } else {
        if (currentQuestionIndex < currentLesson.questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
        } else {
          if (missedQuestions.length > 0) {
            setInRevisionRound(true);
            setRevisionIndex(0);
          } else {
            finishLesson();
          }
        }
      }
    } catch (error) {
      console.error('Error in handleNext:', error);
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
    setStage('quiz');
  };

  const retryLesson = () => {
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setTextAnswer('');
    setStatus('idle');
    setConsecutiveWrong(0);
    setShowReferenceTip(false);
    setShuffledOptions([]);
    setMissedQuestions([]);
    setInRevisionRound(false);
    setRevisionIndex(0);
    setTotalWrong(0);
    setPendingFail(false);
    setTotalCorrect(0);
    setStage('quiz');
  };

  if (stage === 'intro') {
     return (
        <div className="min-h-screen flex flex-col p-6 items-center justify-center text-center max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
           <h2 className="text-2xl font-black text-blue-600 mb-6 uppercase tracking-wider">
              {t('lesson.knowledgeDownload')}
           </h2>
           <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl mb-12 shadow-xl border border-gray-200 dark:border-gray-600">
             <p className="text-lg text-gray-900 dark:text-gray-100 leading-relaxed font-medium">
               {currentLesson.intro}
             </p>
           </div>
           <Button fullWidth size="lg" onClick={startActualLesson} className="shadow-lg shadow-blue-500/30">{t('lesson.startSession')}</Button>
        </div>
     );
  }



  if (stage === 'failed') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8">
          <div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border border-red-200 dark:border-red-800">
            <AlertCircle className="w-16 h-16 text-red-500" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-3 tracking-tight">{t('lesson.lessonFailed')}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs mx-auto">{t('lesson.failedDescription')}</p>
          <div className="mt-6 inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-full text-sm font-bold">
            <AlertCircle className="w-4 h-4" />
            {totalWrong} {t('lesson.wrongAnswers')}
          </div>
        </div>

        <div className="w-full max-w-sm space-y-3">
          <Button fullWidth size="lg" onClick={retryLesson} className="shadow-lg shadow-blue-500/30">
            <RefreshCw className="w-5 h-5 mr-2" /> {t('lesson.tryAgain')}
          </Button>
          <Button fullWidth variant="outline" onClick={() => setAppState(AppState.ROADMAP)}>
            <LayoutDashboard className="w-5 h-5 mr-2" /> {t('lesson.returnMap')}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === 'complete') {
    const totalQuestions = currentLesson.questions.length;
    const correctCount = totalCorrect;
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 100;
    const xpEarned = 10 + (3 * 5);

    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-green-50 via-white to-white dark:from-green-950/30 dark:via-gray-900 dark:to-gray-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">

          {/* Icon + XP badge */}
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-green-400/25 blur-3xl scale-150 pointer-events-none" />
            <div className="relative w-36 h-36 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-green-500/40 mx-auto">
              <CheckCircle className="w-20 h-20 text-white" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 font-black text-sm px-3 py-1.5 rounded-full shadow-lg border-2 border-white dark:border-gray-900 whitespace-nowrap">
              +{xpEarned} XP
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl font-black text-gray-900 dark:text-gray-100 mb-2 tracking-tight">{t('lesson.complete')}</h1>
          <p className="text-gray-400 dark:text-gray-500 font-medium mb-10 text-sm uppercase tracking-widest">{t('lesson.completeSubtitle')}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-10">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="text-2xl font-black text-emerald-500 mb-0.5">{accuracy}%</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{t('lesson.accuracy')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="text-2xl font-black text-blue-500 mb-0.5">{correctCount}<span className="text-gray-300 dark:text-gray-600">/{totalQuestions}</span></div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{t('lesson.correct')}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="text-2xl font-black text-orange-500 mb-0.5">🔥{store.streak}</div>
              <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{t('lesson.streak')}</div>
            </div>
          </div>

          {/* CTA */}
          <div className="w-full max-w-sm">
            <Button
              fullWidth
              size="lg"
              onClick={() => {
                try { setAppState(AppState.ROADMAP); }
                catch { window.location.reload(); }
              }}
              className="bg-gradient-to-r from-green-500 to-emerald-600 border-transparent text-white shadow-lg shadow-green-500/30 hover:from-green-600 hover:to-emerald-700"
            >
              <LayoutDashboard className="w-5 h-5 mr-2" /> {t('lesson.returnMap')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col max-w-2xl mx-auto relative overflow-hidden">
      <div className="px-4 py-6 flex items-center gap-4 relative z-10 shrink-0">
        <button onClick={() => setAppState(AppState.ROADMAP)}>
          <X className="text-gray-500 dark:text-gray-400 w-6 h-6 hover:bg-black/5 rounded-full" />
        </button>
        <div className="flex-1 h-3 bg-white dark:bg-gray-800 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
          <div
            className={`h-full transition-all duration-500 ease-out ${inRevisionRound ? 'bg-amber-500' : 'bg-green-600'}`}
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

      {inRevisionRound && (
        <div className="px-4 pb-2 shrink-0">
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl px-3 py-2">
            <RefreshCw className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              {t('lesson.revisionRound')} · {revisionIndex + 1}/{missedQuestions.length}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-4 overflow-y-auto pb-48">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-6 mt-4 uppercase tracking-widest">
          {question.type === 'fill-blank' && t('lesson.inputAnswer')}
          {question.type === 'true-false' && t('lesson.trueFalse')}
          {question.type === 'multiple-choice' && t('lesson.selectOne')}
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
                  placeholder={t('lesson.typeHere')}
                  className="w-full p-6 text-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-2xl focus:border-blue-500 focus:outline-none transition-all"
                  disabled={status !== 'idle'}
                  autoFocus
                />
             </div>
          ) : question.type === 'true-false' ? (
            [t('lesson.true'), t('lesson.false')].map((option, idx) => (
              <div 
                key={idx}
                onClick={() => status === 'idle' && setSelectedOption(option)}
                className={`
                  p-6 border-2 rounded-2xl cursor-pointer transition-all duration-200 flex items-center justify-between group shadow-sm
                  ${selectedOption === option 
                    ? 'bg-gravity-blue/5 border-gravity-blue text-gravity-blue' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'}
                  ${status !== 'idle' && 'cursor-default'}
                `}
              >
                <span className="font-semibold text-lg">{option}</span>
                <div 
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-4
                    ${selectedOption === option ? 'border-gravity-blue bg-gravity-blue' : 'border-gray-400 dark:border-gray-500'}
                  `}
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
        absolute bottom-0 left-0 right-0 border-t border-gravity-border-light dark:border-gravity-border-dark p-6 transition-all transform duration-300 ease-out z-[100] shadow-[0_-8px_30px_rgb(0,0,0,0.12)]
        ${status === 'idle' ? 'bg-gravity-light dark:bg-gravity-dark' : ''}
        ${status === 'correct' ? 'bg-[#F0FDF4] dark:bg-[#052c16] border-t-4 border-green-500' : ''}
        ${status === 'wrong' ? 'bg-[#FEF2F2] dark:bg-[#450a0a] border-t-4 border-red-500' : ''}
      `}>
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          
          {status === 'idle' && (
             <Button fullWidth size="lg" disabled={question.type === 'fill-blank' ? !textAnswer : !selectedOption} onClick={handleCheck}>{t('lesson.checkAnswer')}</Button>
          )}

          {status === 'correct' && (
            <>
              <div className="flex items-start gap-4 self-start md:self-center flex-1">
                <div className="bg-gravity-success text-white rounded-full p-2 shrink-0"><CheckCircle className="w-8 h-8" /></div>
                <div className="flex-1">
                  <div className="font-black text-gravity-success text-xl uppercase tracking-wider mb-1">{t('lesson.correct')}</div>
                  {question.explanation && (
                    <div className="text-gray-900 dark:text-gray-100 text-sm mt-2 leading-relaxed">
                      {question.explanation}
                    </div>
                  )}
                </div>
              </div>
              <Button onClick={handleNext} className="w-full md:w-auto bg-gravity-success text-white hover:bg-green-600 border-transparent shadow-lg">{t('common.continue')}</Button>
            </>
          )}

          {status === 'wrong' && (
            <>
              <div className="flex items-start gap-4 self-start md:self-center w-full flex-1">
                 <div className="bg-gravity-danger text-white rounded-full p-2 shrink-0"><AlertCircle className="w-8 h-8" /></div>
                 <div className="flex-1">
                   <div className="font-black text-gravity-danger text-xl uppercase tracking-wider mb-1">{t('lesson.incorrect')}</div>
                   <div className="text-gray-900 dark:text-gray-100 font-bold text-sm">{t('lesson.correctAnswer')} {question.correctAnswer}</div>
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
                         <span className="text-gravity-blue font-medium">{t('lesson.tip')}</span>
                         <span className="text-gray-700 dark:text-gray-300 ml-1">
                           {t('lesson.tipDescription')}
                         </span>
                       </div>
                     </div>
                   )}
                 </div>
              </div>
              <Button onClick={handleNext} className="w-full md:w-auto bg-gravity-danger text-white hover:bg-red-600 border-transparent shadow-lg">{t('common.continue')}</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
