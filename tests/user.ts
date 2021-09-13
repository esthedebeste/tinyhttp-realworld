import { FetchFunction } from "supertest-fetch";
import { test } from "uvu";
import { equal, type } from "uvu/assert";

test("Current User", async context => {
  const fetch: FetchFunction = context.fetch;
  const token: string = context.token;
  const creds = context.creds;
  const { user } = await fetch("/user", {
    method: "GET",
    headers: {
      Authorization: `Token ${token}`,
    },
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

test("Update User", async context => {
  const fetch: FetchFunction = context.fetch;
  const token: string = context.token;
  const creds = context.creds;
  const { user } = await fetch("/user", {
    method: "PUT",
    headers: {
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      user: { bio: creds.profile.bio, image: creds.profile.image },
    }),
  })
    .expect(200)
    .json();
  type(user, "object", "User object missing from response");
  {
    const { email, username, bio, image, token } = user;
    type(email, "string", "Email missing from response");
    type(username, "string", "Username missing from response");
    equal(bio, creds.profile.bio, "Bio missing from response");
    equal(image, creds.profile.image, "Image missing from response");
    type(token, "string", "Token missing from response");
    globalThis.token = token;
  }
});

test.run();
