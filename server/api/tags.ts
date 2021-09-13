import { App } from "@tinyhttp/app";
import { prisma } from "../shared";

export const tags = new App().get("/", async (_req, res) => {
  const tags = (
    await prisma.tag.findMany({
      select: { tag: true },
      orderBy: { lastUsed: "desc" },
      take: 20,
    })
  ).map(tagObj => tagObj.tag);
  res.send({ tags });
});
