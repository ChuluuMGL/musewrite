import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { marked } from 'marked';
import { Sparkles, PenLine, Scissors, Bold, Italic, Loader2 } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onAiAction?: (action: string, selectedText: string) => Promise<string | null>;
  readOnly?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  onAiAction, 
  readOnly = false 
}) => {
  const [internalValue, setInternalValue] = useState(value);
  const [isProcessing, setIsProcessing] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '在这里开始写作，或在左侧生成内容...',
      }),
    ],
    content: '', // Replaced below
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setInternalValue(html);
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-none min-h-[500px] leading-loose text-[15px] sm:text-[16px]',
      },
    },
  });

  // Handle external value changes (e.g. from backend generation)
  useEffect(() => {
    if (editor && value !== internalValue) {
      const isHtml = /<[a-z][\s\S]*>/i.test(value);
      
      let htmlContent = value;
      if (!isHtml && value) {
        htmlContent = marked.parse(value, { async: false }) as string;
      }

      setInternalValue(htmlContent || '');
      editor.commands.setContent(htmlContent || '');
    }
  }, [value, editor, internalValue]);

  // Bubble menu handler
  const handleAiAction = async (action: string) => {
    if (!onAiAction || !editor) return;
    
    const { from, to } = editor.state.selection;
    if (from === to) return; // Nothing selected

    const text = editor.state.doc.textBetween(from, to, ' ');
    if (text) {
      setIsProcessing(true);
      try {
        const resultText = await onAiAction(action, text);
        if (resultText) {
          // TipTap nicely handles the replacement and ensures smooth formatting
          editor.chain().focus().insertContentAt({ from, to }, resultText).run();
        }
      } catch (err) {
        console.error('AI Action failed:', err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="relative w-full h-full editor-container">
      {editor && (
        <BubbleMenu 
          editor={editor} 
          className="flex gap-1.5 items-center bg-white dark:bg-[#1e1e21] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-black/5 dark:border-white/10 rounded-full px-3 py-1.5 backdrop-blur-xl"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-brand">
              <Loader2 className="w-4 h-4 animate-spin" /> 处理中...
            </div>
          ) : (
            <>
              <button
                onClick={() => handleAiAction('improve')}
                className="px-2 py-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors flex gap-1.5 items-center text-xs font-semibold"
                title="AI 润色选中文本"
              >
                <Sparkles className="w-3.5 h-3.5" /> 润色
              </button>
              <button
                onClick={() => handleAiAction('expand')}
                className="px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex gap-1.5 items-center text-xs font-semibold"
                title="AI 扩写选中文本"
              >
                <PenLine className="w-3.5 h-3.5" /> 扩写
              </button>
              <button
                onClick={() => handleAiAction('shorten')}
                className="px-2 py-1.5 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors flex gap-1.5 items-center text-xs font-semibold"
                title="AI 缩写选中文本"
              >
                <Scissors className="w-3.5 h-3.5" /> 精简
              </button>
              
              <div className="w-px h-5 bg-gray-200 dark:bg-gray-700/50 mx-1"></div>
              
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${editor.isActive('bold') ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${editor.isActive('italic') ? 'bg-black/10 dark:bg-white/10 text-black dark:text-white' : 'text-gray-500 hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                <Italic className="w-4 h-4" />
              </button>
            </>
          )}
        </BubbleMenu>
      )}
      
      <div className="h-full custom-scrollbar overflow-y-auto px-4 py-6 sm:px-8 max-w-3xl mx-auto">
        <EditorContent editor={editor} className="min-h-full" />
      </div>
    </div>
  );
};
