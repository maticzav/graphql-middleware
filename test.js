import test from 'ava'
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { applyFieldMiddleware, applyDocumentMiddleware } from './dist'

// Setup ---------------------------------------------------------------------

const typeDefs = `
  type Query {
    hello(name: String): String
    nothing: String
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
`

const resolvers = {
  Query: {
    hello: (parent, { name }, context) => `Hello ${name ? name : 'world'}!`,
    nothing: () => 'nothing',
  },
  Subscription: {
    socool: {
      subscribe: async (parent, { cool }, ctx, info) => {
        return `You are ${cool} cool!`
      },
    },
  },
}

const getSchema = () => makeExecutableSchema({ typeDefs, resolvers })

// Middleware ----------------------------------------------------------------

// Field

const fieldMiddleware = {
  Query: {
    hello: async (resolve, parent, args, context, info) => {
      const argsWithDefault = { name: 'Bob', ...args }
      const result = await resolve(parent, argsWithDefault, context, info)
      return result.replace(/Trump/g, 'beep')
    },
  },
}

const typeMiddleware = {
  Query: async (resolve, parent, args, context, info) => {
    const argsWithDefault = { name: 'Bob', ...args }
    const result = await resolve(parent, argsWithDefault, context, info)
    return `Well ${result}`
  },
}

const schemaMiddleware = async (resolve, parent, args, context, info) => {
  const argsWithDefault = { name: 'Bob and Trump' }
  const result = await resolve(parent, argsWithDefault, context, info)
  return result
}

const partialFieldMiddleware = async resolve => resolve()

const subscriptionMiddleware = {
  Subscription: {
    socool: async (resolve, parent, { cool }, ctx, info) => {
      if (cool < 9000) {
        cool = 9000
      }
      const result = await resolve(parent, { cool }, ctx, info)
      return result
    },
  },
}

// Test ----------------------------------------------------------------------

// Field

test('Field middleware - Mixed middlewares', async t => {
  const schema = getSchema()
  const schemaWithFieldMiddlewares = applyFieldMiddleware(
    schema,
    schemaMiddleware,
    fieldMiddleware,
    typeMiddleware,
  )

  const query = `
    {
      hello(name: "Trump")
      nothing
    }
  `
  const res = await graphql(schemaWithFieldMiddlewares, query)

  t.deepEqual(res, {
    data: {
      hello: 'Well Hello Bob and beep!',
      nothing: 'Well nothing',
    },
  })
})

test('Field middleware - Function Middleware', async t => {
  const schema = getSchema()
  const schemaWithFieldMiddlewares = applyFieldMiddleware(
    schema,
    schemaMiddleware,
  )

  const query = `
    {
      hello(name: "Trump")
      nothing
    }
  `
  const res = await graphql(schemaWithFieldMiddlewares, query)

  t.deepEqual(res, {
    data: {
      hello: 'Hello Bob and Trump!',
      nothing: 'nothing',
    },
  })
})

test('Field middleware - Subscription middleware', async t => {
  const schema = getSchema()
  const schemaWithFieldMiddlewares = applyFieldMiddleware(
    schema,
    subscriptionMiddleware,
  )

  const query = `
    subscription {
      socool(cool: 2)
    }
  `
  const res = await graphql(schemaWithFieldMiddlewares, query)

  t.deepEqual(res, {
    data: {
      socool: 'You are 9000 cool!',
    },
  })
})

test('Field middleware - Partial resolver arguments', async t => {
  const schema = getSchema()
  const schemaWithFieldMiddlewares = applyFieldMiddleware(
    schema,
    partialFieldMiddleware,
  )

  const query = `
    {
      hello(name: "Emma")
      nothing
    }
  `
  const res = await graphql(schemaWithFieldMiddlewares, query)

  t.deepEqual(res, {
    data: {
      hello: 'Hello Emma!',
      nothing: 'nothing',
    },
  })
})
