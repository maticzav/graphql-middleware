# graphql-delegate
A decoupled schema delegate for usage in graphql.js resolvers.

## Install

```sh
yarn add graphql-delegate
```

## API

```ts
import * as express from 'express'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'
import expressPlayground from 'graphql-playground-middleware-express'
import { graphqlExpress } from 'apollo-server-express'
import * as morgan from 'morgan'
import { HttpLink } from 'apollo-link-http'
import fetch from 'node-fetch'
import { Stack } from 'graphql-stack'
import { Delegate } from 'graphql-delegate'

async function run() {
  const app = express()
  const link = new HttpLink({
    uri: process.env.GRAPHQL_ENDPOINT,
    fetch,
    headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` },
  })
  const delegate = new Delegate(link)
  // initializes the remote schema
  await delegate.init()

  const typeDefs = `
    type Query {
      viewer: Viewer
    }

    type Viewer {
      me: User
    }
  `
  // gets the `User` type from the Graphcool schema
  const allTypes = delegate.extractMissingTypes(typeDefs)

  const stack = new Stack({ typeDefs: allTypes })

  // middlewares can be added here
  // app.use(caching())
  // app.use(metrics())
  stack.use({
    Query: {
      viewer: ({}),
    },
    Viewer: {
      me: async function me({context, info}) {
        const token = context.req.get('Authorization').replace('Bearer ', '')
        const { userId } = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string }
      
        // available through setting on context in graphqlExpress
        return context.delegate('query', 'User', { id: userId }, context, info)
      }
    },
  })

  const schema = stack.getSchema()

  app.use(
    '/graphql',
    cors(),
    bodyParser.json(),
    graphqlExpress(req => ({ schema, context: { req, delegate: delegate.getDelegator() } })),
  )
  app.use(morgan('tiny'))
  app.use('/playground', expressPlayground({ endpoint: '/graphql' }))
  app.listen(3000, () =>
    console.log(
      'Server running. Open http://localhost:3000/playground to run queries.',
    ),
  )
}

run().catch(console.error.bind(console))
```
