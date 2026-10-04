import { createFileRoute } from "@/newsletter/shim/router";
import { zodValidator, fallback } from "@/newsletter/shim/zod-adapter";
import { z } from "zod";
import EditorRoot from "@/newsletter/features/newsletter/EditorRoot";

const TITLE = "DIGITAL SPRINT — Editor de Newsletter";
const DESCRIPTION =
  "Cockpit interno para curar, editar e disparar a newsletter semanal Digital Sprint.";

const searchSchema = z.object({
  edicao: fallback(z.string(), "").default(""),
  retomar: fallback(z.string(), "").default(""),
});


export const Route = createFileRoute("/_authenticated/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditorRoot,
});
