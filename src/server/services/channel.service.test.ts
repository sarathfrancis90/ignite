import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listChannels,
  getChannelById,
  createChannel,
  updateChannel,
  archiveChannel,
  ChannelServiceError,
} from "./channel.service";

vi.mock("@/server/lib/prisma", () => ({
  prisma: {
    channel: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/server/lib/logger", () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) },
}));

vi.mock("@/server/events/event-bus", () => ({
  eventBus: { emit: vi.fn() },
}));

const { prisma } = await import("@/server/lib/prisma");

const mockChannel = {
  id: "ch_1",
  title: "Test Channel",
  teaser: "A test channel",
  description: "Channel description",
  problemStatement: null,
  bannerUrl: null,
  status: "ACTIVE" as const,
  hasQualificationPhase: false,
  hasDiscussionPhase: true,
  hasVoting: false,
  hasLikes: true,
  votingCriteria: null,
  customFields: null,
  settings: null,
  createdById: "user_1",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  createdBy: { id: "user_1", name: "Test User", email: "test@example.com", image: null },
  _count: { members: 3 },
};

describe("channel.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("listChannels", () => {
    it("lists channels with pagination", async () => {
      vi.mocked(prisma.channel.findMany).mockResolvedValue([mockChannel]);

      const result = await listChannels({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Test Channel");
      expect(result.items[0].memberCount).toBe(3);
      expect(result.nextCursor).toBeUndefined();
    });

    it("filters by status", async () => {
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);

      await listChannels({ limit: 20, status: "ARCHIVED" });

      expect(prisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "ARCHIVED" },
        }),
      );
    });

    it("filters by search term", async () => {
      vi.mocked(prisma.channel.findMany).mockResolvedValue([]);

      await listChannels({ limit: 20, search: "test" });

      expect(prisma.channel.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { title: { contains: "test", mode: "insensitive" } },
              { teaser: { contains: "test", mode: "insensitive" } },
            ],
          },
        }),
      );
    });
  });

  describe("getChannelById", () => {
    it("returns channel with member count", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue(mockChannel);

      const result = await getChannelById("ch_1");

      expect(result.id).toBe("ch_1");
      expect(result.memberCount).toBe(3);
    });

    it("throws CHANNEL_NOT_FOUND when channel does not exist", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue(null);

      await expect(getChannelById("ch_missing")).rejects.toThrow(ChannelServiceError);
      await expect(getChannelById("ch_missing")).rejects.toThrow("Channel not found");
    });
  });

  describe("createChannel", () => {
    it("creates channel in ACTIVE status", async () => {
      const created = { ...mockChannel, _count: undefined };
      vi.mocked(prisma.channel.create).mockResolvedValue(created as never);

      const result = await createChannel({ title: "New Channel", description: "Desc" }, "user_1");

      expect(result.title).toBe("Test Channel");
      expect(prisma.channel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: "ACTIVE",
            createdById: "user_1",
          }),
        }),
      );
    });
  });

  describe("updateChannel", () => {
    it("updates channel fields", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue({ id: "ch_1" } as never);
      const updated = { ...mockChannel, title: "Updated", _count: undefined };
      vi.mocked(prisma.channel.update).mockResolvedValue(updated as never);

      const result = await updateChannel({ id: "ch_1", title: "Updated" }, "user_1");

      expect(result.title).toBe("Updated");
    });

    it("throws CHANNEL_NOT_FOUND when channel does not exist", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue(null);

      await expect(updateChannel({ id: "ch_missing" }, "user_1")).rejects.toThrow(
        "Channel not found",
      );
    });
  });

  describe("archiveChannel", () => {
    it("archives an active channel", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue({
        id: "ch_1",
        status: "ACTIVE",
      } as never);
      const archived = { ...mockChannel, status: "ARCHIVED" as const, _count: undefined };
      vi.mocked(prisma.channel.update).mockResolvedValue(archived as never);

      const result = await archiveChannel("ch_1", "user_1");

      expect(result.status).toBe("ARCHIVED");
    });

    it("throws ALREADY_ARCHIVED when channel is already archived", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue({
        id: "ch_1",
        status: "ARCHIVED",
      } as never);

      await expect(archiveChannel("ch_1", "user_1")).rejects.toThrow("already archived");
    });

    it("throws CHANNEL_NOT_FOUND when channel does not exist", async () => {
      vi.mocked(prisma.channel.findUnique).mockResolvedValue(null);

      await expect(archiveChannel("ch_missing", "user_1")).rejects.toThrow("Channel not found");
    });
  });
});
