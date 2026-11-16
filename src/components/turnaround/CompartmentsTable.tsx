import React, { useState, useEffect } from 'react';
import { FieldValue } from '@/types/turnaround';
import {
  CompartmentDefinition,
  isPairedHold,
  HoldEntry,
  HoldDefinition,
  ITA_STYLE_TYPE_OPTIONS,
  sufijosDeUld,
  sufijoYaNoVale,
  activeSubHolds,
  readSplitMode,
  splitModeFieldId,
  type SplitMode,
} from '@/data/compartmentDefinitions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Hash, Undo2 } from 'lucide-react';
import { AirlineCode } from '@/types/turnaround';
import { sumNumericTokens, firstNumericToken } from '@/utils/sumCargoUnits';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CompartmentsTableProps {
  compartments: CompartmentDefinition[];
  values: FieldValue[];
  onChange: (holdId: string, value: string, previousValue?: string | null) => void;
  disabled?: boolean;
  airline?: AirlineCode;
}

const DEFAULT_EXTRA_FIELDS = 5;


export const CompartmentsTable: React.FC<CompartmentsTableProps> = ({
  compartments,
  values,
  onChange,
  disabled = false,
  airline,
}) => {
  const showNilButton = airline !== 'FEDEX';
  const [extraFieldCounts, setExtraFieldCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const counts: Record<string, number> = {};
    compartments.forEach((comp) => {
      if (comp.expandable) {
        const baseCount = comp.expandableDefault ?? DEFAULT_EXTRA_FIELDS;
        let maxIdx = baseCount;
        values.forEach((v) => {
          const match = v.fieldDefinitionId.match(new RegExp(`^${comp.id}-extra-(\\d+)$`));
          if (match) {
            const idx = parseInt(match[1], 10) + 1;
            if (idx > maxIdx) maxIdx = idx;
          }
        });
        counts[comp.id] = maxIdx;
      }
    });
    setExtraFieldCounts(counts);
  }, [compartments.map(c => c.id).join(',')]);

  const evaluateMath = (text: string): string => {
    // Only evaluate when the user just typed "=" at the very end
    if (!text.endsWith('=')) return text;
    return text.replace(/([\d\s+\-*\/().]+)=$/g, (match, expr) => {
      const trimmed = expr.trim();
      try {
        if (/^[\d\s+\-*\/().]+$/.test(trimmed) && /[+\-*\/]/.test(trimmed) && trimmed.length > 0) {
          const result = Function('"use strict"; return (' + trimmed + ')')();
          if (typeof result === 'number' && isFinite(result)) {
            return expr + '=' + result;
          }
        }
      } catch { /* ignore invalid expressions */ }
      return match;
    });
  };

  // Transforming the value on every keystroke (toUpperCase) resets the caret
  // to the end of the field on some mobile keyboards, since the browser sees
  // it as a brand-new value rather than the same text with a case change.
  // Editing a middle line then feels like the cursor "jumps down a line"
  // after each letter. Restore the caret position explicitly to fix it.
  const handleHoldTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, holdId: string) => {
    const el = e.target;
    const cursorPos = el.selectionStart;
    const raw = el.value.toUpperCase();
    const transformed = evaluateMath(raw);
    const lengthDelta = transformed.length - raw.length;
    onChange(holdId, transformed);
    const restorePos = cursorPos + (lengthDelta > 0 ? lengthDelta : 0);
    requestAnimationFrame(() => {
      el.setSelectionRange(restorePos, restorePos);
    });
  };

  const handleHoldInputChange = (e: React.ChangeEvent<HTMLInputElement>, holdId: string) => {
    const el = e.target;
    const cursorPos = el.selectionStart;
    const raw = el.value.toUpperCase();
    const transformed = evaluateMath(raw);
    const lengthDelta = transformed.length - raw.length;
    onChange(holdId, transformed);
    const restorePos = (cursorPos ?? transformed.length) + (lengthDelta > 0 ? lengthDelta : 0);
    requestAnimationFrame(() => {
      el.setSelectionRange(restorePos, restorePos);
    });
  };

  const getValue = (holdId: string): string =>
    values.find(v => v.fieldDefinitionId === holdId)?.value || '';

  const handleNil = (holdId: string) => {
    const current = getValue(holdId);
    onChange(holdId, 'NIL', current);
  };

  const handleUndo = (holdId: string) => {
    const entry = values.find(v => v.fieldDefinitionId === holdId);
    const prev = entry?.previousValue ?? '';
    onChange(holdId, prev, null);
  };

  const isNilSet = (holdId: string) => {
    const entry = values.find(v => v.fieldDefinitionId === holdId);
    if (entry?.value !== 'NIL') return false;
    if (entry.previousValue === undefined || entry.previousValue === null) return false;
    if (entry.nilSetAt) {
      const setTime = new Date(entry.nilSetAt).getTime();
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (now - setTime > TWENTY_FOUR_HOURS) return false;
    }
    return true;
  };

  const renderNilButton = (holdId: string) => {
    if (!showNilButton || disabled) return null;
    const nilActive = isNilSet(holdId);
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => nilActive ? handleUndo(holdId) : handleNil(holdId)}
        className={`aero-bodega-action h-9 w-9 shrink-0 rounded-xl font-bold ${nilActive ? 'aero-bodega-action-active text-destructive hover:text-destructive/80 border-destructive/50' : 'text-muted-foreground hover:text-foreground'}`}
        title={nilActive ? 'Deshacer NIL' : 'Escribir NIL'}
      >
        {nilActive ? <Undo2 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
      </Button>
    );
  };

  const handleItaNil = (hold: { id: string }) => {
    const typeFieldId = `${hold.id}-type`;
    const numFieldId = `${hold.id}-num`;
    const sufFieldId = `${hold.id}-suf`;
    const contentFieldId = `${hold.id}-content`;
    const ids = [typeFieldId, numFieldId, sufFieldId, contentFieldId];
    const currents = ids.map(fid => getValue(fid));
    // Batch call: pass arrays so parent applies all 3 changes atomically
    (onChange as any)(ids, ['NIL', 'NIL', 'NIL', 'NIL'], currents);
  };

  const handleItaUndo = (hold: { id: string }) => {
    const typeFieldId = `${hold.id}-type`;
    const numFieldId = `${hold.id}-num`;
    const sufFieldId = `${hold.id}-suf`;
    const contentFieldId = `${hold.id}-content`;
    const ids = [typeFieldId, numFieldId, sufFieldId, contentFieldId];
    const prevs = ids.map(fid => {
      const entry = values.find(v => v.fieldDefinitionId === fid);
      return entry?.previousValue ?? '';
    });
    // Batch call: pass null as previousValue marker to clear NIL state
    (onChange as any)(ids, prevs, [null, null, null, null]);
  };

  const isItaNilSet = (hold: { id: string }) => {
    const typeFieldId = `${hold.id}-type`;
    return isNilSet(typeFieldId);
  };

  const renderItaNilButton = (hold: { id: string }) => {
    if (!showNilButton || disabled) return null;
    const nilActive = isItaNilSet(hold);
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => nilActive ? handleItaUndo(hold) : handleItaNil(hold)}
        className={`aero-bodega-action h-9 w-9 shrink-0 rounded-xl font-bold ${nilActive ? 'aero-bodega-action-active text-destructive hover:text-destructive/80 border-destructive/50' : 'text-muted-foreground hover:text-foreground'}`}
        title={nilActive ? 'Deshacer NIL' : 'Escribir NIL'}
      >
        {nilActive ? <Undo2 className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
      </Button>
    );
  };

  /*
   * Posición en estilo contenedor: tipo + número arriba y contenido debajo.
   *
   * `media` es la mitad de una posición partida. Van las dos en la misma
   * fila, L a la izquierda y R a la derecha, porque apiladas una encima de
   * otra se leen como si fueran dos posiciones distintas del avión. Al tener
   * la mitad de ancho, la etiqueta pasa arriba y el tipo a su propia línea.
   */
  const renderItaHoldInput = (
    hold: { id: string; label: string },
    holdAirline?: AirlineCode,
    media = false,
  ) => {
    const typeOptions = ITA_STYLE_TYPE_OPTIONS[holdAirline || ''] || ['AKH-AZ', 'PKC-AZ'];
    const typeFieldId = `${hold.id}-type`;
    const numFieldId = `${hold.id}-num`;
    const sufFieldId = `${hold.id}-suf`;
    const contentFieldId = `${hold.id}-content`;
    const nilActive = isItaNilSet(hold);
    const tipo = getValue(typeFieldId);
    const sufijos = sufijosDeUld(holdAirline, tipo);

    const selectorTipo = (
      <Select
        value={nilActive ? undefined : tipo || undefined}
        onValueChange={(val) => {
          // Al cambiar de tipo, la terminación anterior puede no existir en el
          // nuevo (un AKE no termina en R9). Se limpia para no dejar un número
          // de contenedor que no se corresponde con nada.
          const actual = getValue(sufFieldId);
          if (sufijoYaNoVale(holdAirline, val, actual)) {
            (onChange as unknown as (i: string[], v: string[]) => void)(
              [typeFieldId, sufFieldId], [val, ''],
            );
            return;
          }
          onChange(typeFieldId, val);
        }}
        disabled={disabled || nilActive}
      >
        <SelectTrigger
          className={`h-9 font-mono text-sm bg-input border-border ${media ? 'flex-1 min-w-0' : 'w-20 shrink-0'}`}
        >
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {typeOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

    const campoNumero = (
      <Input
        type="text"
        inputMode="numeric"
        maxLength={5}
        value={nilActive ? '' : getValue(numFieldId)}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 5);
          onChange(numFieldId, val);
        }}
        disabled={disabled || nilActive}
        placeholder="00000"
        className="h-9 flex-1 min-w-0 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30 text-center"
      />
    );

    /* La terminación del número (AD, R7, R9). Sólo sale si el tipo la lleva. */
    const selectorSufijo = sufijos.length > 0 && (
      <Select
        value={nilActive ? undefined : getValue(sufFieldId) || undefined}
        onValueChange={(val) => onChange(sufFieldId, val)}
        disabled={disabled || nilActive}
      >
        <SelectTrigger className="h-9 w-[3.5rem] shrink-0 px-2 gap-0.5 font-mono text-sm bg-input border-border [&>svg]:h-3 [&>svg]:w-3">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent className="bg-popover z-50">
          {sufijos.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );

    return (
      <div
        key={hold.id}
        className={`border border-border rounded-lg space-y-2 ${media ? 'p-2' : 'p-3'}`}
      >
        {media ? (
          /*
           * A media anchura no caben el tipo, el número, la terminación y el
           * NIL en una línea sin que el número se quede en dos dígitos. El
           * NIL sube con el tipo y abajo queda el número con su terminación
           * al lado, que es como se lee un contenedor: 31576 + AD.
           */
          <>
            <div className="text-sm font-bold text-center text-foreground">{hold.label}</div>
            <div className="flex items-center gap-1">
              {selectorTipo}
              {renderItaNilButton(hold)}
            </div>
            <div className="flex items-center gap-1">
              {campoNumero}
              {selectorSufijo}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground shrink-0 min-w-[2.5rem]">
              {hold.label}:
            </span>
            {selectorTipo}
            {campoNumero}
            {selectorSufijo}
            {renderItaNilButton(hold)}
          </div>
        )}
        <Input
          type="text"
          value={nilActive ? 'NIL' : getValue(contentFieldId)}
          onChange={(e) => handleHoldInputChange(e, contentFieldId)}
          disabled={disabled || nilActive}
          placeholder="Contenido bodega"
          className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
        />
      </div>
    );
  };

  /*
   * Posición divisible: un palé que ocupa la sección entera, o la sección
   * partida en dos con un contenedor en cada mitad. Se elige aquí, en la
   * escala, porque la hoja de carga imprime las dos opciones y hasta que no
   * llega el avión no se sabe cuál toca.
   *
   * Cada modo guarda en campos distintos, así que cambiar de idea no borra
   * lo ya escrito: al volver, sigue donde estaba.
   */
  const renderSplitHold = (hold: HoldDefinition, holdAirline?: AirlineCode) => {
    if (!hold.split) return renderItaHoldInput(hold, holdAirline);
    const modo = readSplitMode(hold, getValue);
    const subs = activeSubHolds(hold, getValue);
    const cambiar = (nuevo: SplitMode) => {
      if (nuevo === modo) return;
      onChange(splitModeFieldId(hold.id), nuevo);
    };
    const botón = (valor: SplitMode, texto: string, título: string) => (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => cambiar(valor)}
        title={título}
        aria-pressed={modo === valor}
        className={`h-7 px-3 rounded-lg text-xs font-bold ${
          modo === valor
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        {texto}
      </Button>
    );

    return (
      <div key={hold.id} className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Posición {hold.label}
          </span>
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-input p-0.5">
            {botón('P', 'Palé', 'Una sola pieza: palé en toda la posición')}
            {botón('LR', 'L / R', 'Partida en dos: un contenedor en cada mitad')}
          </div>
        </div>
        {modo === 'LR' ? (
          <div className="grid grid-cols-2 gap-2">
            {subs.map((sub) => renderItaHoldInput(sub, holdAirline, true))}
          </div>
        ) : (
          subs.map((sub) => renderItaHoldInput(sub, holdAirline))
        )}
      </div>
    );
  };

  // Sum numeric tokens ignoring alpha chars; skips numbers followed by "kg" (peso, no unidades)
  // Shared helper — see src/utils/sumCargoUnits.ts

  // Wizz A321 compartment 3 alert logic: any field > 90, or sum of 31+32+33 > 90
  const WIZZ_A321_COMP3_IDS = ['wizz-hold-a32131', 'wizz-hold-a32132', 'wizz-hold-a32133'];
  const isWizzA321Comp3Hold = (holdId: string) => WIZZ_A321_COMP3_IDS.includes(holdId);

  // Wizz A320 compartment 1 alert logic: any field > 80, or sum of 11+12+13 > 80
  const WIZZ_A320_COMP1_IDS = ['wizz-hold-a32011', 'wizz-hold-a32012', 'wizz-hold-a32013'];
  const isWizzA320Comp1Hold = (holdId: string) => WIZZ_A320_COMP1_IDS.includes(holdId);

  const wizzA321Comp3Alert = React.useMemo(() => {
    if (airline !== 'WIZZ') return { anyOver: false, sumOver: false };
    const sum = WIZZ_A321_COMP3_IDS.reduce((acc, id) => acc + sumNumericTokens(getValue(id)), 0);
    const anyOver = WIZZ_A321_COMP3_IDS.some(id => sumNumericTokens(getValue(id)) > 90);
    return { anyOver, sumOver: sum > 90 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airline, values]);

  const wizzA320Comp1Alert = React.useMemo(() => {
    if (airline !== 'WIZZ') return { anyOver: false, sumOver: false };
    const sum = WIZZ_A320_COMP1_IDS.reduce((acc, id) => acc + sumNumericTokens(getValue(id)), 0);
    const anyOver = WIZZ_A320_COMP1_IDS.some(id => sumNumericTokens(getValue(id)) > 80);
    return { anyOver, sumOver: sum > 80 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [airline, values]);

  const shouldAlertHold = (holdId: string): boolean => {
    if (airline !== 'WIZZ') return false;
    if (isWizzA321Comp3Hold(holdId)) {
      if (wizzA321Comp3Alert.sumOver) return true;
      return sumNumericTokens(getValue(holdId)) > 90;
    }
    if (isWizzA320Comp1Hold(holdId)) {
      if (wizzA320Comp1Alert.sumOver) return true;
      return sumNumericTokens(getValue(holdId)) > 80;
    }
    return false;
  };

  const renderHoldInput = (hold: { id: string; label: string }) => {
    const val = getValue(hold.id);
    const lineCount = (val.match(/\n/g) || []).length + 1;
    const alert = shouldAlertHold(hold.id);
    return (
      <div key={hold.id} className="flex items-start gap-3">
        <label className="text-sm font-medium text-foreground/80 w-24 shrink-0 pt-2">
          {hold.label}:
        </label>
        <textarea
          value={val}
          onChange={(e) => handleHoldTextChange(e, hold.id)}
          disabled={disabled}
          placeholder="—"
          rows={lineCount}
          className={`flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6 ${alert ? 'blink-required' : ''}`}
        />
        {renderNilButton(hold.id)}
      </div>
    );
  };

  const renderPairedHold = (entry: HoldEntry, idx: number) => {
    if (!isPairedHold(entry)) return null;
    const leftVal = getValue(entry.left.id);
    const rightVal = getValue(entry.right.id);
    const leftLines = (leftVal.match(/\n/g) || []).length + 1;
    const rightLines = (rightVal.match(/\n/g) || []).length + 1;
    return (
      <div key={`pair-${idx}`} className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-center text-foreground/80">
            {entry.left.label}
          </label>
          <div className="flex gap-1">
            <textarea
              value={leftVal}
              onChange={(e) => handleHoldTextChange(e, entry.left.id)}
              disabled={disabled}
              placeholder="—"
              rows={leftLines}
              className="flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6"
            />
            {renderNilButton(entry.left.id)}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-bold text-center text-foreground/80">
            {entry.right.label}
          </label>
          <div className="flex gap-1">
            <textarea
              value={rightVal}
              onChange={(e) => handleHoldTextChange(e, entry.right.id)}
              disabled={disabled}
              placeholder="—"
              rows={rightLines}
              className="flex-1 font-mono text-base bg-input border border-border rounded-md px-3 py-2 focus:border-primary focus:ring-1 focus:ring-primary/30 resize-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[36px] leading-6"
            />
            {renderNilButton(entry.right.id)}
          </div>
        </div>
      </div>
    );
  };

  const addExtraField = (compId: string) => {
    setExtraFieldCounts((prev) => ({
      ...prev,
      [compId]: (prev[compId] ?? DEFAULT_EXTRA_FIELDS) + 1,
    }));
  };

  const renderExpandableFields = (comp: CompartmentDefinition) => {
    const count = extraFieldCounts[comp.id] ?? comp.expandableDefault ?? DEFAULT_EXTRA_FIELDS;
    return (
      <>
        {Array.from({ length: count }, (_, i) => {
          const fieldId = `${comp.id}-extra-${i}`;
          return (
            <div key={fieldId} className="flex items-center gap-3">
              <label className="text-sm font-medium text-foreground/80 w-24 shrink-0">
                {i + 1}:
              </label>
              <Input
                type="text"
                value={getValue(fieldId)}
                onChange={(e) => handleHoldInputChange(e, fieldId)}
                disabled={disabled}
                placeholder="—"
                className="h-9 font-mono text-base bg-input border-border focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
          );
        })}
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addExtraField(comp.id)}
            className="w-full mt-1 border-dashed border-border text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-1" />
            Añadir campo
          </Button>
        )}
      </>
    );
  };

  const isItaStyle = (comp: CompartmentDefinition) => comp.holdStyle === 'ita';

  return (
    <div className="aero-compartments space-y-5">
      {compartments.map((comp) => {
        const showWizzA321Alert =
          airline === 'WIZZ' &&
          comp.id === 'wizz-a321-comp3' &&
          (wizzA321Comp3Alert.anyOver || wizzA321Comp3Alert.sumOver);
        const showWizzA320Alert =
          airline === 'WIZZ' &&
          comp.id === 'wizz-a320-comp1' &&
          (wizzA320Comp1Alert.anyOver || wizzA320Comp1Alert.sumOver);
        return (
          <div key={comp.id}>
            <h3 className="text-sm font-bold text-primary mb-2 border-b border-border pb-1">
              {comp.compartmentName}
            </h3>
            {comp.legend && (
              <div className="mb-2 px-3 py-2 rounded-md bg-accent/10 border border-accent/30 text-sm font-semibold text-accent font-mono">
                {comp.legend}
              </div>
            )}
            <div className="space-y-2">

              {comp.holds.map((hold, idx) => {
                const isBulk = comp.bulk === true || comp.id.includes('bulk');
                return isItaStyle(comp) && !isPairedHold(hold)
                  ? renderSplitHold(hold, comp.airline)
                  : isPairedHold(hold)
                    ? renderPairedHold(hold, idx)
                    : renderHoldInput(hold);
              })}
              {comp.expandable && renderExpandableFields(comp)}
              {(() => {
                let total = 0;
                if (isItaStyle(comp)) {
                  // Paletizado (AKE/AKH): solo cuenta el primer número del contenido de cada posición
                  comp.holds.forEach((h) => {
                    if (isPairedHold(h)) return;
                    // En una posición divisible sólo cuenta el modo activo:
                    // si está partida suman las dos mitades, y si va en palé,
                    // sólo el palé. Lo del otro modo se queda guardado, pero
                    // no se suma dos veces.
                    activeSubHolds(h, getValue).forEach((sub) => {
                      total += firstNumericToken(getValue(`${sub.id}-content`));
                    });
                  });
                } else {
                  const ids: string[] = [];
                  comp.holds.forEach((h) => {
                    if (isPairedHold(h)) {
                      ids.push(h.left.id, h.right.id);
                    } else {
                      ids.push(h.id);
                    }
                  });
                  if (comp.expandable) {
                    const count = extraFieldCounts[comp.id] ?? comp.expandableDefault ?? DEFAULT_EXTRA_FIELDS;
                    for (let i = 0; i < count; i++) ids.push(`${comp.id}-extra-${i}`);
                  }
                  total = ids.reduce((acc, id) => acc + sumNumericTokens(getValue(id)), 0);
                }
                if (total <= 0) return null;
                return (
                  <div className="flex items-center justify-end gap-2 pt-1 mt-1 border-t border-border">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total:</span>
                    <span className="font-mono font-bold text-base text-primary">{total}</span>
                  </div>
                );
              })()}
              {showWizzA321Alert && (
                <div className="mt-2 text-xs font-bold text-destructive uppercase tracking-wide">
                  ⚠️ Límite superado: máximo 90 maletas en compartimiento 3 (B31+B32+B33).
                </div>
              )}
              {showWizzA320Alert && (
                <div className="mt-2 text-xs font-bold text-destructive uppercase tracking-wide">
                  ⚠️ Límite superado: máximo 80 maletas en compartimiento 1 (B11+B12+B13).
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
