<p align="center"><img src="media/logo.png" width="800" /></p>

# graphql-middleware

[![CircleCI](https://circleci.com/gh/maticzav/graphql-middleware.svg?style=shield)](https://circleci.com/gh/maticzav/graphql-middleware)
[![npm version](https://badge.fury.io/js/graphql-middleware.svg)](https://badge.fury.io/js/graphql-middleware)
![npm](https://img.shields.io/npm/dt/graphql-middleware.svg)

All in one solution to manage middleware in your GraphQL projects.

## Overview

GraphQL Middleware is a schema wrapper which allows you to easily manage additional functionality accross multiple resolvers.

* __Easiest way to handle GraphQL middleware:__ Intuitive, yet familiar API will get under your skin in a second.
* __Powerful:__ Allows complete control over your resolvers (Before, After).
* __Compatible:__ Works with any GraphQL Schema.

## Install

```sh
yarn add graphql-middleware
```

## Usage

```ts
import { applyFieldMiddleware } from 'graphql-middleware'
import { makeExecutableSchema } from 'graphql-tools'
import { authMiddleware, metricsMiddleware } from './middlewares'

// Minimal example middleware (before & after)
const beepMiddleware = {
  Query: {
    hello: async (resolve, parent, args, context, info) => {
      // You can you middlewares to override arguments
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

const schemaWithFieldMiddlewares = applyFieldMiddleware(
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
import { authMiddleware, metricsMiddleware } from './middlewares'

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
  fieldMiddlewares: [authMiddleware, metricsMiddleware],
  documentMiddlewares: [],
})
server.start(() => console.log('Server is running on localhost:4000'))
```

### Examples

## API

A middleware is a resolver function that wraps another resolver function.

```ts
type IFieldMiddlewareFunction = (
  resolve: Function,
  parent: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<any>

interface IFieldMiddlewareTypeMap {
  [key: string]: IFieldMiddlewareFunction | IFieldMiddlewareFieldMap
}

interface IFieldMiddlewareFieldMap {
  [key: string]: IFieldMiddlewareFunction
}

type IFieldMiddleware = IFieldMiddlewareFunction | IFieldMiddlewareTypeMap

function applyFieldMiddleware(
  schema: GraphQLSchema,
  ...middlewares: IFieldMiddleware[]
): GraphQLSchema
```

## GraphQL Middleware Use Cases

* Logging
* Metrics
* Input sanitzation
* Performance measurement
* Authorization
* Caching
* Tracing

## FAQ

### Can I use GraphQL-Middleware without GraphQL-Yoga?

Yes. Nevertheless we encourage you to use it in combination with Yoga, because of the many features Yoga offers combined with GraphQL-Middleware.

### How does GraphQL-Middleware compare to `directives`?

GraphQL-Middleware and `directives` tackle the same problem in completely different way. GraphQL-Middleware allows you to implement all your middleware logic in your code, whereas directives encourage you to mix schema with your functionality.

### Should I modify the context using GraphQL-Middleware?

GraphQL-Middleware allows you to modify the context of your resolvers, but we encourage you to use GraphQL-Yoga's document-middleware for this functionality instead.

## Help & Community [![Slack Status](https://slack.graph.cool/badge.svg)](https://slack.graph.cool)

Join our [Slack community](http://slack.graph.cool/) if you run into issues or have questions. We love talking to you!

[![](http://i.imgur.com/5RHR6Ku.png)](https://www.graph.cool/)
