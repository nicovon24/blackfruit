"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/modules/auth/infrastructure/require-permission";
import { ignoreSampleReview, prepareHistoricalSampleReviews } from "@/modules/samples/infrastructure/prisma-sample-reviews";

export async function prepareHistoricalSamplesAction() {
  await requirePermission("imports:write");
  await requirePermission("samples:write");
  await prepareHistoricalSampleReviews();
  revalidatePath("/muestras/revision");
}

export async function ignoreSampleReviewAction(id: string) {
  const actor = await requirePermission("imports:write");
  await requirePermission("samples:write");
  await ignoreSampleReview(id, actor.id);
  revalidatePath("/muestras/revision");
}
