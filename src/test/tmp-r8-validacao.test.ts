import { readFileSync } from "node:fs";
import { it } from "vitest";
import { runAllValidators } from "@/lib/validation/runValidators";
it("r8 validação", async () => {
  const files = [1, 2, 3, 4].map((i) => new File([readFileSync(`/tmp/r8v/s${i}.png`)], `slide-0${i}.png`, { type: "image/png" }));
  const caption = readFileSync("/tmp/r8v/caption.txt", "utf8");
  const issues = await runAllValidators({ selectedFormats: ["instagram_carousel", "linkedin_document"] as never, caption, mediaFiles: files, hashtags: [], scheduledDate: null, scheduleAsap: true, networkOptions: {} as never });
  console.log(JSON.stringify(issues.map((i) => [i.severity, i.id, i.title, i.description])));
});
