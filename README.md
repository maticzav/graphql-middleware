<p align="center"><img src="media/logo.png" width="150" /></p>

# graphql-middleware

[![CircleCI](https://circleci.com/gh/prismagraphql/graphql-middleware.svg?style=shield)](https://circleci.com/gh/prismagraphql/graphql-middleware)
[![npm version](https://badge.fury.io/js/graphql-middleware.svg)](https://badge.fury.io/js/graphql-middleware)

All in one solution to manage middleware in your GraphQL projects.

## Overview

GraphQL Middleware is a schema wrapper which allows you to manage additional functionality across multiple resolvers efficiently.

* **Easiest way to handle GraphQL middleware:** An intuitive, yet familiar API that you will pick up in a second.
* **Powerful:** Allows complete control over your resolvers (Before, After).
* **Compatible:** Works with any GraphQL Schema.

## Install

```sh
yarn add graphql-middleware
```

## Usage

```ts
import { applyMiddleware } from 'graphql-middleware'
import { makeExecutableSchema } from 'graphql-tools'
import { authMiddleware, metricsMiddleware } from './middleware'

// Minimal example middleware (before & after)
const beepMiddleware = {
  Query: {
    hello: async (resolve, parent, args, context, info) => {
      // You can you middleware to override arguments
      const argsWithDefault = { name: 'Bob', ...args }
      const result = await resolve(parent, argsWithDefault, context, info)
      // Or change the returned values of resolvers
      return result.replace(/Trump/g, 'beep')
    },
  },
}

const typeDefs = `
  type Query {
    hello(name: String): String
  }
`
const resolvers = {
  Query: {
    hello: (parent, { name }, context) => `Hello ${name ? name : 'world'}!`,
  },
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

const schemaWithMiddleware = applyMiddleware(
  schema,
  metricsMiddleware,
  authMiddleware,
  beepMiddleware,
)
```

### Usage with `graphql-yoga`

> `graphql-yoga` has built-in support for `graphql-middleware`!

```ts
import { GraphQLServer } from 'graphql-yoga'
import { authMiddleware, metricsMiddleware } from './middleware'

const typeDefs = `
  type Query {
    hello(name: String): String
  }
`
const resolvers = {
  Query: {
    hello: (parent, { name }, context) => `Hello ${name ? name : 'world'}!`,
  },
}

const server = new GraphQLServer({
  typeDefs,
  resolvers,
  middlewares: [authMiddleware, metricsMiddleware],
  documentMiddleware: [],
})
server.start(() => console.log('Server is running on localhost:4000'))
```

## Awesome Plugins [![Awesome](https://awesome.re/badge.svg)](https://awesome.re)

* [graphql-middleware-apollo-upload-server](http://github.com/homeroom-live/graphql-middleware-apollo-upload-server) - Uploading files is hard, that's why this package manages it for you!
* [graphql-shield](https://github.com/maticzav/graphql-shield) - Permissions as another layer of abstraction.
* [graphql-middleware-sentry](https://github.com/maticzav/graphql-middleware-sentry) - Report your server errors to Sentry.
* [graphql-middleware-forward-binding](https://github.com/maticzav/graphql-middleware-forward-binding) - GraphQL Binding forwardTo plugin for GraphQL Middleware.

## API

A middleware is a resolver function that wraps another resolver function.

```ts
type IMiddlewareFunction = (
  resolve: Function,
  parent: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<any>

interface IMiddlewareTypeMap {
  [key: string]: IMiddlewareFunction | IMiddlewareFieldMap
}

interface IMiddlewareFieldMap {
  [key: string]: IMiddlewareFunction
}

type IMiddleware = IMiddlewareFunction | IMiddlewareTypeMap

function middleware(
  generator: (schema: GraphQLSchema) => IMiddleware,
): MiddlewareGenerator

function applyMiddleware(
  schema: GraphQLSchema,
  ...middleware: (IMiddleware | MiddlewareGenerator)[]
): GraphQLSchema

/**
 * Applies middleware to a schema like `applyMiddleware` but only applies the
 * middleware to fields that have non-default resolvers. This method can be
 * useful if you want to report performance of only non-trivial methods.
 */
function applyMiddlewareToDeclaredResolvers(
  schema: GraphQLSchema,
  ...middleware: (IMiddleware | MiddlewareGenerator)[]
): GraphQLSchema
```

### Middleware Generator

In some cases, your middleware could depend on how your schema looks. In such situations, you can turn your middleware into a middleware generator. Middleware generators are denoted with function `middleware` and receive `schema` as the first argument.

```ts
const schemaDependentMiddleware = middleware(schema => {
  return generateMiddlewareFromSchema(schema)
})
```

## GraphQL Middleware Use Cases

* Logging
* Metrics
* Input sanitisation
* Performance measurement
* Authorization
* Caching
* Tracing

## FAQ

### Can I use GraphQL Middleware without GraphQL Yoga?

Yes. Nevertheless, we encourage you to use it in combination with Yoga. Combining the power of `middlewares` that GraphQL Middleware offers, with `documentMiddleware` which Yoga exposes, gives you unparalleled control over the execution of your queries.

### How does GraphQL Middleware compare to `directives`?

GraphQL Middleware and `directives` tackle the same problem in a completely different way. GraphQL Middleware allows you to implement all your middleware logic in your code, whereas directives encourage you to mix schema with your functionality.

### Should I modify the context using GraphQL Middleware?

GraphQL Middleware allows you to modify the context of your resolvers, but we encourage you to use GraphQL Yoga's `documentMiddleware` for this functionality instead.

## Help & Community [![Slack Status](https://slack.prisma.io/badge.svg)](https://slack.prisma.io)

Join our [Slack community](http://slack.prisma.io/) if you run into issues or have questions. We love talking to you!

<p align="center"><a href="https://oss.prisma.io"><img src="https://imgur.com/IMU2ERq.png" alt="Prisma" height="170px"></a></p>
