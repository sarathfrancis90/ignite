"use client";

import * as React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FIELD_TYPES, FIELD_TYPE_LABELS } from "@/types/campaign-wizard";
import type { CustomField, FieldType } from "@/types/campaign-wizard";

interface FormFieldBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

function generateFieldId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function createDefaultField(displayOrder: number): CustomField {
  return {
    id: generateFieldId(),
    type: "text_single",
    label: "",
    helpText: "",
    mandatory: false,
    displayOrder,
  };
}

export function FormFieldBuilder({ fields, onChange }: FormFieldBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(fields, oldIndex, newIndex).map((field, index) => ({
      ...field,
      displayOrder: index,
    }));
    onChange(reordered);
  };

  const addField = () => {
    onChange([...fields, createDefaultField(fields.length)]);
  };

  const updateField = (id: string, updates: Partial<CustomField>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id).map((f, index) => ({ ...f, displayOrder: index })));
  };

  return (
    <div className="space-y-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          {fields.map((field) => (
            <SortableFieldCard
              key={field.id}
              field={field}
              allFields={fields}
              onUpdate={(updates) => updateField(field.id, updates)}
              onRemove={() => removeField(field.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

      <Button type="button" variant="outline" onClick={addField} className="w-full border-dashed">
        <Plus className="mr-2 h-4 w-4" />
        Add Field
      </Button>
    </div>
  );
}

interface SortableFieldCardProps {
  field: CustomField;
  allFields: CustomField[];
  onUpdate: (updates: Partial<CustomField>) => void;
  onRemove: () => void;
}

function SortableFieldCard({ field, allFields, onUpdate, onRemove }: SortableFieldCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(!field.label);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const otherFields = allFields.filter((f) => f.id !== field.id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-gray-200 bg-white ${
        isDragging ? "shadow-lg ring-2 ring-primary-200" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="cursor-grab touch-none text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {field.label || "Untitled Field"}
          </span>
          <span className="text-xs text-gray-400">{FIELD_TYPE_LABELS[field.type]}</span>
          {field.mandatory && <span className="text-xs font-medium text-red-500">Required</span>}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-7 w-7 p-0 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input
                value={field.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Field label"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                value={field.type}
                onChange={(e) =>
                  onUpdate({
                    type: e.target.value as FieldType,
                    options: e.target.value === "selection" ? ["Option 1"] : undefined,
                  })
                }
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Help Text</Label>
            <Textarea
              value={field.helpText ?? ""}
              onChange={(e) => onUpdate({ helpText: e.target.value })}
              placeholder="Instructions or hints for the submitter"
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Selection options */}
          {field.type === "selection" && (
            <SelectionOptionsEditor
              options={field.options ?? []}
              onChange={(options) => onUpdate({ options })}
            />
          )}

          {/* Mandatory toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`mandatory-${field.id}`}
              checked={field.mandatory}
              onChange={(e) => onUpdate({ mandatory: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <Label htmlFor={`mandatory-${field.id}`} className="text-sm">
              Required field
            </Label>
          </div>

          {/* Visibility condition */}
          {otherFields.length > 0 && (
            <VisibilityConditionEditor
              field={field}
              otherFields={otherFields}
              onUpdate={onUpdate}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SelectionOptionsEditor({
  options,
  onChange,
}: {
  options: string[];
  onChange: (options: string[]) => void;
}) {
  const addOption = () => {
    onChange([...options, ""]);
  };

  const updateOption = (index: number, value: string) => {
    onChange(options.map((o, i) => (i === index ? value : o)));
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <Label>Options</Label>
      {options.map((option, index) => (
        <div key={index} className="flex gap-2">
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            placeholder={`Option ${index + 1}`}
            maxLength={100}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeOption(index)}
            disabled={options.length <= 1}
            className="h-10 w-10 shrink-0 p-0 text-gray-400 hover:text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={addOption}
        className="text-primary-600"
      >
        <Plus className="mr-1 h-3 w-3" />
        Add Option
      </Button>
    </div>
  );
}

function VisibilityConditionEditor({
  field,
  otherFields,
  onUpdate,
}: {
  field: CustomField;
  otherFields: CustomField[];
  onUpdate: (updates: Partial<CustomField>) => void;
}) {
  const hasCondition = !!field.visibilityCondition;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`visibility-${field.id}`}
          checked={hasCondition}
          onChange={(e) => {
            if (e.target.checked && otherFields[0]) {
              onUpdate({
                visibilityCondition: {
                  dependsOnFieldId: otherFields[0].id,
                  operator: "is_set",
                },
              });
            } else {
              onUpdate({ visibilityCondition: undefined });
            }
          }}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <Label htmlFor={`visibility-${field.id}`} className="text-sm">
          Conditional visibility
        </Label>
      </div>

      {hasCondition && field.visibilityCondition && (
        <div className="ml-6 grid gap-3 rounded-md bg-gray-50 p-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label className="text-xs">Show when field</Label>
            <select
              value={field.visibilityCondition.dependsOnFieldId}
              onChange={(e) =>
                onUpdate({
                  visibilityCondition: {
                    ...field.visibilityCondition!,
                    dependsOnFieldId: e.target.value,
                  },
                })
              }
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
            >
              {otherFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label || "Untitled"}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Condition</Label>
            <select
              value={field.visibilityCondition.operator}
              onChange={(e) =>
                onUpdate({
                  visibilityCondition: {
                    ...field.visibilityCondition!,
                    operator: e.target.value as "equals" | "not_equals" | "is_set" | "is_not_set",
                  },
                })
              }
              className="flex h-9 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="equals">Equals</option>
              <option value="not_equals">Not Equals</option>
              <option value="is_set">Is Set</option>
              <option value="is_not_set">Is Not Set</option>
            </select>
          </div>
          {(field.visibilityCondition.operator === "equals" ||
            field.visibilityCondition.operator === "not_equals") && (
            <div className="space-y-1">
              <Label className="text-xs">Value</Label>
              <Input
                value={field.visibilityCondition.value ?? ""}
                onChange={(e) =>
                  onUpdate({
                    visibilityCondition: {
                      ...field.visibilityCondition!,
                      value: e.target.value,
                    },
                  })
                }
                placeholder="Value"
                className="h-9"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
