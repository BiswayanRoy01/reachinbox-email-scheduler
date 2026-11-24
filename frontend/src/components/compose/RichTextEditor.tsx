import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";
import { cn } from "../../utils/cn";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = "Write your email message here...",
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-emerald-600 underline cursor-pointer",
        },
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[220px] p-4 text-slate-800 text-sm leading-relaxed",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const setLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter destination URL:", previousUrl);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
      {/* Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/70 border-b border-slate-100 text-slate-600">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("bold") && "bg-slate-200 text-slate-900 font-bold"
          )}
          title="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("italic") && "bg-slate-200 text-slate-900"
          )}
          title="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("underline") && "bg-slate-200 text-slate-900"
          )}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("bulletList") && "bg-slate-200 text-slate-900"
          )}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("orderedList") && "bg-slate-200 text-slate-900"
          )}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("blockquote") && "bg-slate-200 text-slate-900"
          )}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={setLink}
          className={cn(
            "p-1.5 rounded-lg hover:bg-slate-200/70 transition-colors",
            editor.isActive("link") && "bg-slate-200 text-emerald-700"
          )}
          title="Insert Link"
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        {editor.isActive("link") && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-rose-500 transition-colors"
            title="Remove Link"
          >
            <Unlink className="w-4 h-4" />
          </button>
        )}

        <div className="h-4 w-px bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-40 transition-colors"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-lg hover:bg-slate-200/70 disabled:opacity-40 transition-colors"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </button>
      </div>

      {/* Editor Main Content Area */}
      <div className="tiptap-editor">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
