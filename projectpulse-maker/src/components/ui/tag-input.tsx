import React, { useState, useRef } from "react";

interface TagInputProps {
  value?: string[];
  onChange?: (v: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value = [], onChange, placeholder }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(value);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const addTag = (t: string) => {
    const v = t.trim();
    if (!v) return;
    if (tags.includes(v)) return;
    const next = [...tags, v];
    setTags(next);
    onChange?.(next);
  };

  const removeTag = (idx: number) => {
    const next = tags.filter((_, i) => i !== idx);
    setTags(next);
    onChange?.(next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (text.trim()) addTag(text);
      setText("");
    } else if (e.key === "Backspace" && !text && tags.length) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap border border-border/60 rounded-lg p-2 bg-background/40">
      {tags.map((t, i) => (
        <span key={i} className="inline-flex items-center gap-2 bg-muted/10 px-2 py-1 rounded text-xs">
          <span className="truncate max-w-[140px]">{t}</span>
          <button type="button" onClick={() => removeTag(i)} className="text-destructive hover:underline text-[11px]">×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => { if (text.trim()) { addTag(text); setText(""); } }}
        placeholder={placeholder}
        className="flex-1 min-w-[120px] bg-transparent text-xs outline-none px-1 py-1"
      />
    </div>
  );
}
