"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Save, Video, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { FileUpload, type UploadedFile } from "@/components/shared/FileUpload";
import { stepDescriptionSchema } from "@/types/campaign-wizard";
import type { StepDescriptionData } from "@/types/campaign-wizard";

interface StepDescriptionProps {
  campaign: {
    title: string;
    teaser: string | null;
    description: string | null;
    bannerUrl: string | null;
    videoUrl: string | null;
    submissionCloseDate: string | null;
    votingCloseDate: string | null;
    plannedCloseDate: string | null;
    settings: unknown;
  };
  onSave: (data: StepDescriptionData) => void;
  isSaving: boolean;
  onNext: () => void;
}

function parseSettings(settings: unknown): {
  callToAction?: string;
  supportContent?: string;
  tags?: string[];
  attachments?: UploadedFile[];
} {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return settings as {
      callToAction?: string;
      supportContent?: string;
      tags?: string[];
      attachments?: UploadedFile[];
    };
  }
  return {};
}

function toDateInputValue(isoString: string | null): string {
  if (!isoString) return "";
  try {
    return new Date(isoString).toISOString().split("T")[0] ?? "";
  } catch {
    return "";
  }
}

export function StepDescription({ campaign, onSave, isSaving, onNext }: StepDescriptionProps) {
  const settings = parseSettings(campaign.settings);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<StepDescriptionData>({
    resolver: zodResolver(stepDescriptionSchema),
    defaultValues: {
      title: campaign.title,
      teaser: campaign.teaser ?? "",
      description: campaign.description ?? "",
      bannerUrl: campaign.bannerUrl,
      videoUrl: campaign.videoUrl,
      submissionCloseDate: toDateInputValue(campaign.submissionCloseDate),
      votingCloseDate: toDateInputValue(campaign.votingCloseDate),
      plannedCloseDate: toDateInputValue(campaign.plannedCloseDate),
      callToAction: settings.callToAction ?? "",
      supportContent: settings.supportContent ?? "",
      tags: settings.tags ?? [],
    },
  });

  const tags = watch("tags") ?? [];
  const [tagInput, setTagInput] = React.useState("");
  const [attachments, setAttachments] = React.useState<UploadedFile[]>(settings.attachments ?? []);

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 20) {
      setValue("tags", [...tags, tag], { shouldDirty: true });
      setTagInput("");
    }
  };

  const removeTag = (index: number) => {
    setValue(
      "tags",
      tags.filter((_, i) => i !== index),
      { shouldDirty: true },
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const onSubmit = (data: StepDescriptionData) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-semibold text-gray-900">Campaign Description</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure the campaign content, timeline, and supporting materials.
        </p>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title <span className="text-red-500">*</span>
        </Label>
        <Input
          id="title"
          {...register("title")}
          placeholder="e.g., Innovation Challenge 2026"
          maxLength={200}
        />
        {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
      </div>

      {/* Banner Image */}
      <div className="space-y-2">
        <Label htmlFor="bannerUrl">Banner Image URL</Label>
        <Input
          id="bannerUrl"
          {...register("bannerUrl")}
          placeholder="https://... (banner image URL or use S3 upload)"
        />
        {errors.bannerUrl && <p className="text-sm text-red-600">{errors.bannerUrl.message}</p>}
        <p className="text-xs text-gray-400">
          Provide a URL for the campaign banner image. S3 upload integration coming soon.
        </p>
      </div>

      {/* Timeline */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-gray-900">Timeline</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="submissionCloseDate">Submission Close</Label>
            <Input id="submissionCloseDate" type="date" {...register("submissionCloseDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="votingCloseDate">Voting Close</Label>
            <Input id="votingCloseDate" type="date" {...register("votingCloseDate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plannedCloseDate">Planned Close</Label>
            <Input id="plannedCloseDate" type="date" {...register("plannedCloseDate")} />
          </div>
        </div>
      </fieldset>

      {/* Teaser */}
      <div className="space-y-2">
        <Label htmlFor="teaser">Teaser</Label>
        <Textarea
          id="teaser"
          {...register("teaser")}
          placeholder="Short description shown on campaign cards"
          rows={2}
          maxLength={500}
        />
        {errors.teaser && <p className="text-sm text-red-600">{errors.teaser.message}</p>}
      </div>

      {/* Rich Text Description */}
      <div className="space-y-2">
        <Label>Description</Label>
        <RichTextEditor
          content={campaign.description ?? ""}
          onChange={(html) => setValue("description", html, { shouldDirty: true })}
          placeholder="Write a detailed campaign description..."
        />
        {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
      </div>

      {/* Video URL */}
      <div className="space-y-2">
        <Label htmlFor="videoUrl">
          <span className="flex items-center gap-1">
            <Video className="h-4 w-4" />
            Video URL
          </span>
        </Label>
        <Input
          id="videoUrl"
          {...register("videoUrl")}
          placeholder="https://youtube.com/... or https://vimeo.com/..."
        />
        {errors.videoUrl && <p className="text-sm text-red-600">{errors.videoUrl.message}</p>}
      </div>

      {/* File Attachments */}
      <div className="space-y-2">
        <Label>File Attachments</Label>
        <FileUpload files={attachments} onChange={setAttachments} maxFiles={10} />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>
          <span className="flex items-center gap-1">
            <Tag className="h-4 w-4" />
            Tags
          </span>
        </Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Type a tag and press Enter"
            maxLength={50}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={!tagInput.trim()}
          >
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tags.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-sm text-primary-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="text-primary-400 hover:text-primary-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div className="space-y-2">
        <Label htmlFor="callToAction">Call-to-Action Text</Label>
        <Input
          id="callToAction"
          {...register("callToAction")}
          placeholder="e.g., Submit your idea now!"
          maxLength={200}
        />
      </div>

      {/* Support Section */}
      <div className="space-y-2">
        <Label htmlFor="supportContent">Support Section</Label>
        <Textarea
          id="supportContent"
          {...register("supportContent")}
          placeholder="Additional support information for participants..."
          rows={3}
          maxLength={5000}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <p className="text-xs text-gray-400">
          {isDirty ? "You have unsaved changes" : "All changes saved"}
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" variant="outline" disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (isDirty) {
                handleSubmit(onSubmit)();
              }
              onNext();
            }}
          >
            Next: Submission Form
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );
}
