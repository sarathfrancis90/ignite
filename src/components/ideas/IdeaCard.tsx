"use client";

import Link from "next/link";
import { Heart, MessageCircle, Eye, Tag } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IdeaStatus } from "@/types/idea";

interface IdeaCardProps {
  idea: {
    id: string;
    title: string;
    teaser: string | null;
    status: IdeaStatus;
    tags: string[];
    likesCount: number;
    commentsCount: number;
    viewsCount: number;
    contributor?: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    createdAt: string;
  };
}

export function IdeaCard({ idea }: IdeaCardProps) {
  const initials = idea.contributor?.name
    ? idea.contributor.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <Link href={`/ideas/${idea.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base group-hover:text-primary-600">
              {idea.title}
            </CardTitle>
            <StatusBadge status={idea.status} />
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {idea.teaser && <p className="line-clamp-3 text-sm text-gray-500">{idea.teaser}</p>}
          {idea.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {idea.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {tag}
                </span>
              ))}
              {idea.tags.length > 3 && (
                <span className="text-xs text-gray-400">+{idea.tags.length - 3}</span>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="text-xs text-gray-400">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1.5">
              {idea.contributor && (
                <>
                  <Avatar className="h-5 w-5">
                    {idea.contributor.image ? (
                      <AvatarImage
                        src={idea.contributor.image}
                        alt={idea.contributor.name ?? "User"}
                      />
                    ) : (
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    )}
                  </Avatar>
                  <span className="max-w-[100px] truncate">
                    {idea.contributor.name ?? idea.contributor.email}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-0.5">
                <Heart className="h-3.5 w-3.5" />
                {idea.likesCount}
              </span>
              <span className="flex items-center gap-0.5">
                <MessageCircle className="h-3.5 w-3.5" />
                {idea.commentsCount}
              </span>
              <span className="flex items-center gap-0.5">
                <Eye className="h-3.5 w-3.5" />
                {idea.viewsCount}
              </span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
