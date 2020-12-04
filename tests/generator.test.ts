import { makeExecutableSchema } from '@graphql-tools/schema'
import { GraphQLSchema } from 'graphql'
import { applyMiddleware, middleware, IMiddlewareGenerator } from '../src'

test('middleware generator integration', async () => {
  /* Schema. */
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

  let generatorSchema: GraphQLSchema

  /* Middleware. */

  const testMiddleware: IMiddlewareGenerator<any, any, any> = middleware(
    (_schema) => {
      generatorSchema = _schema
      return async () => 'pass'
    },
  )

  applyMiddleware(schema, testMiddleware)

  /* Tests. */

  expect(generatorSchema).toEqual(schema)
})
