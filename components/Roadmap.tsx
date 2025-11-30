import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { generateLessonContent, generateUnit, generatePathSuggestions, generateInteractiveLesson, generateResourceLesson } from '../services/gemini';
import { Star, Lock, Check, Loader2, Plus, Trash2, BookOpen, Settings, Dumbbell, Cloud, Compass, MapPin, ArrowRight, X } from 'lucide-react';
import { Unit, Chapter, AppState } from '../types';
import { Button } from './ui/Button';

export const Roadmap: React.FC = () => {
  const store = useStore();
  const [loadingChapterId, setLoadingChapterId] = useState<string | null>(null);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  
  // Path Selection State
  const [isPathModalOpen, setIsPathModalOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [customPath, setCustomPath] = useState("");

  const activeCourse = store.courses.find(c => c.id === store.activeCourseId);

  const dueReviewItems = store.srsItems.filter(
    item => item.courseId === store.activeCourseId && item.nextReviewDate <= Date.now()
  ).length;

  if (!activeCourse) return null;

  const totalChapters = activeCourse.units.reduce((acc, unit) => acc + unit.chapters.length, 0);
  const completedChapters = activeCourse.units.reduce((acc, unit) => 
    acc + unit.chapters.filter(c => c.status === 'completed').length, 0);
  const progressPercentage = totalChapters === 0 ? 0 : Math.round((completedChapters / totalChapters) * 100);

  const handleChapterClick = async (unit: Unit, chapter: Chapter) => {
    if (manageMode) return;
    if (chapter.status === 'locked') return;
    
    setLoadingChapterId(chapter.id);
    store.startLesson(unit.id, chapter.id);

    try {
      const rand = Math.random();
      let content;
      if (rand < 0.7) {
         content = await generateLessonContent(activeCourse.topic, chapter.title);
      } else if (rand < 0.85) {
         content = await generateInteractiveLesson(activeCourse.topic, chapter.title);
      } else {
         content = await generateResourceLesson(activeCourse.topic, chapter.title);
      }
      store.setLessonContent({ ...content, chapterId: chapter.id });
    } catch (error) {
      console.error("Error loading lesson", error);
      setLoadingChapterId(null);
      alert("Could not load lesson.");
    }
  };

  const handleReviewClick = () => {
    if (dueReviewItems > 0) store.startReviewSession();
  };

  const openPathSelector = async () => {
    setIsPathModalOpen(true);
    setLoadingSuggestions(true);
    try {
      const titles = activeCourse.units.map(u => u.title);
      const suggs = await generatePathSuggestions(activeCourse.topic, titles);
      setSuggestions(suggs);
    } catch (e) {
      setSuggestions(["Advanced Concepts", "Practical Applications", "History & Theory"]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleAddSpecificUnit = async (focus: string) => {
    if (!focus.trim()) return;
    setIsPathModalOpen(false);
    setIsAddingUnit(true);
    setCustomPath("");
    try {
        const newUnit = await generateUnit(activeCourse.topic, activeCourse.units.length, focus);
        store.appendUnit(newUnit);
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    } catch (e) {
        alert("Failed to generate unit.");
    } finally {
        setIsAddingUnit(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row overflow-hidden bg-transparent">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-72 bg-gravity-light/80 dark:bg-gravity-surface-dark/80 backdrop-blur-md border-r border-gravity-border-light dark:border-gravity-border-dark p-6 flex md:flex-col justify-between sticky top-0 z-30 md:h-screen transition-colors">
        <div className="flex md:flex-col gap-2 w-full overflow-x-auto md:overflow-visible no-scrollbar items-center md:items-stretch">
          <h1 className="hidden md:block text-2xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark mb-10 tracking-tighter">
            SKILL<span className="text-gravity-blue">SPROUT</span>
          </h1>
          
          <div className="text-[10px] font-bold text-gravity-text-sub-light dark:text-gravity-text-sub-dark uppercase tracking-[0.2em] px-2 mb-4 hidden md:block">Active Tracks</div>
          {store.courses.map(c => (
             <button
               key={c.id}
               onClick={() => store.switchCourse(c.id)}
               className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 w-full text-left min-w-[60px] md:min-w-0 justify-center md:justify-start
                 ${c.id === store.activeCourseId 
                    ? 'bg-gravity-blue text-white shadow-md' 
                    : 'bg-transparent text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:bg-gravity-surface-light dark:hover:bg-gravity-surface-dark'}
               `}
             >
               <span className="text-xl">{c.icon}</span>
               <span className="font-bold hidden md:block truncate text-sm">{c.topic}</span>
             </button>
          ))}
          
          <button 
            onClick={() => store.setAppState(AppState.ADD_COURSE)}
            className="flex items-center gap-3 p-3 rounded-xl text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-bold border border-dashed border-gravity-border-light dark:border-gravity-border-dark hover:border-gravity-blue hover:text-gravity-blue transition-colors w-full justify-center md:justify-start mt-2"
          >
             <Plus className="w-5 h-5" />
             <span className="hidden md:block text-xs uppercase tracking-wider">Add Track</span>
          </button>
        </div>

        <div className="hidden md:block border-t border-gravity-border-light dark:border-gravity-border-dark pt-6">
             <div className="flex items-center gap-4 p-3 rounded-xl bg-gravity-surface-light dark:bg-gravity-surface-dark hover:shadow-md transition-all cursor-pointer">
                 <div className="w-10 h-10 bg-gravity-accent text-gravity-dark rounded-full flex items-center justify-center font-bold">
                    {store.xp > 1000 ? '99+' : Math.floor(store.xp / 100)}
                 </div>
                 <div>
                    <div className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark text-xs uppercase tracking-wider">User Profile</div>
                    <div className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-mono">XP: {store.xp}</div>
                 </div>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 pb-32 relative overflow-y-auto overflow-x-hidden">
        
        {/* Mobile Header */}
        <div className="sticky top-0 z-40 bg-gravity-light/90 dark:bg-gravity-dark/90 backdrop-blur border-b border-gravity-border-light dark:border-gravity-border-dark px-4 py-3 flex justify-between items-center md:hidden">
             <div className="font-black text-xl tracking-tighter">SKILL<span className="text-gravity-blue">SPROUT</span></div>
             <div className="flex items-center gap-4 ml-auto">
                <span className="font-bold text-gravity-accent font-mono">🔥 {store.streak}</span>
                <span className="font-bold text-gravity-danger font-mono">❤️ {store.hearts}</span>
             </div>
        </div>

        <div className="max-w-3xl mx-auto mt-8 px-4 relative z-10">
          
          {/* Header Card */}
          <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark p-8 rounded-3xl shadow-xl mb-12 flex justify-between items-center relative overflow-hidden group antigravity-card">
             <div className="relative z-10">
                <h2 className="text-4xl font-black mb-2 text-gravity-text-main-light dark:text-gravity-text-main-dark tracking-tight">{activeCourse.topic}</h2>
                <div className="w-full bg-gravity-border-light dark:bg-gravity-border-dark h-2 rounded-full mt-2 mb-4 overflow-hidden max-w-[200px]">
                   <div className="h-full bg-gravity-blue" style={{ width: `${progressPercentage}%` }}></div>
                </div>
                <span className="inline-block bg-gravity-blue/10 text-gravity-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">{activeCourse.depth || 'serious'}</span>
                
                {dueReviewItems > 0 && (
                  <button 
                    onClick={handleReviewClick}
                    className="mt-6 bg-gravity-blue text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-blue-600 transition-all uppercase tracking-wider text-sm shadow-lg"
                  >
                     <Dumbbell className="w-4 h-4" />
                     Review ({dueReviewItems})
                  </button>
                )}
             </div>
             <div className="relative z-10 text-8xl opacity-10 grayscale group-hover:grayscale-0 transition-all duration-500">{activeCourse.icon}</div>
          </div>

          {/* Controls */}
          <div className="flex justify-between items-center mb-8">
             <div className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-bold uppercase tracking-[0.2em] text-xs">Curriculum Path</div>
             <button 
               onClick={() => setManageMode(!manageMode)}
               className={`p-3 rounded-full transition-all ${manageMode ? 'bg-gravity-text-main-light dark:bg-white text-gravity-light dark:text-gravity-dark' : 'text-gravity-text-sub-light dark:text-gravity-text-sub-dark hover:bg-gravity-surface-light dark:hover:bg-gravity-surface-dark'}`}
             >
                <Settings className="w-5 h-5" />
             </button>
          </div>

          {manageMode && (
             <div className="bg-gravity-danger/5 border border-gravity-danger/20 p-6 rounded-2xl mb-8 text-center">
                <h3 className="font-bold text-gravity-danger mb-4 uppercase tracking-widest text-xs">Edit Mode Active</h3>
                <div className="flex gap-2 justify-center">
                   <Button variant="danger" onClick={() => store.deleteCourse(activeCourse.id)} size="sm">
                      Delete Track
                   </Button>
                </div>
             </div>
          )}

          {/* Units */}
          <div className="space-y-16 pb-40">
            {activeCourse.units.map((unit, unitIdx) => (
              <div key={unit.id} className="relative">
                {/* Unit Header */}
                <div 
                  className="mb-8 rounded-2xl p-1 shadow-sm relative overflow-hidden"
                  style={{ backgroundColor: unit.color }}
                >
                  <div className="bg-gravity-light dark:bg-gravity-surface-dark rounded-xl p-6 flex justify-between items-center h-[98%] w-[99.5%] mx-auto mt-[1px]">
                    <div>
                      <h3 className="font-black text-2xl text-gravity-text-main-light dark:text-gravity-text-main-dark uppercase tracking-tight">Unit {unitIdx + 1}</h3>
                      <p className="font-bold text-sm mt-1" style={{ color: unit.color }}>{unit.title}</p>
                      <p className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark mt-2 max-w-md">{unit.description}</p>
                    </div>
                    {manageMode ? (
                      <button onClick={() => store.deleteUnit(unit.id)} className="text-gravity-danger p-2 hover:bg-gravity-danger/10 rounded-full">
                         <Trash2 className="w-5 h-5" />
                      </button>
                    ) : (
                      <BookOpen className="w-6 h-6 text-gravity-text-sub-light dark:text-gravity-text-sub-dark opacity-20" />
                    )}
                  </div>
                </div>

                {/* Chapters Path */}
                <div className="flex flex-col items-center space-y-8 relative">
                  {unit.chapters.map((chapter, idx) => {
                    const offset = idx % 2 === 0 ? '0px' : (idx % 4 === 1 ? '60px' : '-60px');
                    const isLocked = chapter.status === 'locked';
                    const isCompleted = chapter.status === 'completed';
                    const isActive = chapter.status === 'active';
                    const isLoading = loadingChapterId === chapter.id;

                    return (
                      <div 
                        key={chapter.id}
                        className="relative group"
                        style={{ transform: `translateX(${offset})` }}
                      >
                        <button
                          onClick={() => handleChapterClick(unit, chapter)}
                          disabled={isLocked || isLoading || manageMode}
                          className={`
                            w-20 h-20 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 shadow-lg border-4
                            ${manageMode ? 'opacity-50 grayscale' : ''}
                            ${isLocked 
                               ? 'bg-gravity-surface-light dark:bg-gravity-surface-dark border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-sub-light dark:text-gravity-text-sub-dark' 
                               : 'hover:scale-110'}
                            ${isActive 
                               ? 'bg-gravity-light dark:bg-gravity-dark border-gravity-blue text-gravity-blue ring-4 ring-gravity-blue/20' 
                               : ''}
                            ${isCompleted 
                               ? 'bg-gravity-success text-white border-gravity-success' 
                               : ''}
                          `}
                          style={{ 
                              borderColor: (!isLocked && !isActive && !isCompleted) ? unit.color : undefined,
                              backgroundColor: (!isLocked && !isActive && !isCompleted) ? unit.color : undefined,
                              color: (!isLocked && !isActive && !isCompleted) ? '#FFF' : undefined
                          }}
                        >
                           {isLoading ? (
                             <Loader2 className="animate-spin w-8 h-8" />
                           ) : isCompleted ? (
                             <Check className="w-10 h-10 stroke-[3]" />
                           ) : isLocked ? (
                             <Lock className="w-8 h-8" />
                           ) : (
                             <Star className="w-8 h-8 fill-current" />
                           )}
                        </button>
                        
                        {!manageMode && (
                          <div className={`
                            absolute left-1/2 -translate-x-1/2 -top-12 bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark
                            px-4 py-2 rounded-lg text-xs font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark whitespace-nowrap shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20
                          `}>
                            {chapter.title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cloud Barrier - Antigravity Style */}
        <div className="absolute bottom-0 left-0 right-0 h-[400px] overflow-hidden pointer-events-none z-20 select-none">
            <div className="absolute bottom-0 w-full h-full bg-gradient-to-t from-gravity-light dark:from-gravity-dark via-gravity-light/95 dark:via-gravity-dark/95 to-transparent z-10"></div>
            
            <div className="absolute bottom-0 left-0 right-0 flex justify-center items-end pointer-events-auto translate-y-12 z-20">
                <div className="relative w-full max-w-4xl h-[300px] flex flex-col items-center justify-end pb-24">
                    <div className="mb-6 opacity-50">
                        <Lock className="w-8 h-8 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
                    </div>
                    {isAddingUnit ? (
                      <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark px-8 py-4 rounded-full flex items-center gap-3 shadow-xl">
                          <Loader2 className="w-5 h-5 animate-spin text-gravity-blue" />
                          <span className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark text-sm">Extending...</span>
                      </div>
                    ) : (
                      <button 
                        onClick={openPathSelector}
                        className="bg-gravity-surface-light dark:bg-gravity-surface-dark hover:bg-white dark:hover:bg-gravity-surface-dark/80 border border-gravity-border-light dark:border-gravity-border-dark text-gravity-text-main-light dark:text-gravity-text-main-dark px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 transition-all transform hover:-translate-y-1"
                      >
                          <Cloud className="w-5 h-5 text-gravity-blue" />
                          <span className="font-bold text-sm uppercase tracking-wider">Extend Path</span>
                      </button>
                    )}
                </div>
            </div>
        </div>

      </main>

      {/* Path Selector Modal */}
      {isPathModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gravity-dark/50 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
              <button 
                onClick={() => setIsPathModalOpen(false)}
                className="absolute top-4 right-4 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full"
              >
                <X className="w-6 h-6 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
              </button>

              <h2 className="text-2xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark mb-6">Where to next?</h2>

              {loadingSuggestions ? (
                 <div className="space-y-3 py-4">
                    {[1,2,3].map(i => (
                       <div key={i} className="h-16 bg-black/5 dark:bg-white/5 rounded-xl animate-pulse"></div>
                    ))}
                 </div>
              ) : (
                 <div className="space-y-3 mb-8">
                    {suggestions.map((sugg, idx) => (
                       <button 
                         key={idx}
                         onClick={() => handleAddSpecificUnit(sugg)}
                         className="w-full text-left p-4 border border-gravity-border-light dark:border-gravity-border-dark bg-gravity-light dark:bg-black/20 rounded-xl hover:border-gravity-blue hover:shadow-md transition-all flex items-center justify-between group"
                       >
                          <span className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark">{sugg}</span>
                          <ArrowRight className="w-5 h-5 text-gravity-text-sub-light dark:text-gravity-text-sub-dark group-hover:text-gravity-blue" />
                       </button>
                    ))}
                 </div>
              )}

              <div className="flex gap-2">
                 <input 
                    type="text" 
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    placeholder="Or type custom topic..."
                    className="flex-1 p-3 bg-gravity-light dark:bg-black/20 border border-gravity-border-light dark:border-gravity-border-dark rounded-xl focus:outline-none focus:border-gravity-blue text-gravity-text-main-light dark:text-gravity-text-main-dark text-sm"
                 />
                 <Button onClick={() => handleAddSpecificUnit(customPath)} disabled={!customPath.trim()}>
                    <MapPin className="w-5 h-5" />
                 </Button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
