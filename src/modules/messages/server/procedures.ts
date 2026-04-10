import { z } from "zod";
import { RateLimiterRes } from "rate-limiter-flexible";

import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { protectedProcedure, createTRPCRouter } from "@/trpc/init";
import { consumeCredits } from "@/lib/usage";

export const messagesRouter = createTRPCRouter({
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1, { message: "Project ID is required" }),
      }),
    )
    .query(async ({ input, ctx }) => {
      const messages = await prisma.message.findMany({
        where: {
          projectId: input.projectId,
          project: {
            userId: ctx.auth.userId,
          },
        },
        include: {
          fragment: true,
        },
        orderBy: {
          updatedAt: "asc",
        },
      });
      return messages;
    }),
  create: protectedProcedure
    .input(
      z.object({
        value: z
          .string()
          .min(1, { message: "Message is required" })
          .max(10000, { message: "Message is too long" }),
        projectId: z.string().min(1, { message: "Project ID is required" }),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if the project exists and belongs to the user
      const existingProject = await prisma.project.findUnique({
        where: {
          id: input.projectId,
          userId: ctx.auth.userId,
        },
      });

      if (!existingProject) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      }

      //try-catch because if the user doesn't have enough credits,
      // consumeCredits will throw an error and we don't want the message to be created in that case
      try {
        await consumeCredits();
      } catch (error) {
        if (error instanceof RateLimiterRes) {
          //if the error is an instance of RateLimiterRes, it means the user has exceeded their credits
          throw new TRPCError({
            code: "PAYMENT_REQUIRED",
            message:
              "You have exceeded your free credits. Either upgrade your plan or wait until your credits reset.",
          });
        } else {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "An unexpected error occurred.",
          });
        }
      }

      const createdMessage = await prisma.message.create({
        data: {
          projectId: existingProject.id,
          content: input.value,
          role: "USER",
          type: "RESULT",
        },
      });

      await inngest.send({
        name: "code-agent/run",
        data: {
          value: input.value,
          projectId: existingProject.id,
        },
      });

      return createdMessage;
    }),
});
