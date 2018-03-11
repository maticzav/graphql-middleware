import test from 'ava'
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { applyFieldMiddleware } from './dist'

// Setup

const typeDefs = `
  type Query {
    hello(name: String): String
  }

  type User {
    name: String!
  }

  union Currency {
    EUR
    USD
  }
`

const resolvers = {
  Query: {
    hello: (parent, { name }, context) => `Hello ${name ? name : 'world'}!`,
  },
}

// Middleware

const beepMiddleware = {
  Query: {
    hello: async (resolve, parent, args, context, info) => {
      const argsWithDefault = { name: 'Bob', ...args }
      const result = await resolve(parent, argsWithDefault, context, info)
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

const getSchema = () => makeExecutableSchema({ typeDefs, resolvers })

// Test

test('Field middleware', async t => {
   const schema = getSchema()
   const schemaWithFieldMiddlewares = applyFieldMiddleware(schema, beepMiddleware)

   const query = `
      {
         hello(name: "Trump")
      }
   `
   const res = await graphql(schemaWithFieldMiddlewares, query)

   t.deepEqual(res, {
      data: {
         hello: 'Hello beep!'
      }
   })
})