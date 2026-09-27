import { useEffect, useId, useRef, useState } from 'react';
import {
  applyPlaceFixes,
  findPlaceFixes,
  localSuggestions,
  mergeSuggestions,
  onlineSuggestions,
  splitDestination,
  type PlaceFix,
  type PlaceSuggestion,
} from '../services/placeSuggest';
import { IconMapPin, IconClose } from './Icons';

type Props = {
  id: string;
  value: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** enableDestinationAutocomplete. OFF: behaves as a plain text input. */
  enabled: boolean;
  pastDestinations: string[];
  /** `picked` is set when the value came from a suggestion or a "did you mean" fix. */
  onChange: (value: string, picked?: PlaceSuggestion) => void;
};

// The place being typed is the text after the last separator, so
// "Goa, Gokar" suggests for "Gokar" and a pick keeps "Goa, ".
const lastSeparator = /(,|&|\/|→|->|\band\b)(?!.*(,|&|\/|→|->|\band\b))/i;
function currentPart(value: string): { prefix: string; part: string } {
  const m = value.match(lastSeparator);
  if (!m || m.index === undefined) return { prefix: '', part: value.trim() };
  const cut = m.index + m[0].length;
  return { prefix: value.slice(0, cut) + ' ', part: value.slice(cut).trim() };
}

export function DestinationInput({ id, value, placeholder, autoFocus, enabled, pastDestinations, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [fixes, setFixes] = useState<PlaceFix[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const checkRef = useRef<AbortController | null>(null);
  const timerRef = useRef(0);
  const listId = useId();

  const lookup = (text: string) => {
    window.clearTimeout(timerRef.current);
    abortRef.current?.abort();
    const { part } = currentPart(text);
    if (part.length < 2) {
      setSuggestions([]);
      return;
    }
    const local = localSuggestions(part, pastDestinations);
    setSuggestions(local);
    setActive(-1);
    // Debounced so the online geocoder sees one request per pause, not per key.
    timerRef.current = window.setTimeout(() => {
      if (!navigator.onLine || part.length < 3) return;
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      void onlineSuggestions(part, ctrl.signal).then((online) => {
        if (ctrl.signal.aborted) return;
        setSuggestions(mergeSuggestions(local, online));
      });
    }, 250);
  };

  // Finds every misspelled place: the built-in list answers at once, then
  // each place (not only the last one typed) is looked up online, so
  // "Tirthn, Jibhii" gets both fixes. Online results are cached per place.
  const checkFixes = (text: string) => {
    checkRef.current?.abort();
    setFixes(findPlaceFixes(text, []));
    if (!navigator.onLine) return;
    const ctrl = new AbortController();
    checkRef.current = ctrl;
    const parts = splitDestination(text).slice(0, 5);
    void Promise.all(parts.map((p) => onlineSuggestions(p, ctrl.signal))).then((lists) => {
      if (!ctrl.signal.aborted) setFixes(findPlaceFixes(text, lists.flat()));
    });
  };

  // Editing an existing trip: offer fixes for a destination saved with typos.
  useEffect(() => {
    if (enabled && value) checkFixes(value);
    // Once per form open: later edits are checked on blur.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => () => {
    window.clearTimeout(timerRef.current);
    abortRef.current?.abort();
    checkRef.current?.abort();
  }, []);

  // Applies some or all fixes, then re-checks what's left.
  const applyFixes = (chosen: PlaceFix[]) => {
    const next = applyPlaceFixes(value, chosen);
    onChange(next, chosen[chosen.length - 1].suggestion);
    setFixes((prev) => prev.filter((f) => !chosen.includes(f)));
  };

  const pick = (s: PlaceSuggestion) => {
    const { prefix } = currentPart(value);
    onChange(prefix + s.name, s);
    setOpen(false);
    setSuggestions([]);
    setFixes([]);
  };

  const showList = enabled && open && suggestions.length > 0;

  return (
    <div className="dest-input">
      <input
        id={id}
        type="text"
        className="input-field"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        role={enabled ? 'combobox' : undefined}
        aria-expanded={enabled ? showList : undefined}
        aria-controls={enabled ? listId : undefined}
        aria-autocomplete={enabled ? 'list' : undefined}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          if (!enabled) return;
          checkRef.current?.abort();
          setFixes([]);
          setOpen(true);
          lookup(e.target.value);
        }}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + step + suggestions.length) % suggestions.length);
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault(); // pick, don't submit the trip form
            pick(suggestions[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        onBlur={() => {
          setOpen(false);
          if (enabled && value) checkFixes(value);
        }}
      />

      {showList && (
        <ul className="dest-suggest-list" role="listbox" id={listId} aria-label="Destination suggestions">
          {suggestions.map((s, i) => (
            <li
              key={`${s.name}|${s.countryCode}|${i}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`dest-suggest-item${i === active ? ' is-active' : ''}`}
              // mousedown, not click: fires before the input's blur closes the list.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
            >
              <IconMapPin size={15} />
              <span className="dest-suggest-text">
                <span className="dest-suggest-name">{s.name}</span>
                {s.detail && <span className="dest-suggest-detail">{s.detail}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {enabled && fixes.length === 1 && !showList && (
        <div className="dest-fix-chip" role="status">
          <span>
            Did you mean <strong>{fixes[0].suggestion.name}</strong>
            {fixes[0].suggestion.detail ? <span className="dest-fix-detail"> · {fixes[0].suggestion.detail}</span> : null}?
          </span>
          <button type="button" className="dest-fix-use" onClick={() => applyFixes(fixes)}>
            Use it
          </button>
          <button type="button" className="dest-fix-dismiss" aria-label="Keep what I typed" onClick={() => setFixes([])}>
            <IconClose size={14} />
          </button>
        </div>
      )}

      {/* Several typos: one pill per place (fix just that one) plus Fix all. */}
      {enabled && fixes.length > 1 && !showList && (
        <div className="dest-fix-chip dest-fix-multi" role="status">
          <span className="dest-fix-multi-title">Fix {fixes.length} spellings?</span>
          <div className="dest-fix-pills">
            {fixes.map((f) => (
              <button key={f.typed} type="button" className="dest-fix-pill" onClick={() => applyFixes([f])}>
                <s>{f.typed}</s> → <strong>{f.suggestion.name}</strong>
              </button>
            ))}
          </div>
          <div className="dest-fix-multi-actions">
            <button type="button" className="dest-fix-use" onClick={() => applyFixes(fixes)}>
              Fix all
            </button>
            <button type="button" className="dest-fix-dismiss" aria-label="Keep what I typed" onClick={() => setFixes([])}>
              <IconClose size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
