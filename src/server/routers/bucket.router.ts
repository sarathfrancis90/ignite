import { router, publicProcedure } from "@/server/trpc/trpc";
import {
  createBucketSchema,
  createSmartBucketSchema,
  updateBucketSchema,
  deleteBucketSchema,
  listBucketsSchema,
  getBucketItemsSchema,
  assignIdeaToBucketSchema,
  removeIdeaFromBucketSchema,
  bulkAssignBucketSchema,
} from "@/types/bucket";
import * as bucketService from "@/server/services/bucket.service";

export const bucketRouter = router({
  list: publicProcedure.input(listBucketsSchema).query(({ input }) => {
    return bucketService.listBuckets(input.campaignId);
  }),

  create: publicProcedure.input(createBucketSchema).mutation(({ input }) => {
    return bucketService.createBucket(input);
  }),

  createSmart: publicProcedure
    .input(createSmartBucketSchema)
    .mutation(({ input }) => {
      return bucketService.createSmartBucket(input);
    }),

  update: publicProcedure.input(updateBucketSchema).mutation(({ input }) => {
    return bucketService.updateBucket(input);
  }),

  delete: publicProcedure.input(deleteBucketSchema).mutation(({ input }) => {
    return bucketService.deleteBucket(input.bucketId);
  }),

  getItems: publicProcedure.input(getBucketItemsSchema).query(({ input }) => {
    return bucketService.getBucketItems(input.bucketId);
  }),

  assignIdea: publicProcedure
    .input(assignIdeaToBucketSchema)
    .mutation(({ input }) => {
      return bucketService.assignIdeaToBucket(input.ideaId, input.bucketId);
    }),

  removeIdea: publicProcedure
    .input(removeIdeaFromBucketSchema)
    .mutation(({ input }) => {
      return bucketService.removeIdeaFromBucket(input.ideaId, input.bucketId);
    }),

  bulkAssign: publicProcedure
    .input(bulkAssignBucketSchema)
    .mutation(({ input }) => {
      return bucketService.bulkAssignBucket(input.ideaIds, input.bucketId);
    }),
});
