"use client";

import Link from "next/link";
import Image from "next/image";
import { Users, User } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";

export interface ChannelCardProps {
  channel: {
    id: string;
    title: string;
    teaser: string | null;
    bannerUrl: string | null;
    status: "ACTIVE" | "ARCHIVED";
    memberCount: number;
    createdBy: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    createdAt: string;
  };
}

export function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <Link href={`/channels/${channel.id}`}>
      <Card className="group h-full transition-shadow hover:shadow-md">
        {channel.bannerUrl ? (
          <div className="relative h-40 w-full overflow-hidden rounded-t-xl bg-gray-100">
            <Image src={channel.bannerUrl} alt={channel.title} fill className="object-cover" />
          </div>
        ) : (
          <div className="h-40 w-full rounded-t-xl bg-gradient-to-br from-accent-50 to-accent-100" />
        )}
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-base group-hover:text-primary-600">
              {channel.title}
            </CardTitle>
            <StatusBadge status={channel.status} />
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          {channel.teaser && <p className="line-clamp-2 text-sm text-gray-500">{channel.teaser}</p>}
        </CardContent>
        <CardFooter className="text-xs text-gray-400">
          <div className="flex w-full items-center justify-between">
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {channel.createdBy.name ?? channel.createdBy.email}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {channel.memberCount}
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
