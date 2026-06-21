import React, { useState, useEffect, useRef } from 'react';

interface TagAutocompleteProps {
  value?: string[];
  onChange?: (v: string[]) => void;
  placeholder?: string;
  /** Optional fixed suggestion list. If omitted and fetchTech=true, fetches /api/v1/tech */
  suggestions?: string[];
  /** If true (default false), fetches tech stack from /api/v1/tech as suggestions */
  fetchTech?: boolean;
}

export function TagAutocomplete({ value = [], onChange, placeholder, suggestions: suggestionsProp, fetchTech = false }: TagAutocompleteProps) {
  const [tags, setTags] = useState<string[]>(value);
  const [input, setInput] = useState('');
  const [fetchedSuggestions, setFetchedSuggestions] = useState<string[]>([]);
  const [showList, setShowList] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setTags(value); }, [value]);

  // Only fetch tech suggestions when explicitly opted in
  useEffect(() => {
    if (!fetchTech || suggestionsProp) return;
    let active = true;
    fetch('/api/v1/tech')
      .then(r => r.ok ? r.json() : Promise.reject('no'))
      .then((data: string[]) => {
        if (!active) return;
        setFetchedSuggestions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setFetchedSuggestions(['React','Node.js','PostgreSQL','TypeScript','Java','Spring Boot','Redis','Docker','Kubernetes','AWS','GCP','Azure','Python','Go','Rust','MongoDB','Elasticsearch','Kafka','RabbitMQ','GraphQL']);
      });
    return () => { active = false; }
  }, [fetchTech, suggestionsProp]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowList(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const allSuggestions = suggestionsProp ?? fetchedSuggestions;

  const addTag = (t: string) => {
    const v = t.trim();
    if (!v) return;
    if (tags.includes(v)) return;
    const next = [...tags, v];
    setTags(next);
    onChange?.(next);
  };

  const removeTag = (i: number) => {
    const next = tags.filter((_, idx) => idx !== i);
    setTags(next);
    onChange?.(next);
  };

  const commitInput = () => {
    if (input.trim()) {
      addTag(input);
      setInput('');
      setShowList(false);
    }
  };

  const filtered = allSuggestions.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s)
  );

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 flex-wrap border border-border/60 rounded-lg p-2 bg-background/40 min-h-[40px]">
        {tags.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
            <span className="truncate max-w-[160px]">{t}</span>
            <button type="button" onClick={() => removeTag(i)} className="text-primary/60 hover:text-destructive text-sm leading-none transition-colors">×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowList(true); }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ',' || e.key === 'Tab') && input.trim()) {
              e.preventDefault();
              commitInput();
            }
            // Backspace on empty input removes last tag
            if (e.key === 'Backspace' && !input && tags.length > 0) {
              removeTag(tags.length - 1);
            }
          }}
          onBlur={commitInput}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] bg-transparent text-xs outline-none px-1 py-1"
        />
      </div>
      {showList && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border/60 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map((s, i) => (
            <div
              key={i}
              className="px-3 py-2 hover:bg-primary/8 cursor-pointer text-sm flex items-center gap-2 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); addTag(s); setInput(''); setShowList(false); }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
