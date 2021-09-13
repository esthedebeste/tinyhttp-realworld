import { App } from "@tinyhttp/app";
import { json } from "milliparsec";
import { jwtAuth, matchBody, prisma } from "../shared";
import { comments, Request } from "./comments";
const randNums = count =>
  Math.floor(Math.random() * Math.pow(10, count)).toString();
export const sluggify = (title: string) =>
  title.toLowerCase().replace(/[^a-z\d]/g, "-") + "-" + randNums(5);

export const article = new App()
  .get("/", jwtAuth(false, false), async (req: Request, res, next) => {
    if (!req.params.slug) next();
    const {
      body,
      author: { bio, image, username, followers },
      description,
      createdAt,
      slug,
      tagList,
      title,
      updatedAt,
      favoritedBy,
    } = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      include: {
        author: {
          select: {
            username: true,
            bio: true,
            image: true,
            id: true,
            followers: {
              where: {
                id: req.user.id,
              },
            },
          },
        },
        favoritedBy: { select: { id: true } },
      },
    });
    const article: Article = {
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
        following: req.user != null && !!followers[0],
      },
      favorited:
        req.user != null && !!favoritedBy.find(a => a.id === req.user.id),
      favoritesCount: favoritedBy.length,
    };
    res.send({ article });
  })
  .put(
    "/",
    jwtAuth(false, true),
    json(),
    matchBody({
      article: {
        title: "string?",
        description: "string?",
        body: "string?",
      },
    }),
    async (req: Request, res) => {
      const {
        article: { title, description, body },
      } = req.body;
      const data = { title, description, body, slug: null };
      for (const key in data) if (data[key] == null) delete data[key];
      if (data.title) data.slug = sluggify(title);
      const { id: userId } = req.user;
      const toUpdate = await prisma.article.findFirst({
        where: {
          slug: req.params.slug,
        },
        select: {
          author: {
            select: {
              username: true,
              bio: true,
              image: true,
              id: true,
            },
          },
          favoritedBy: { select: { id: true } },
          body: true,
          title: true,
          createdAt: true,
          description: true,
          slug: true,
          tagList: true,
          updatedAt: true,
        },
      });
      if (toUpdate == null) return res.sendStatus(404);
      if (toUpdate.author.id !== userId) return res.sendStatus(403);
      await prisma.article.update({
        where: { slug: req.params.slug },
        data,
      });
      {
        const {
          author: { bio, image, username },
          body,
          createdAt,
          description,
          favoritedBy,
          tagList,
          slug,
          title,
          updatedAt,
        } = toUpdate;
        const article: Article = {
          body,
          createdAt,
          description,
          tagList,
          slug,
          title,
          updatedAt,
          ...data,
          author: {
            bio,
            image,
            username,
            following: false,
          },
          favorited:
            req.user != null &&
            favoritedBy.find(a => a.id === req.user.id) != null,
          favoritesCount: favoritedBy.length,
        };
        res.send({ article });
      }
    }
  )
  .delete("/", jwtAuth(false, true), async (req: Request, res) => {
    const { authorId } = await prisma.article.findUnique({
      where: { slug: req.params.slug },
      select: { authorId: true },
    });
    if (authorId !== req.user.id) return res.sendStatus(403);
    await prisma.article.delete({ where: { slug: req.params.slug } });
    res.sendStatus(200);
  })
  .use("/comments", comments);
//#region Favorites
const favorite = (addOrRemove: boolean) => {
  const method = addOrRemove ? "connect" : "disconnect";
  return async (req: Request, res) => {
    const updated = await prisma.article.update({
      where: { slug: req.params.slug },
      data: { favoritedBy: { [method]: { id: req.user.id } } },
      include: {
        author: { select: { bio: true, image: true, username: true } },
        favoritedBy: { select: { id: true } },
      },
    });

    const {
      author: { bio, image, username },
      body,
      createdAt,
      description,
      favoritedBy,
      tagList,
      slug,
      title,
      updatedAt,
    } = updated;
    const article: Article = {
      body,
      createdAt,
      description,
      tagList,
      slug,
      title,
      updatedAt,
      author: {
        bio,
        image,
        username,
        following: false,
      },
      favorited: addOrRemove,
      favoritesCount: favoritedBy.length,
    };
    res.send({ article });
  };
};
type Article = {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: Date;
  updatedAt: Date;
  favorited: boolean;
  favoritesCount: number;
  author: {
    username: string;
    bio: string;
    image: string;
    following: boolean;
  };
};

article
  .post("/favorite", jwtAuth(false, true), favorite(true))
  .delete("/favorite", jwtAuth(false, true), favorite(false));
//#endregion
