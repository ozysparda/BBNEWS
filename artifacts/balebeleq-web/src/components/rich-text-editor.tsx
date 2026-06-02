import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, AlignLeft, AlignCenter, AlignRight,
  AlignJustify, LinkIcon, Highlighter, Type, Minus, RemoveFormatting
} from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

const colors = [
  { name: "Hitam", value: "#000000" },
  { name: "Merah", value: "#e11d48" },
  { name: "Biru", value: "#1d4ed8" },
  { name: "Hijau", value: "#16a34a" },
  { name: "Jingga", value: "#ea580c" },
  { name: "Ungu", value: "#7c3aed" },
  { name: "Abu", value: "#6b7280" },
];

function ToolbarButton({
  onClick, active, title, children, className
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        "p-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-muted text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-0.5" />;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, placeholder = "Mulai menulis artikel...", minHeight = "450px" }: RichTextEditorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[inherit] prose prose-sm max-w-none dark:prose-invert prose-headings:font-serif prose-a:text-primary",
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl === "") {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/30 p-2 flex flex-wrap gap-0.5 items-center">
        {/* Undo/Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
          <Undo className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
          <Redo className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="Judul 1"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Judul 2"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Judul 3"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Tebal (Ctrl+B)"
        >
          <Bold className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Miring (Ctrl+I)"
        >
          <Italic className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Garis bawah (Ctrl+U)"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="Coret"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          active={editor.isActive("highlight")}
          title="Sorot teks"
        >
          <Highlighter className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Text color */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Warna teks"
          >
            <Type className="w-3.5 h-3.5" />
          </ToolbarButton>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-2 z-50 flex gap-1.5 flex-wrap w-36">
              {colors.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.name}
                  className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                  onClick={() => { editor.chain().focus().setColor(c.value).run(); setShowColorPicker(false); }}
                />
              ))}
              <button
                type="button"
                title="Hapus warna"
                className="w-5 h-5 rounded-full border border-border bg-muted hover:scale-110 transition-transform text-[10px] flex items-center justify-center"
                onClick={() => { editor.chain().focus().unsetColor().run(); setShowColorPicker(false); }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <Divider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Rata kiri"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Rata tengah"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Rata kanan"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          active={editor.isActive({ textAlign: "justify" })}
          title="Rata kanan-kiri"
        >
          <AlignJustify className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Daftar poin"
        >
          <List className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Daftar angka"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Kutipan"
        >
          <Quote className="w-3.5 h-3.5" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Garis pemisah"
        >
          <Minus className="w-3.5 h-3.5" />
        </ToolbarButton>

        <Divider />

        {/* Link */}
        <div className="relative">
          <ToolbarButton
            onClick={() => {
              if (editor.isActive("link")) {
                editor.chain().focus().unsetLink().run();
              } else {
                setShowLinkInput(!showLinkInput);
                setLinkUrl(editor.getAttributes("link").href || "");
              }
            }}
            active={editor.isActive("link")}
            title="Tautan"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </ToolbarButton>
          {showLinkInput && (
            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg p-2 z-50 flex gap-2 w-72">
              <input
                className="flex-1 text-sm border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") setLink(); if (e.key === "Escape") setShowLinkInput(false); }}
                autoFocus
              />
              <button type="button" onClick={setLink} className="px-2 py-1 bg-primary text-primary-foreground rounded text-xs font-medium">OK</button>
            </div>
          )}
        </div>

        <ToolbarButton
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Hapus format"
        >
          <RemoveFormatting className="w-3.5 h-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="px-5 py-4"
        style={{ minHeight }}
      />

      {/* Word/char count */}
      <div className="border-t border-border bg-muted/20 px-4 py-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{editor.storage.characterCount?.words?.() ?? ""}</span>
        <span>{editor.getText().trim().split(/\s+/).filter(Boolean).length} kata · {editor.getText().length} karakter</span>
      </div>
    </div>
  );
}
