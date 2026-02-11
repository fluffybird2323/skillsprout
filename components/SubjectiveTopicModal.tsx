import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Search, Info } from 'lucide-react';
import { useStore } from '../store/useStore';

interface SubjectiveTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: string;
  unitTitle: string;
  onSearchGoogle: () => void;
}

export const SubjectiveTopicModal: React.FC<SubjectiveTopicModalProps> = ({
  isOpen,
  onClose,
  topic,
  unitTitle,
  onSearchGoogle,
}) => {
  const { t } = useTranslation();
  const { theme } = useStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gravity-surface-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-gravity-border-dark max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gravity-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gravity-text-main-dark">
              {t('subjectiveModal.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-gravity-text-main-dark">
                {t('subjectiveModal.subtitle')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gravity-text-sub-dark leading-relaxed">
                {t('subjectiveModal.description', { topic: unitTitle })}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gravity-text-main-dark">
              <strong>{t('subjectiveModal.whyNoRefs')}</strong>
            </p>
            <ul className="text-sm text-gray-600 dark:text-gravity-text-sub-dark space-y-1.5 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                <span>{t('subjectiveModal.reason1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                <span>{t('subjectiveModal.reason2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 dark:text-blue-400 mt-1">•</span>
                <span>{t('subjectiveModal.reason3')}</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <p className="text-sm text-gray-600 dark:text-gravity-text-sub-dark">
              {t('subjectiveModal.exploreExternal')}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gravity-border-dark">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('subjectiveModal.continueLearning')}
          </button>
          <button
            onClick={onSearchGoogle}
            className="flex-1 px-4 py-2.5 bg-blue-600 dark:bg-gravity-blue text-white rounded-lg font-medium hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {t('subjectiveModal.searchGoogle')}
          </button>
        </div>
      </div>
    </div>
  );
};
