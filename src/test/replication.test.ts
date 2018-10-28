import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'
import { applyMiddleware, applyMiddlewareToDeclaredResolvers } from '../'

test(`applyMiddleware doesn't override the previous schema`, async t => {
  const typeDefs = `
    type Query {
      test: String!
    }
  `

  const resolvers = {
    Query: {
      test: () => 'fail',
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const testMiddleware = async (resolve, parent, args, ctx, info) => {
    return 'pass'
  }

  const schemaWithMiddleware = applyMiddleware(schema, testMiddleware)

  t.notDeepEqual(schema, schemaWithMiddleware)
})

test(`applyMiddlewareToDeclaredResolvers doesn't override the previous schema`, async t => {
  const typeDefs = `
    type Query {
      test: String!
    }
  `

  const resolvers = {
    Query: {
      test: () => 'fail',
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  const testMiddleware = async (resolve, parent, args, ctx, info) => {
    return 'pass'
  }

  const schemaWithMiddleware = applyMiddlewareToDeclaredResolvers(
    schema,
    testMiddleware,
  )

  t.notDeepEqual(schema, schemaWithMiddleware)
})
