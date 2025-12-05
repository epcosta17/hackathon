import React from 'react';
import { motion } from 'framer-motion';
import { Edit2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { TranscriptBlock } from '../App';

interface TranscriptSegmentProps {
  block: TranscriptBlock;
  isActive: boolean;
  isEditing: boolean;
  formatTime: (seconds: number) => string;
  getConfidenceColor: (confidence: number) => string;
  jumpToTimestamp: (timestamp: number) => void;
  handleBlockEdit: (id: string, newText: string) => void;
  setEditingBlockId: (id: string | null) => void;
  onBlur: () => void;
  activeBlockRef: React.RefObject<HTMLDivElement | null>;
}

export const TranscriptSegment = React.memo(({
  block,
  isActive,
  isEditing,
  formatTime,
  getConfidenceColor,
  jumpToTimestamp,
  handleBlockEdit,
  setEditingBlockId,
  onBlur,
  activeBlockRef
}: TranscriptSegmentProps) => {
  // Local state for editing to prevent cursor jumping
  const [localText, setLocalText] = React.useState(block.text);

  // Update local state when block text changes externally
  React.useEffect(() => {
    if (!isEditing) {
      setLocalText(block.text);
    }
  }, [block.text, isEditing]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
  };

  const handleTextBlur = () => {
    handleBlockEdit(block.id, localText);
    onBlur();
  };

  return (
    <div style={{ paddingBottom: '16px', paddingLeft: '4px', paddingRight: '4px' }}>
      <div
        ref={isActive ? activeBlockRef : null}
        className={`group relative p-4 rounded-lg border transition-colors duration-200 ${isActive
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'border-zinc-800 bg-zinc-900/30'
          }`}
      >
        {/* Accent bar on the left when active */}
        {isActive && (
          <div
            className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
          />
        )}

        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => jumpToTimestamp(block.timestamp)}
                className={`text-xs font-medium cursor-pointer p-2 -m-2 rounded-md transition-all duration-200 ${isActive
                  ? 'text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 hover:text-indigo-200'
                  : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10'
                  }`}
              >
                {formatTime(block.timestamp)}
              </button>
              {block.speaker && (
                <span className={`text-xs font-semibold px-2 py-1 rounded-md ${isActive
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-zinc-800 text-zinc-400'
                  }`}>
                  {block.speaker}
                </span>
              )}
            </div>
          </div>

          {isEditing ? (
            <Textarea
              value={localText}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="min-h-[80px] bg-zinc-900/50 border border-indigo-500/30 text-zinc-100 resize-none focus-visible:border-indigo-500/50 focus-visible:ring-1 focus-visible:ring-indigo-500/30 focus-visible:shadow-lg focus-visible:shadow-indigo-500/10"
            />
          ) : (
            <div className="flex items-start gap-3">
              <div
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingBlockId(block.id);
                }}
              >
                <p
                  className="leading-relaxed cursor-text"
                >
                  {block.words && block.words.length > 0 ? (
                    block.words?.map((word, idx) => (
                      <span
                        key={idx}
                        className={`${getConfidenceColor(word.confidence)} transition-colors`}
                        title={`Confidence: ${(word.confidence * 100).toFixed(1)}%`}
                      >
                        {word.text}{idx < (block.words?.length || 0) - 1 ? ' ' : ''}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-100">{block.text}</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
