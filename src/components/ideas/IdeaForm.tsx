"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";

const ideaFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title must be 200 characters or less"),
  teaser: z.string().max(1000).optional(),
  description: z.string().max(50000).optional(),
  category: z.string().max(200).optional(),
  tagsInput: z.string().optional(),
  isConfidential: z.boolean(),
  inventionDisclosure: z.boolean(),
});

interface IdeaFormValues {
  title: string;
  teaser?: string;
  description?: string;
  category?: string;
  tagsInput?: string;
  isConfidential: boolean;
  inventionDisclosure: boolean;
}

interface IdeaFormProps {
  campaignId: string;
  idea?: {
    id: string;
    title: string;
    teaser: string | null;
    description: string | null;
    category: string | null;
    tags: string[];
    isConfidential: boolean;
    inventionDisclosure: boolean;
  };
  onSuccess?: () => void;
}

const ideaFormResolver: Resolver<IdeaFormValues> = async (values) => {
  const result = ideaFormSchema.safeParse(values);
  if (result.success) {
    return { values: result.data, errors: {} };
  }
  const fieldErrors: Record<string, { type: string; message: string }> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (!fieldErrors[path]) {
      fieldErrors[path] = { type: "validation", message: issue.message };
    }
  }
  return { values: {}, errors: fieldErrors };
};

function parseTags(tagsStr: string): string[] {
  return tagsStr
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function IdeaForm({ campaignId, idea, onSuccess }: IdeaFormProps) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const isEditing = !!idea;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IdeaFormValues>({
    resolver: ideaFormResolver,
    defaultValues: {
      title: idea?.title ?? "",
      teaser: idea?.teaser ?? "",
      description: idea?.description ?? "",
      category: idea?.category ?? "",
      tagsInput: idea?.tags.join(", ") ?? "",
      isConfidential: idea?.isConfidential ?? false,
      inventionDisclosure: idea?.inventionDisclosure ?? false,
    },
  });

  const createMutation = trpc.idea.create.useMutation();
  const updateMutation = trpc.idea.update.useMutation();
  const submitMutation = trpc.idea.submit.useMutation();

  const isPending =
    createMutation.isPending || updateMutation.isPending || submitMutation.isPending;

  function buildPayload(values: IdeaFormValues) {
    const tags = parseTags(values.tagsInput ?? "");
    return {
      title: values.title,
      teaser: values.teaser || undefined,
      description: values.description || undefined,
      category: values.category || undefined,
      tags,
      isConfidential: values.isConfidential,
      inventionDisclosure: values.inventionDisclosure,
    };
  }

  function handleCreateSuccess(dataId: string) {
    void utils.idea.list.invalidate({ campaignId });
    if (onSuccess) {
      onSuccess();
    } else {
      router.push(`/ideas/${dataId}`);
    }
  }

  function handleUpdateSuccess(dataId: string) {
    void utils.idea.list.invalidate({ campaignId });
    void utils.idea.getById.invalidate({ id: dataId });
    if (onSuccess) {
      onSuccess();
    }
  }

  function handleSubmitSuccess() {
    void utils.idea.list.invalidate({ campaignId });
    if (idea) {
      void utils.idea.getById.invalidate({ id: idea.id });
    }
    if (onSuccess) {
      onSuccess();
    }
  }

  function onSaveDraft(values: IdeaFormValues) {
    const payload = buildPayload(values);

    if (isEditing) {
      updateMutation.mutate(
        {
          id: idea.id,
          ...payload,
          teaser: payload.teaser ?? null,
          description: payload.description ?? null,
          category: payload.category ?? null,
        },
        { onSuccess: (data) => handleUpdateSuccess(data.id) },
      );
    } else {
      createMutation.mutate(
        {
          campaignId,
          ...payload,
          submitImmediately: false,
        },
        { onSuccess: (data) => handleCreateSuccess(data.id) },
      );
    }
  }

  function onSubmitIdea(values: IdeaFormValues) {
    const payload = buildPayload(values);

    if (isEditing) {
      updateMutation.mutate(
        {
          id: idea.id,
          ...payload,
          teaser: payload.teaser ?? null,
          description: payload.description ?? null,
          category: payload.category ?? null,
        },
        {
          onSuccess: (data) => {
            handleUpdateSuccess(data.id);
            submitMutation.mutate({ id: idea.id }, { onSuccess: handleSubmitSuccess });
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          campaignId,
          ...payload,
          submitImmediately: true,
        },
        { onSuccess: (data) => handleCreateSuccess(data.id) },
      );
    }
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? submitMutation.error;

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmitIdea)}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            placeholder="Give your idea a clear, concise title"
            {...register("title")}
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>}
        </div>

        <div>
          <Label htmlFor="teaser">Teaser</Label>
          <Textarea
            id="teaser"
            placeholder="A short summary of your idea (visible on cards)"
            rows={2}
            {...register("teaser")}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Describe your idea in detail..."
            rows={8}
            {...register("description")}
          />
        </div>

        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            placeholder="e.g., Sustainability, Digitalization"
            {...register("category")}
          />
        </div>

        <div>
          <Label htmlFor="tagsInput">Tags (comma-separated)</Label>
          <Input
            id="tagsInput"
            placeholder="e.g., AI, automation, cost-reduction"
            {...register("tagsInput")}
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded" {...register("isConfidential")} />
            Confidential idea
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="rounded" {...register("inventionDisclosure")} />
            Invention disclosure
          </label>
        </div>
      </div>

      {mutationError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {mutationError.message}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={handleSubmit(onSaveDraft)}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save as Draft
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Idea
        </Button>
      </div>
    </form>
  );
}
