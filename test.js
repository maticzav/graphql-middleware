import test from "ava";
import { graphql } from "graphql";
import { makeExecutableSchema } from "graphql-tools";
import { applyFieldMiddleware } from "./dist";

// Setup

const typeDefs = `
  type Query {
    hello(name: String): String
  }

  type User {
    name: String!
  }

  type Subscription {
    socool(cool: Int!): String!
  }

  schema {
    query: Query,
    subscription: Subscription
  }
`;

const resolvers = {
  Query: {
    hello: (parent, { name }, context) => `Hello ${name ? name : "world"}!`
  },
  Subscription: {
    socool: {
      subscribe: async (parent, { cool }, ctx, info) => {
        return `You are ${cool} cool!`;
      }
    }
  }
};

const getSchema = () => makeExecutableSchema({ typeDefs, resolvers });

// Middleware

// Field

const beepMiddleware = {
  Query: {
    hello: async (resolve, parent, args, context, info) => {
      const argsWithDefault = { name: "Bob", ...args };
      const result = await resolve(parent, argsWithDefault, context, info);
      return result.replace(/Trump/g, "beep");
    }
  }
};

const veryNiceGreeting = {
  Query: async (resolve, parent, args, context, info) => {
    const argsWithDefault = { name: "Bob", ...args };
    const result = await resolve(parent, argsWithDefault, context, info);
    return `Well ${result}`;
  }
};

const alwaysBobAndTrump = async (resolve, parent, args, context, info) => {
  const argsWithDefault = { name: "Bob and Trump" };
  const result = await resolve(parent, argsWithDefault, context, info);
  return result;
};

const alwaysOver9000 = {
  Subscription: {
    socool: async (resolve, parent, { cool }, ctx, info) => {
      if (cool < 9000) {
        cool = 9000;
      }
      const result = await resolve(parent, { cool }, ctx, info);
      return result
    }
  }
};

// Document

const responseSizeMiddleware = async (execute, rootValue, context, info) => {
  const response = await execute(rootValue, context, info);
  if (count(response) > 1000) {
    throw new Error("Response too big");
  }

  return response;
};

// Test

test("Field middleware", async t => {
  const schema = getSchema();
  const schemaWithFieldMiddlewares = applyFieldMiddleware(
    schema,
    alwaysBobAndTrump,
    beepMiddleware,
    veryNiceGreeting
  );

  const query = `
    {
      hello(name: "Trump")
    }
  `;
  const res = await graphql(schemaWithFieldMiddlewares, query);

  t.deepEqual(res, {
    data: {
      hello: "Well Hello Bob and beep!"
    }
  });
});

test("Field subscription middleware", async t => {
  const schema = getSchema();
  const schemaWithFieldMiddlewares = applyFieldMiddleware(
    schema,
    alwaysOver9000
  );

  const query = `
    subscription {
      socool(cool: 2)
    }
  `;
  const res = await graphql(schemaWithFieldMiddlewares, query);

  t.deepEqual(res, {
    data: {
      socool: "You are 9000 cool!"
    }
  });
});
