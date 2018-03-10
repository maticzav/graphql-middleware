# graphql-middleware

> NOTE: This repo is still WIP

## What's `graphql-middleware`?

* Middlewares can be wrapped (based on provided order)

### What it does

* Value transformation
* Override arguments
* Error handling (throw & catch errors)
* Globbing syntax

### What is doesn't

* Does **not** change the exposed GraphQL schema

## Install

```sh
yarn add graphql-middleware
```

## API

### Field middleware

A field middleware is a resolver function that wraps another resolver function

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

function applyFieldMiddleware(schema: GraphQLSchema, ...middlewares: IFieldMiddleware[]): GraphQLSchema
```

### Document middleware

```ts
interface GraphQLResponse {
  data: any
  errors?: any[]
  extensions?: any
}

type IDocumentMiddlewareFunction = (
  execute: Function,
  rootValue: any,
  context: any,
  info: GraphQLResolveInfo,
): Promise<GraphQLResponse>

function applyDocumentMiddleware(schema: GraphQLSchema, ...middlewares: IDocumentMiddlewareFunction[]): GraphQLSchema
```

## Examples

```ts
import { applyFieldMiddleware } from 'graphql-middleware'
import { makeExecutableSchema } from 'graphql-tools'
import { authMiddleware, metricsMiddleware } from './middlewares'

// Minimal example middleware (before & after)
const beepMiddleware = {
  Query: {
    hello: (resolve, parent, args, context, info) => {
      // You can you middlewares to override arguments
      const argsWithDefault = { name: 'Bob', ...args }
      const result = await resolve(parent, argsWithDefault, context, info)
      // Or change the returned values of resolvers
      return result.replace(/Trump/g, 'beep')
    },
  },
}

const responseSizeMiddleware = async (execute, rootValue, context, info) => {
  const response = await execute(rootValue, context, info)
  if (count(response) > 1000) {
    throw new Error('Response too big')
  }

  return response
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

const schemaWithFieldMiddlewares = applyFieldMiddleware(schema, metricsMiddleware, authMiddleware, beepMiddleware)
const schemaWithDocumentMiddlewares = applyDocumentMiddleware(schemaWithFieldMiddlewares, responseSizeMiddleware)
```

### Usage with `graphql-yoga`

`graphql-yoga` has built-in support for `graphql-middleware`

```ts
import { GraphQLServer } from 'graphql-yoga'
import { authMiddleware, metricsMiddleware, responseSizeMiddleware } from './middlewares'

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
  documentMiddlewares: [responseSizeMiddleware],
})
server.start(() => console.log('Server is running on localhost:4000'))
```

## Terminology

* Core resolver

## Middleware Use Cases

### Field level

* Logging
* Metrics
* Input sanitzation
* Performance measurement
* Authorization (`graphql-shield`)
* Caching
* Tracing

### Document level

* Complexity analysis

## Open questions

* [ ] Allow to transform schema?
* [ ] Anything to consider for subscriptions?

## Alternatives

- Directive resolvers
