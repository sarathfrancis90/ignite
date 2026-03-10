"use client";

import * as React from "react";
import { ArrowLeft, Save, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormFieldBuilder } from "@/components/campaigns/FormFieldBuilder";
import { customFieldsArraySchema } from "@/types/campaign-wizard";
import type { CustomField, StepSubmissionFormData } from "@/types/campaign-wizard";

interface StepSubmissionFormProps {
  campaign: {
    customFields: unknown;
  };
  onSave: (data: StepSubmissionFormData) => void;
  isSaving: boolean;
  onBack: () => void;
  onDone: () => void;
}

function parseCustomFields(raw: unknown): CustomField[] {
  if (!raw) return [];
  try {
    const result = customFieldsArraySchema.safeParse(raw);
    if (result.success) return result.data;
  } catch {
    // fall through
  }
  return [];
}

export function StepSubmissionForm({
  campaign,
  onSave,
  isSaving,
  onBack,
  onDone,
}: StepSubmissionFormProps) {
  const [fields, setFields] = React.useState<CustomField[]>(() =>
    parseCustomFields(campaign.customFields),
  );
  const [showPreview, setShowPreview] = React.useState(false);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

  const validate = (): boolean => {
    const errs: string[] = [];
    fields.forEach((field, index) => {
      if (!field.label.trim()) {
        errs.push(`Field ${index + 1} is missing a label`);
      }
      if (field.type === "selection" && (!field.options || field.options.length === 0)) {
        errs.push(`Field "${field.label || index + 1}" needs at least one option`);
      }
    });
    setValidationErrors(errs);
    return errs.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave({ customFields: fields });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-gray-900">Submission Form</h2>
          <p className="mt-1 text-sm text-gray-500">
            Build a custom form that participants will fill out when submitting ideas.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Live Preview
            </>
          )}
        </Button>
      </div>

      {validationErrors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <ul className="list-inside list-disc space-y-1 text-sm text-red-600">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={showPreview ? "grid gap-8 lg:grid-cols-2" : ""}>
        {/* Form Builder */}
        <div>
          <FormFieldBuilder fields={fields} onChange={setFields} />
          {fields.length === 0 && (
            <p className="mt-4 text-center text-sm text-gray-400">
              No custom fields yet. Click &quot;Add Field&quot; to get started.
            </p>
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Form Preview</h3>
            {fields.length === 0 ? (
              <p className="text-sm text-gray-400">Add fields to see a preview.</p>
            ) : (
              <div className="space-y-4">
                {fields.map((field) => (
                  <FormFieldPreview key={field.id} field={field} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back: Description
        </Button>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (validate()) {
                onSave({ customFields: fields });
                onDone();
              }
            }}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save & Finish"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function FormFieldPreview({ field }: { field: CustomField }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">
        {field.label || "Untitled Field"}
        {field.mandatory && <span className="ml-1 text-red-500">*</span>}
      </Label>
      {field.helpText && <p className="text-xs text-gray-400">{field.helpText}</p>}
      {field.type === "text_single" && (
        <Input disabled placeholder={field.label || "Enter text..."} />
      )}
      {field.type === "text_multi" && (
        <Textarea disabled placeholder={field.label || "Enter text..."} rows={3} />
      )}
      {field.type === "keyword" && <Input disabled placeholder="Type tags separated by comma..." />}
      {field.type === "selection" && (
        <select
          disabled
          className="flex h-10 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
        >
          <option value="">Select...</option>
          {(field.options ?? []).map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )}
      {field.type === "checkbox" && (
        <div className="flex items-center gap-2">
          <input type="checkbox" disabled className="h-4 w-4 rounded border-gray-300" />
          <span className="text-sm text-gray-500">{field.label || "Check this option"}</span>
        </div>
      )}
      {field.visibilityCondition && (
        <p className="text-xs italic text-gray-400">Shown conditionally based on another field</p>
      )}
    </div>
  );
}
