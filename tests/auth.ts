import { FetchFunction, makeFetch } from "supertest-fetch";
import { test } from "uvu";
import { type } from "uvu/assert";
import { api } from "../dist/api.js";
test.before(context => {
  // nth second this year
  const now = Math.round(
    // now(seconds)   - Current year expressed in seconds since 1970
    Date.now() / 1000 -
      (new Date().getFullYear() - 1970) * 365.25 * 24 * 60 * 60
  );
  context.creds = {
    registration: {
      email: `tbhmens${now}@example.com`,
      username: `tbhmens${now}`,
      password: "realpassword",
    },
    login: {
      email: `tbhmens${now}@example.com`,
      password: "realpassword",
    },
    profile: {
      email: `tbhmens${now}@example.com`,
      username: `tbhmens${now}`,
      password: "realpassword",
      bio: "real tbhmens 🐢",
      image: "https://avatars.githubusercontent.com/u/57283066",
    },
  };

  context.app = api.listen();
  context.fetch = makeFetch(context.app);
});
test.after(context => {
  context.app.close();
  delete context.fetch;
});
test("Register", async context => {
  const fetch: FetchFunction = context.fetch;
  const creds = context.creds;
  const { user } = await fetch("/users", {
    method: "POST",
    body: JSON.stringify({
      user: creds.registration,
    }),
  })
    .expect(200)
    .json();
  type(user, "object", "User object missing from response");
  {
    const { email, username, bio, image, token } = user;
    type(email, "string", "Email missing from response");
    type(username, "string", "Username missing from response");
    type(bio, "string", "Bio missing from response");
    type(image, "string", "Image missing from response");
    type(token, "string", "Token missing from response");
  }
});

test("Login", async context => {
  const fetch: FetchFunction = context.fetch;
  const creds = context.creds;
  const { user } = await fetch("/users/login", {
    method: "POST",
    body: JSON.stringify({
      user: creds.login,
    }),
  })
    .expect(200)
    .json();
  type(user, "object", "User object missing from response");
  {
    const { email, username, bio, image, token } = user;
    type(email, "string", "Email missing from response");
    type(username, "string", "Username missing from response");
    type(bio, "string", "Bio missing from response");
    type(image, "string", "Image missing from response");
    type(token, "string", "Token missing from response");
    context.token = token;
  }
});
