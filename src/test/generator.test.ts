import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'
import { applyMiddleware, middleware } from '../'

test('Middleware with generator', async t => {
  t.plan(2)

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

  const testMiddleware = middleware(_schema => {
    t.deepEqual(schema, _schema)
    return async (resolve, parent, args, ctx, info) => {
      return 'pass'
    }
  })

  const schemaWithMiddleware = applyMiddleware(schema, testMiddleware)
  const query = `
    query {
      test
    }
  `

  const res = await graphql(schemaWithMiddleware, query)

  t.is(res.data.test, 'pass')
})
