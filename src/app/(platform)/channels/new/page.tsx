"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Radio } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { channelCreateInput } from "@/lib/schemas/channel";
import type { ChannelCreateInput } from "@/lib/schemas/channel";

export default function NewChannelPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChannelCreateInput>({
    resolver: zodResolver(channelCreateInput),
    defaultValues: {
      title: "",
      teaser: "",
      description: "",
      problemStatement: "",
    },
  });

  const createMutation = trpc.channel.create.useMutation({
    onSuccess: (data: { id: string }) => {
      router.push(`/channels/${data.id}`);
    },
  });

  const onSubmit = (data: ChannelCreateInput) => {
    createMutation.mutate({
      title: data.title,
      description: data.description || undefined,
      teaser: data.teaser || undefined,
      problemStatement: data.problemStatement || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/channels"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Channels
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-50">
              <Radio className="h-5 w-5 text-accent-600" />
            </div>
            <div>
              <CardTitle>Create Channel</CardTitle>
              <CardDescription>
                Set up an always-open channel for continuous idea collection.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Channel Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="e.g., Sustainability Ideas"
                maxLength={200}
              />
              {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="teaser">Teaser</Label>
              <Input
                id="teaser"
                {...register("teaser")}
                placeholder="Short description shown on channel cards"
                maxLength={500}
              />
              {errors.teaser && <p className="text-sm text-red-600">{errors.teaser.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Detailed description of the channel..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="problemStatement">Problem Statement (optional)</Label>
              <Textarea
                id="problemStatement"
                {...register("problemStatement")}
                placeholder="Describe the problem or challenge this channel addresses..."
                rows={3}
              />
              {errors.problemStatement && (
                <p className="text-sm text-red-600">{errors.problemStatement.message}</p>
              )}
              <p className="text-xs text-gray-400">
                Help contributors understand the context by describing the problem space.
              </p>
            </div>

            {createMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {createMutation.error.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Link href="/channels">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Channel"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
