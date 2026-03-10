interface WelcomeHeaderProps {
  firstName: string;
}

export function WelcomeHeader({ firstName }: WelcomeHeaderProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div data-testid="welcome-header">
      <h1 className="text-2xl font-bold text-gray-900">
        Welcome back, {firstName}!
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Your innovation pulse for today &middot; {today}
      </p>
    </div>
  );
}
