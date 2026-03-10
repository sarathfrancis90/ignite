"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

interface MentionUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSearchUsers: (query: string) => Promise<MentionUser[]>;
  placeholder?: string;
  disabled?: boolean;
}

export function MentionInput({
  value,
  onChange,
  onSearchUsers,
  placeholder = "Write a comment...",
  disabled = false,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<MentionUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [, setMentionQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const detectMention = useCallback((text: string, cursorPos: number) => {
    const textBeforeCursor = text.slice(0, cursorPos);
    const mentionMatch = /@(\w*)$/.exec(textBeforeCursor);
    return mentionMatch ? mentionMatch[1] : null;
  }, []);

  const handleChange = useCallback(
    async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      const cursorPos = e.target.selectionStart;
      const query = detectMention(newValue, cursorPos);

      if (query !== null && query.length >= 1) {
        setMentionQuery(query);
        const users = await onSearchUsers(query);
        setSuggestions(users);
        setShowSuggestions(users.length > 0);
        setSelectedIndex(0);
      } else {
        setShowSuggestions(false);
      }
    },
    [onChange, onSearchUsers, detectMention],
  );

  const insertMention = useCallback(
    (user: MentionUser) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = value.slice(0, cursorPos);
      const textAfterCursor = value.slice(cursorPos);

      // Find the @ that started the mention
      const mentionStart = textBeforeCursor.lastIndexOf("@");
      const displayName =
        user.displayName ?? `${user.firstName} ${user.lastName}`;
      const mentionText = `@[${displayName}](${user.id}) `;

      const newValue =
        value.slice(0, mentionStart) + mentionText + textAfterCursor;
      onChange(newValue);
      setShowSuggestions(false);

      // Restore focus
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = mentionStart + mentionText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!showSuggestions) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
      } else if (e.key === "Enter" && suggestions[selectedIndex]) {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, selectedIndex, insertMention],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="mention-input-wrapper" data-testid="mention-input">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="mention-textarea"
        rows={3}
        data-testid="comment-textarea"
      />
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="mention-suggestions"
          data-testid="mention-suggestions"
        >
          {suggestions.map((user, index) => (
            <button
              key={user.id}
              className={`mention-suggestion-item ${
                index === selectedIndex ? "mention-suggestion-active" : ""
              }`}
              onClick={() => insertMention(user)}
              data-testid={`mention-user-${user.id}`}
            >
              <div className="mention-user-avatar">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    className="avatar-img-sm"
                  />
                ) : (
                  <div className="avatar-placeholder-sm">
                    {user.firstName[0]}
                    {user.lastName[0]}
                  </div>
                )}
              </div>
              <span className="mention-user-name">
                {user.displayName ?? `${user.firstName} ${user.lastName}`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
