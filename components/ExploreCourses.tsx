import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';
import { Search, Compass, BookOpen, Users, Star, ArrowRight, Loader2, X, ArrowLeft } from 'lucide-react';
import { Course, AppState } from '../types';

export const ExploreCourses: React.FC = () => {
  const { t } = useTranslation();
  const store = useStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const hasActiveCourse = !!store.activeCourseId;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const url = debouncedQuery 
          ? `/api/courses?topic=${encodeURIComponent(debouncedQuery)}&limit=20`
          : '/api/courses?limit=20';
        const res = await fetch(url);
        const data = await res.json();
        if (data.courses) {
          setCourses(data.courses);
        }
      } catch (error) {
        console.error('Failed to fetch explore courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [debouncedQuery]);

  const handleJoinCourse = (course: Course) => {
    // Check if we already have this course
    const exists = store.courses.find(c => c.id === course.id);
    if (exists) {
      store.switchCourse(course.id);
    } else {
      store.addCourse(course);
    }
  };

  return (
    <div className="min-h-screen bg-gravity-light dark:bg-gravity-dark pt-8 md:pt-24 pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Mobile Back Button */}
        {hasActiveCourse && (
          <button 
            onClick={() => store.setAppState(AppState.ROADMAP)}
            className="md:hidden flex items-center gap-2 text-gravity-text-sub-light dark:text-gravity-text-sub-dark mb-6 font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('explore.backToCourse')}
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 text-gravity-blue mb-4">
              <Compass className="w-8 h-8" />
              <span className="text-sm font-black uppercase tracking-[0.3em]">{t('explore.discovery')}</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-gravity-text-main-light dark:text-gravity-text-main-dark">
              {t('explore.title')}
            </h1>
            <p className="text-lg text-gravity-text-sub-light dark:text-gravity-text-sub-dark mt-2 font-light">
              {t('explore.subtitle')}
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
            <input
              type="text"
              placeholder={t('explore.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-black/5 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-2xl focus:border-gravity-blue focus:ring-1 focus:ring-gravity-blue outline-none transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
              </button>
            )}
          </div>
        </div>

        {/* Course Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-gravity-blue animate-spin mb-4" />
            <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark font-medium">{t('explore.scanning')}</p>
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div 
                key={course.id}
                className="group relative bg-white/50 dark:bg-white/5 border border-gravity-border-light dark:border-gravity-border-dark rounded-3xl p-6 hover:border-gravity-blue/50 hover:shadow-xl hover:shadow-gravity-blue/5 transition-all duration-300 flex flex-col"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-14 h-14 flex items-center justify-center text-3xl bg-gravity-light dark:bg-gravity-dark rounded-2xl shadow-inner border border-gravity-border-light dark:border-gravity-border-dark group-hover:scale-110 transition-transform">
                    {course.icon || '📚'}
                  </div>
                  <div className="px-3 py-1 bg-gravity-blue/10 text-gravity-blue text-[10px] font-black uppercase tracking-widest rounded-full">
                    {course.depth}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2 group-hover:text-gravity-blue transition-colors line-clamp-2">
                  {course.topic}
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark mb-8">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    <span>{t('explore.units', { count: course.units.length })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>{course.generatedByName || t('explore.anonymous')}</span>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-gravity-border-light dark:border-gravity-border-dark flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-xs font-bold">{t('explore.communityChoice')}</span>
                  </div>
                  <button 
                    onClick={() => handleJoinCourse(course)}
                    className="flex items-center gap-2 text-sm font-bold text-gravity-blue hover:gap-3 transition-all"
                  >
                    {t('explore.startLearning')} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-black/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-gravity-border-light dark:border-gravity-border-dark">
            <div className="w-20 h-20 bg-gravity-light dark:bg-gravity-dark rounded-full flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
            </div>
            <h3 className="text-2xl font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2">{t('explore.noCourses')}</h3>
            <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark">{t('explore.noCoursesSubtitle')}</p>
            <button 
              onClick={() => store.setAppState(AppState.ONBOARDING)}
              className="mt-8 px-8 py-4 bg-gravity-blue text-white font-bold rounded-2xl shadow-lg hover:bg-gravity-blue/90 transition-all active:scale-95"
            >
              {t('explore.generateNow')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
