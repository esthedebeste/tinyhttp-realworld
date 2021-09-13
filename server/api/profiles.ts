import { App } from "@tinyhttp/app";
import { isFollowing, jwtAuth, prisma, Request } from "../shared";
// {
//   profile: {
//     username: string,
//     bio: string,
//     image: string,
//     following: boolean,
//   }
// }
const follow = (addOrRemove: boolean) => {
  const method = addOrRemove ? "connect" : "disconnect";
  return async (req: Request, res) => {
    const profile = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        username: true,
        bio: true,
        image: true,
        id: true,
      },
    });
    if (profile == null) return res.status(404).send("not found");
    const { username, bio, image, id } = profile;

    await prisma.user.update({
      where: {
        username: req.params.username,
      },
      data: {
        followers: {
          [method]: {
            id: req.user.id,
          },
        },
      },
    });

    res.send({
      profile: {
        username,
        bio,
        image,
        following: addOrRemove,
      },
    });
  };
};
export const profiles = new App()
  .get("/:username", jwtAuth(false, false), async (req: Request, res) => {
    const profile = await prisma.user.findUnique({
      where: { username: req.params.username },
      select: {
        username: true,
        bio: true,
        image: true,
        id: true,
      },
    });
    if (profile == null) return res.status(404).send("not found");

    const { username, bio, image, id } = profile;
    let following = false;
    if (req.user != null) following = await isFollowing(req.user.id, id);
    res.send({
      profile: {
        username,
        bio,
        image,
        following,
      },
    });
  })
  .post("/:username/follow", jwtAuth(false, true), follow(true))
  .delete("/:username/follow", jwtAuth(false, true), follow(false));
