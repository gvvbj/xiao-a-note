import React from 'react';
import { cn } from '@/shared/utils';
import katex from 'katex';
// Ensure KaTeX styles are loaded locally to prevent CDN issues/missing styles
import 'katex/dist/katex.min.css';

// 常用数学符号集合
const MATH_SYMBOLS = [
  { label: 'Sum', value: '\\sum_{i=0}^n' },
  { label: 'Fraction', value: '\\frac{a}{b}' },
  { label: 'Sqrt', value: '\\sqrt{x}' },
  { label: 'Infinity', value: '\\infty' },
  { label: 'Alpha', value: '\\alpha' },
  { label: 'Beta', value: '\\beta' },
  { label: 'Gamma', value: '\\gamma' },
  { label: 'Delta', value: '\\delta' },
  { label: 'Pi', value: '\\pi' },
  { label: 'Theta', value: '\\theta' },
  { label: 'Approx', value: '\\approx' },
  { label: 'Leq', value: '\\leq' },
  { label: 'Geq', value: '\\geq' },
  { label: 'Neq', value: '\\neq' },
  { label: 'Times', value: '\\times' },
  { label: 'Div', value: '\\div' },
  { label: 'Integral', value: '\\int_a^b' },
  { label: 'Limit', value: '\\lim_{x \\to 0}' },
  { label: 'Arrow', value: '\\rightarrow' },
  { label: 'Subset', value: '\\subset' },
];

interface MathPickerProps {
  onSelect: (value: string) => void;
  className?: string;
}

export function MathPicker({ onSelect, className }: MathPickerProps) {
  const renderLatex = (latex: string) => {
    try {
      return { __html: katex.renderToString(latex) };
    } catch {
      return { __html: latex };
    }
  };

  return (
    <div className={cn("grid grid-cols-5 gap-2 p-3 w-72 bg-popover border border-border rounded-lg shadow-xl bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100", className)}>
      {MATH_SYMBOLS.map((item) => (
        <button
          key={item.label}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.value);
          }}
          // Added overflow-hidden to prevent rendering artifacts (lines) from spilling out
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded flex items-center justify-center transition-colors min-h-[36px] overflow-hidden"
          title={item.label}
        >
          {/* 使用 dangerouslySetInnerHTML 渲染 KaTeX 生成的 HTML */}
          <span dangerouslySetInnerHTML={renderLatex(item.value)} style={{ fontSize: '1.1em' }} />
        </button>
      ))}
    </div>
  );
}