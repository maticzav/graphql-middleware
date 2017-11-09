# graphql-stack

## Install

```sh
yarn add graphql-stack
```

## API

```ts
import * as express from 'express'
import * as bodyParser from 'body-parser'
import { graphqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import Stack from 'graphql-stack'

import { authMiddleware, metricsMiddleware } from './middlewares'

const stack = new Stack()

stack.use(metricsMiddleware())

// Middleware will be applied on every field of `type Query`
stack.use({
  Query: authMiddleware,
})

// Minimal example middleware (before & after)
stack.use({
  Query: {
    hello: ({ args, resolve }) => {
      // You can you middlewares to override arguments
      const argsWithDefault = { name: 'Bob', ...args }
      const result = await resolve({ args: argsWithDefault }) // other params (ctx, info...) are injected if not provided
      // Or change the returned values of resolvers
      return result.replace(/Trump/g, 'beep')
    },
  },
})


const typeDefs = `
  type Query {
    hello(name: String): String
  }
`
const resolvers = {
  Query: {
    hello: (root, args: { name }, context) => `Hello ${name ? name : 'world'}!`,
  },
}

const baseSchema = makeExecutableSchema({ typeDefs, resolvers })

stack.use(baseSchema)

const schema = stack.getSchema()

const app = express()

app.use('/graphql', bodyParser.json(), graphqlExpress({ schema }))
app.use('/playground', expressPlayground({ endpoint: '/graphql' }))

app.listen(3000, () => console.log('Server running. Open http://localhost:3000/playground to run queries.'))
```
