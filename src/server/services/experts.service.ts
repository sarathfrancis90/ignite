export interface SuggestedExpert {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  skills: string[];
  matchingSkills: string[];
}

export interface ExpertsDeps {
  getIdeaTags: (ideaId: string) => Promise<string[]>;
  findUsersBySkills: (
    skills: string[],
    excludeUserId: string,
    limit: number,
  ) => Promise<
    {
      id: string;
      firstName: string;
      lastName: string;
      displayName: string | null;
      avatarUrl: string | null;
      skills: string[];
    }[]
  >;
}

export async function getSuggestedExperts(
  ideaId: string,
  contributorId: string,
  limit: number,
  deps: ExpertsDeps,
): Promise<SuggestedExpert[]> {
  const tags = await deps.getIdeaTags(ideaId);

  if (tags.length === 0) {
    return [];
  }

  const users = await deps.findUsersBySkills(tags, contributorId, limit);

  return users.map((user) => {
    const matchingSkills = user.skills.filter((skill) =>
      tags.some((tag) => tag.toLowerCase() === skill.toLowerCase()),
    );
    return {
      ...user,
      matchingSkills,
    };
  });
}
