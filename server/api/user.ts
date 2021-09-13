import { App } from "@tinyhttp/app";
import { json } from "milliparsec";
import { jwtAuth, matchBody, prisma, Request } from "../shared";

export const user = new App()
  .get(
    "/",
    jwtAuth({ email: true, username: true, bio: true, image: true }),
    async (req: Request, res) => {
      const { email, username, bio, image } = req.user;
      res.send({
        user: {
          email,
          // Reuse token
          token: req.headers.authorization.split(" ")[1],
          username,
          bio,
          image,
        },
      });
    }
  )
  .put(
    "/",
    json(),
    matchBody({
      user: {
        email: "string?",
        bio: "string?",
        image: "string?",
        password: "string?",
        username: "string?",
      },
    }),
    jwtAuth(false, true),
    async (req: Request, res) => {
      const { email, bio, image, password, username } = req.body.user;
      const data = { email, bio, image, password, username };
      for (const key in data) if (data[key] == null) delete data[key];
      {
        const { email, username, bio, image } = await prisma.user.update({
          data,
          where: {
            id: req.user.id,
          },
        });
        res.send({
          user: {
            email,
            // Reuse token
            token: req.headers.authorization.split(" ")[1],
            username,
            bio,
            image,
          },
        });
      }
    }
  );
