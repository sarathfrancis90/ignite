import { type LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, icon: Icon }: ComingSoonProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50">
        <Icon className="h-10 w-10 text-primary-500" />
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold text-gray-900">{title}</h2>
      <p className="mt-3 max-w-md text-center text-base text-gray-500">{description}</p>
      <div className="mt-8 flex items-center gap-2 rounded-full bg-accent-50 px-4 py-2">
        <div className="h-2 w-2 animate-pulse rounded-full bg-accent-500" />
        <span className="text-sm font-medium text-accent-700">In Development</span>
      </div>
    </div>
  );
}
