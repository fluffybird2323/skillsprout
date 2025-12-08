import React, { useState, useEffect } from 'react';
import { X, BookOpen, ExternalLink, Video, FileText, Code, Lightbulb, Loader2, RefreshCw } from 'lucide-react';
import { ReferenceMaterial, UnitReferences, Unit } from '../types';
import { Button } from './ui/Button';
import { SubjectiveTopicModal } from './SubjectiveTopicModal';

interface ReferenceSectionProps {
  unit: Unit;
  topic: string;
  isOpen: boolean;
  onClose: () => void;
  onGenerateReferences: (unitId: string) => Promise<UnitReferences | null>;
}

const getTypeIcon = (type: ReferenceMaterial['type']) => {
  switch (type) {
    case 'video':
      return <Video className="w-4 h-4" />;
    case 'documentation':
      return <Code className="w-4 h-4" />;
    case 'tutorial':
      return <Lightbulb className="w-4 h-4" />;
    case 'interactive':
      return <Code className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
};

const getTypeLabel = (type: ReferenceMaterial['type']) => {
  switch (type) {
    case 'video':
      return 'Video';
    case 'documentation':
      return 'Docs';
    case 'tutorial':
      return 'Tutorial';
    case 'interactive':
      return 'Interactive';
    default:
      return 'Article';
  }
};

export const ReferenceSection: React.FC<ReferenceSectionProps> = ({
  unit,
  topic,
  isOpen,
  onClose,
  onGenerateReferences,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [references, setReferences] = useState<UnitReferences | null>(unit.references || null);
  const [error, setError] = useState<string | null>(null);
  const [showSubjectiveModal, setShowSubjectiveModal] = useState(false);

  useEffect(() => {
    if (unit.references) {
      setReferences(unit.references);
    }
  }, [unit.references]);

  const handleGenerateReferences = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const newRefs = await onGenerateReferences(unit.id);
      if (newRefs) {
        setReferences(newRefs);
        // Show modal if topic is subjective
        if (newRefs.shouldShowReferences === false) {
          setShowSubjectiveModal(true);
        }
      } else {
        setError('Could not find relevant reference materials for this unit.');
      }
    } catch (e) {
      setError('Failed to generate references. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchGoogle = () => {
    const searchQuery = encodeURIComponent(`${topic} ${unit.title}`);
    window.open(`https://www.google.com/search?q=${searchQuery}`, '_blank');
    setShowSubjectiveModal(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gravity-dark/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gravity-surface-light dark:bg-gravity-surface-dark border border-gravity-border-light dark:border-gravity-border-dark rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden relative flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gravity-border-light dark:border-gravity-border-dark flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: unit.color + '20' }}
            >
              <BookOpen className="w-5 h-5" style={{ color: unit.color }} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gravity-text-main-light dark:text-gravity-text-main-dark">
                Reference Materials
              </h2>
              <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark mt-1">
                {unit.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gravity-text-sub-light dark:text-gravity-text-sub-dark" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Optional notice */}
          <div className="bg-gravity-blue/5 border border-gravity-blue/20 rounded-xl p-4 mb-6">
            <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
              <span className="font-bold text-gravity-blue">Optional:</span> These materials are supplementary resources to help deepen your understanding. They are not required to progress through the course.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gravity-blue mb-4" />
              <p className="text-gravity-text-sub-light dark:text-gravity-text-sub-dark text-sm">
                Finding relevant resources...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-gravity-danger mb-4">{error}</p>
              <Button onClick={handleGenerateReferences} variant="secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : references && references.shouldShowReferences === false ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="w-12 h-12 text-gravity-blue mb-4 opacity-50" />
              <h3 className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2">
                Learn by Doing
              </h3>
              <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark text-center max-w-md">
                This topic is best learned through practice and experience. Focus on completing the lessons and quizzes!
              </p>
            </div>
          ) : references && references.materials.length > 0 ? (
            <div className="space-y-4">
              {references.materials.map((material) => {
                const isKnowledgeSummary = material.type === 'knowledge-summary' || !material.url;

                return isKnowledgeSummary ? (
                  // Non-clickable knowledge summary card
                  <div
                    key={material.id}
                    className="block p-4 border border-gravity-border-light dark:border-gravity-border-dark rounded-xl bg-gravity-light dark:bg-black/20"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: unit.color + '15' }}
                      >
                        <Lightbulb className="w-4 h-4" style={{ color: unit.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2">
                          {material.title}
                        </h3>
                        <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark mb-2">
                          {material.description}
                        </p>
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                          style={{ backgroundColor: unit.color + '15', color: unit.color }}
                        >
                          Key Concept
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Clickable external link
                  <a
                    key={material.id}
                    href={material.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 border border-gravity-border-light dark:border-gravity-border-dark rounded-xl hover:border-gravity-blue hover:shadow-md transition-all group bg-gravity-light dark:bg-black/20"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: unit.color + '15' }}
                      >
                        {getTypeIcon(material.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark truncate group-hover:text-gravity-blue transition-colors">
                            {material.title}
                          </h3>
                          <ExternalLink className="w-4 h-4 text-gravity-text-sub-light dark:text-gravity-text-sub-dark opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                        <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark line-clamp-2 mb-2">
                          {material.description}
                        </p>
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                            style={{ backgroundColor: unit.color + '15', color: unit.color }}
                          >
                            {getTypeLabel(material.type)}
                          </span>
                          <span className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
                            {material.source}
                          </span>
                          {material.validatedAt && (
                            <span className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark opacity-50">
                              Verified {new Date(material.validatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <BookOpen className="w-12 h-12 text-gravity-text-sub-light dark:text-gravity-text-sub-dark mb-4 opacity-30" />
              <h3 className="font-bold text-gravity-text-main-light dark:text-gravity-text-main-dark mb-2">
                No References Yet
              </h3>
              <p className="text-sm text-gravity-text-sub-light dark:text-gravity-text-sub-dark text-center mb-6 max-w-sm">
                Generate curated reference materials to supplement your learning for this unit.
              </p>
              <Button onClick={handleGenerateReferences}>
                <BookOpen className="w-4 h-4 mr-2" />
                Generate References
              </Button>
            </div>
          )}
        </div>

        {/* Footer with refresh option if references exist */}
        {references && references.materials.length > 0 && (
          <div className="p-4 border-t border-gravity-border-light dark:border-gravity-border-dark shrink-0 flex justify-between items-center">
            <span className="text-xs text-gravity-text-sub-light dark:text-gravity-text-sub-dark">
              {references.materials.length} resource{references.materials.length !== 1 ? 's' : ''} found
            </span>
            <button
              onClick={handleGenerateReferences}
              disabled={isLoading}
              className="text-xs text-gravity-blue hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Subjective Topic Modal */}
      <SubjectiveTopicModal
        isOpen={showSubjectiveModal}
        onClose={() => setShowSubjectiveModal(false)}
        topic={topic}
        unitTitle={unit.title}
        onSearchGoogle={handleSearchGoogle}
      />
    </div>
  );
};
