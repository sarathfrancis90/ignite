"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { UserCircle, Save, Loader2, LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { trpc } from "@/lib/trpc";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const profileQuery = trpc.user.getProfile.useQuery(undefined, {
    enabled: status === "authenticated",
  });

  const updateMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      profileQuery.refetch();
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    },
  });

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [notificationFrequency, setNotificationFrequency] = useState("IMMEDIATE");
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name ?? "");
      setBio(profileQuery.data.bio ?? "");
      setSkills(profileQuery.data.skills ?? []);
      setNotificationFrequency(profileQuery.data.notificationFrequency ?? "IMMEDIATE");
    }
  }, [profileQuery.data]);

  if (status === "loading" || profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  function handleAddSkill(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const trimmed = skillInput.trim().replace(/,/g, "");
      if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
        setSkills([...skills, trimmed]);
      }
      setSkillInput("");
    }
  }

  function handleRemoveSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      name: name || undefined,
      bio: bio || undefined,
      skills,
      notificationFrequency: notificationFrequency as "IMMEDIATE" | "DAILY" | "WEEKLY",
    });
  }

  async function handleSignOut() {
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
        </div>
        <Button variant="outline" onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar size="lg">
              {profileQuery.data?.image && (
                <AvatarImage
                  src={profileQuery.data.image}
                  alt={profileQuery.data.name ?? "Avatar"}
                />
              )}
              <AvatarFallback>{getInitials(profileQuery.data?.name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{profileQuery.data?.name ?? "User"}</CardTitle>
              <CardDescription>{profileQuery.data?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your display name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-gray-400">{bio.length}/500 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills">Skills</Label>
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder="Type a skill and press Enter"
              />
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-primary-400 hover:text-primary-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notifications">Notification frequency</Label>
              <select
                id="notifications"
                value={notificationFrequency}
                onChange={(e) => setNotificationFrequency(e.target.value)}
                className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="DAILY">Daily digest</option>
                <option value="WEEKLY">Weekly digest</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
              {isSaved && <span className="text-sm text-green-600">Profile updated!</span>}
              {updateMutation.error && (
                <span className="text-sm text-red-600">{updateMutation.error.message}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-gray-500">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Member since</dt>
              <dd className="text-gray-900">
                {profileQuery.data?.createdAt
                  ? new Date(profileQuery.data.createdAt).toLocaleDateString()
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-gray-900">{session?.user?.email ?? "—"}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
