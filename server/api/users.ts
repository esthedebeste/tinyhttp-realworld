import { App } from "@tinyhttp/app";
import { createHash } from "crypto";
import { json } from "milliparsec";
import { matchBody, prisma, signjwt } from "../shared";

export const users = new App()
  .post(
    "/login",
    json(),
    matchBody({
      user: {
        email: "string",
        password: "string",
      },
    }),
    async (req, res) => {
      const { email, password } = req.body.user;
      const user = await prisma.user.findFirst({
        where: {
          email,
          password: createHash("sha256")
            .update(password)
            .digest()
            .toString("base64url"),
        },
        select: {
          email: true,
          username: true,
          bio: true,
          image: true,
          id: true,
        },
      });
      if (user == null) return res.status(403).send("invalid credentials");
      else {
        const { email, username, bio, image, id } = user;
        res.send({
          user: {
            email,
            username,
            bio,
            image,
            token: signjwt({ id }),
          },
        });
      }
    }
  )
  .post(
    "/",
    json(),
    matchBody({
      user: {
        email: "string",
        password: "string",
        username: "string",
      },
    }),
    async (req, res) => {
      const { email, password, username } = req.body.user;
      const { bio, image, id } = await prisma.user.create({
        data: {
          username,
          email,
          password: createHash("sha256")
            .update(password)
            .digest()
            .toString("base64url"),
        },
        select: { bio: true, image: true, id: true },
      });
      res.send({
        user: {
          email,
          username,
          bio,
          image,
          token: signjwt({ id }),
        },
      });
    }
  );
