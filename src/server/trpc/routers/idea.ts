import { router, protectedProcedure } from "../trpc";
import { IdeaService } from "../../services/idea.service";
import {
  splitIdeaInputSchema,
  mergeIdeasInputSchema,
  bulkAssignBucketInputSchema,
  bulkArchiveInputSchema,
  bulkExportInputSchema,
} from "../../../types/idea";

export const ideaRouter = router({
  /**
   * Split an idea into multiple new ideas.
   * Original is archived by default.
   */
  split: protectedProcedure
    .input(splitIdeaInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new IdeaService(ctx.prisma);
      return service.splitIdea(input, ctx.session.user.id);
    }),

  /**
   * Merge multiple ideas into a single new idea.
   * All comments, votes, likes, and contributors are preserved.
   * Source ideas are archived.
   */
  merge: protectedProcedure
    .input(mergeIdeasInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new IdeaService(ctx.prisma);
      return service.mergeIdeas(input, ctx.session.user.id);
    }),

  /**
   * Bulk assign ideas to a bucket.
   */
  bulkAssignBucket: protectedProcedure
    .input(bulkAssignBucketInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new IdeaService(ctx.prisma);
      return service.bulkAssignBucket(input, ctx.session.user.id);
    }),

  /**
   * Bulk archive ideas.
   */
  bulkArchive: protectedProcedure
    .input(bulkArchiveInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new IdeaService(ctx.prisma);
      return service.bulkArchive(input, ctx.session.user.id);
    }),

  /**
   * Export selected ideas as JSON or CSV.
   */
  bulkExport: protectedProcedure
    .input(bulkExportInputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = new IdeaService(ctx.prisma);
      return service.bulkExport(input);
    }),
});
