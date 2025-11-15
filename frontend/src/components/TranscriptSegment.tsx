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

  return (
    <div style={{ paddingBottom: '16px', paddingLeft: '4px', paddingRight: '4px' }}>
      <div
        ref={isActive ? activeBlockRef : null}
        className={`group relative p-4 rounded-lg border ${isActive ? 'border-blue-500 bg-blue-500/5 shadow-lg shadow-blue-500/10' : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-800/30'}`}
      >
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => jumpToTimestamp(block.timestamp)}
              className="text-xs font-medium text-blue-400 hover:text-blue-300 cursor-pointer p-2 -m-2"
            >
              {formatTime(block.timestamp)}
            </button>
          </div>
          
          {isEditing ? (
            <Textarea
              value={block.text}
              onChange={(e) => handleBlockEdit(block.id, e.target.value)}
              onBlur={onBlur}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="min-h-[80px] bg-zinc-800 border-zinc-700 text-zinc-100 resize-none"
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
                    block.words.map((word, idx) => (
                      <span
                        key={idx}
                        className={`${getConfidenceColor(word.confidence)} transition-colors`}
                        title={`Confidence: ${(word.confidence * 100).toFixed(1)}%`}
                      >
                        {word.text}{idx < block.words.length - 1 ? ' ' : ''}
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
