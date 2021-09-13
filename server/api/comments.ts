import { App } from "@tinyhttp/app";
import { json } from "milliparsec";
import { jwtAuth, matchBody, prisma, Request as BaseRequest } from "../shared";

export type Request = BaseRequest & {
  slug: string;
};
type Comment = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  body: string;
  author: {
    username: string;
    bio: string;
    image: string;
    following: boolean;
  };
};
export const comments = new App()
  .post(
    "/",
    jwtAuth(false, true),
    json(),
    matchBody({
      comment: {
        body: "string",
      },
    }),
    async (req: Request, res) => {
      const {
        comment: { body: commentBody },
      } = req.body;
      const article = await prisma.article.findUnique({
        where: { slug: req.params.slug },
        select: { id: true },
      });
      if (article == null) return res.sendStatus(404);
      const comment = await prisma.comment.create({
        data: {
          body: commentBody,
          author: { connect: { id: req.user.id } },
          article: { connect: { id: article.id } },
        },
        include: {
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
            },
          },
          article: false,
        },
      });
      res.send({
        comment: {
          ...comment,
          author: {
            ...comment.author,
            following: false,
          },
        },
      });
    }
  )
  .get(
    "/",
    jwtAuth({ following: { select: { id: true } } }, false),
    async (req: Request, res) => {
      const comments: Comment[] = await Promise.all(
        (
          await prisma.comment.findMany({
            where: { article: { slug: req.params.slug } },
            include: {
              article: false,
              author: {
                select: {
                  username: true,
                  bio: true,
                  image: true,
                  id: true,
                },
              },
            },
          })
        ).map(
          async ({
            id,
            createdAt,
            updatedAt,
            body,
            author: { username, bio, image, id: authorId },
          }) => ({
            id,
            createdAt,
            updatedAt,
            body,
            author: {
              username,
              bio,
              image,
              following:
                req.user?.following != null &&
                !!req.user.following.find(a => a.id === authorId),
            },
          })
        )
      );
      res.send({ comments });
    }
  )
  .delete("/:id", jwtAuth(false, true), async (req: Request, res) => {
    let id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(422);
    const { authorId } = await prisma.comment.findUnique({
      where: { id },
      select: { authorId: true },
    });
    if (authorId !== req.user.id) return res.sendStatus(403);
    await prisma.comment.delete({ where: { id } });
    res.sendStatus(200);
  });
