import { App } from "@tinyhttp/app";
import { articles } from "./api/articles";
import { profiles } from "./api/profiles";
import { tags } from "./api/tags";
import { user } from "./api/user";
import { users } from "./api/users";

export const api = new App()
  .use("/users", users)
  .use("/user", user)
  .use("/profiles", profiles)
  .use("/articles", articles)
  .use("/tags", tags);
