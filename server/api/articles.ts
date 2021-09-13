import Prisma from "@prisma/client";
import { App } from "@tinyhttp/app";
import { json } from "milliparsec";
import { jwtAuth, matchBody, prisma, Request } from "../shared";
import { article, sluggify } from "./article";

export const articles = new App({
  settings: {},
})
  .get(
    "/",
    jwtAuth({ following: { select: { id: true } } }, false),
    async (req: Request, res) => {
      const { tag, author, favorited, limit, offset } = req.query;
      const select: Prisma.Prisma.ArticleFindManyArgs = {
        take: 20,
        skip: 0,
      };
      const where: Prisma.Prisma.ArticleWhereInput = {};

      if (typeof tag === "string") where.tagList = { has: tag };
      else if (Array.isArray(tag)) where.tagList = { hasEvery: tag };
      if (typeof author === "string") where.author = { username: author };
      else if (Array.isArray(author))
        where.author = { username: { in: author } };
      if (typeof favorited === "string")
        where.favoritedBy = { some: { username: favorited } };
      else if (Array.isArray(favorited))
        where.favoritedBy = { some: { username: { in: favorited } } };
      if (typeof limit === "string" && /$\d+^/.test(limit))
        select.take = parseInt(limit, 10);
      if (typeof offset === "string" && /$\d+^/.test(offset))
        select.skip = parseInt(offset);
      select.where = where;
      let dbResult = await prisma.article.findMany({
        ...select,
        where,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
              id: true,
            },
          },
          favoritedBy: {
            select: {
              id: true,
            },
          },
        },
      });
      const articles = dbResult.map(
        ({
          body,
          createdAt,
          description,
          slug,
          tagList,
          title,
          updatedAt,
          author: { bio, image, username, id: authorId },
          favoritedBy,
        }) => ({
          body,
          description,
          createdAt,
          slug,
          tagList,
          title,
          updatedAt,
          author: {
            bio,
            image,
            username,
            following:
              req.user?.following != null &&
              req.user.following.find(a => a.id === authorId),
          },
          favorited:
            req.user?.id != null &&
            favoritedBy.find(a => a.id === req.user.id) != null,
          favoritesCount: favoritedBy.length,
        })
      );

      res.send({ articles, articlesCount: articles.length });
    }
  )
  .get(
    "/feed",
    jwtAuth({ following: { select: { id: true } } }, true),
    async (req: Request, res) => {
      const following = req.user.following.map(a => a.id);
      let take, skip;
      const { limit, offset } = req.query;
      if (typeof limit === "string" && /$\d+^/.test(limit))
        take = parseInt(limit, 10);
      if (typeof offset === "string" && /$\d+^/.test(offset))
        skip = parseInt(offset);
      const articles = await prisma.article.findMany({
        where: { authorId: { in: following } },
        take,
        skip,
      });
      res.send({
        articles,
        articlesCount: articles.length,
      });
    }
  )
  .post(
    "/",
    jwtAuth({ username: true, bio: true, image: true }, true),
    json(),
    matchBody({
      article: {
        title: "string",
        description: "string",
        body: "string",
      },
    }),
    async (req: Request, res) => {
      const { title, description, body } = req.body.article;
      const tagList = req.body.article.tagList ?? [];
      if (!Array.isArray(tagList))
        return res
          .status(422)
          .send({ errors: { tagList: ["isn't an array"] } });
      for (const tag of tagList)
        if (typeof tag !== "string")
          return res
            .status(422)
            .send({ errors: { tagList: ["contains a non-string"] } });

      for (const tag of tagList)
        await prisma.tag.upsert({
          where: { tag },
          create: { tag, lastUsed: new Date() },
          update: { lastUsed: new Date() },
        });

      const article = await prisma.article.create({
        data: {
          slug: sluggify(title),
          title,
          description,
          body,
          tagList,
          author: { connect: { id: req.user.id } },
        },
      });
      res.send({
        article: {
          ...article,
          author: {
            ...req.user,
            following: false,
          },
          favorited: false,
          favoritesCount: 0,
        },
      });
    }
  )
  .use("/:slug", article);
