"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

export default function NewCampaignPage() {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [teaser, setTeaser] = React.useState("");
  const [submissionCloseDate, setSubmissionCloseDate] = React.useState("");
  const [plannedCloseDate, setPlannedCloseDate] = React.useState("");

  const createMutation = trpc.campaign.create.useMutation();
  const handleSuccess = React.useCallback(
    (id: string) => {
      router.push(`/campaigns/${id}`);
    },
    [router],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        teaser: teaser.trim() || undefined,
        submissionCloseDate: submissionCloseDate
          ? new Date(submissionCloseDate).toISOString()
          : undefined,
        plannedCloseDate: plannedCloseDate ? new Date(plannedCloseDate).toISOString() : undefined,
      },
      {
        onSuccess: (data) => {
          handleSuccess(data.id);
        },
      },
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Campaigns
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
              <Megaphone className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <CardTitle>Create Campaign</CardTitle>
              <CardDescription>
                Set up a new innovation campaign with the simple setup wizard.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">
                Campaign Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g., Innovation Challenge 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="teaser">Teaser</Label>
              <Input
                id="teaser"
                placeholder="Short description shown on campaign cards"
                value={teaser}
                onChange={(e) => setTeaser(e.target.value)}
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Detailed description of the campaign..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="submissionCloseDate">Submission Close Date</Label>
                <Input
                  id="submissionCloseDate"
                  type="date"
                  value={submissionCloseDate}
                  onChange={(e) => setSubmissionCloseDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="plannedCloseDate">Planned Close Date</Label>
                <Input
                  id="plannedCloseDate"
                  type="date"
                  value={plannedCloseDate}
                  onChange={(e) => setPlannedCloseDate(e.target.value)}
                />
              </div>
            </div>

            {createMutation.isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {createMutation.error.message}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Link href="/campaigns">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
