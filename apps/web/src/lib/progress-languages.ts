import { listEnrollments } from "@dailylingua/data";
import { cache } from "react";
import { getRequestClient } from "@/lib/session";

export const getProgressLanguages = cache(async () => {
  const enrollments = await listEnrollments(await getRequestClient());
  return { primary: enrollments[0]?.language, pilots: enrollments.map(({ language }) => language).filter((language) => language === "ru" || language === "it") };
});
