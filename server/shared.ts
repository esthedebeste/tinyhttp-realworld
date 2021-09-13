import Prisma from "@prisma/client";
import { Request as TinyHTTPRequest } from "@tinyhttp/app";
import { jwt } from "@tinyhttp/jwt";
import jsonwebtoken from "jsonwebtoken";
const { sign } = jsonwebtoken;
const prisma = new Prisma.PrismaClient();
//#region JWT
const jwtsecret = process.env.JWTSECRET;
const signjwt = (payload: string | object | Buffer) =>
  sign(payload, jwtsecret, { algorithm: "HS256" });
const jwt_ = jwt({ secret: jwtsecret, algorithm: "HS256" });
/**
 * @param selection `false` for no database fetching (Only puts { id: int } into req.user), otherwise a Prisma selection pattern.
 * @param required Whether to send a 401 if no valid JWT was sent
 */
function jwtAuth(
  selection: false | Prisma.Prisma.UserSelect,
  required: boolean = true
) {
  if (selection === false)
    return (req, res, next) => {
      jwt_(req, res, async () =>
        req?.user?.id == null && required
          ? res.status(401).send("not authenticated")
          : next()
      );
    };
  return (req, res, next) => {
    jwt_(req, res, async () => {
      if (req?.user?.id != null)
        req.user = {
          ...req.user,
          ...(await prisma.user.findUnique({
            where: { id: req.user.id },
            select: selection,
          })),
        };
      else if (required) return res.status(401).send("not authenticated");
      next();
    });
  };
}
const parseType = (type: Target | Type | OptionalType) => {
  if (typeof type === "string")
    return type.endsWith("?") ? [type.slice(0, -1), false] : [type, true];
  else if (typeof type === "object") {
    // @ts-expect-error
    for (const key in type) type[key] = parseType(type[key]);
    return type;
  }
};
//#endregion
//#region Body Matching
const verify = (body, target, addError) => {
  for (const key in target) {
    if (typeof target[key] === "object") {
      if (Array.isArray(target[key])) {
        if (body[key] === undefined) {
          if (target[key][1]) addError(key, "is required but not given");
        } else if (typeof body[key] !== target[key][0]) {
          addError(key, `isn't a ${target[key][0]}`);
        }
      } else if (typeof body[key] === "object") {
        verify(body[key], target[key], addError);
      } else addError(key, "isn't an object");
    }
  }
};
type Type = "string" | "boolean" | "number";
type OptionalType = "string?" | "boolean?" | "number?";
type Target = {
  [x: string]: Target | Type | OptionalType;
};
const matchBody = (target: Target) => {
  const parsedtarget = parseType(target);
  return (req, res, next) => {
    let errored = false;
    let errors = {};
    const addError = (subject, problem) => {
      if (Array.isArray(errors[subject])) errors[subject].push(problem);
      else errors[subject] = [problem];
      errored = true;
    };
    const { body } = req;
    verify(body, parsedtarget, addError);
    if (errored) res.status(422).send({ errors });
    else next();
  };
};
//#endregion

type User = Prisma.User & {
  comments: Prisma.Comment[];
  articles: Prisma.Article[];
  followers: User[];
  following: User[];
  favorites: Prisma.Article[];
};
export type Request = TinyHTTPRequest & {
  user: User;
};
export const isFollowing = async (follower: number, following: number) =>
  !!(await prisma.user.count({
    where: {
      id: follower,
      following: {
        some: {
          id: following,
        },
      },
    },
  }));
export { prisma };
export { jwtAuth, signjwt };
export { matchBody };
