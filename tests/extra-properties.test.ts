import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'

import { applyMiddleware, IMiddlewareTypeMap } from '../src'

describe('extra resolver properties in middleware:', () => {
  /* Schema. */
  const typeDefs = `
    type Query {
      withObjectTypeConfig: String!
    }

    schema {
      query: Query,
    }
  `

  const resolvers = {
    Query: {
      withObjectTypeConfig: {
        extraProperties: 'extra properties are passed down',
        resolve: () => 'withObjectTypeConfig',
      },
    },
  }

  const getSchema = () => makeExecutableSchema({ typeDefs, resolvers })

  // Type Middleware

  test('field specific middleware passes down correct extra properties', async () => {
    /* Schema. */
    const schema = getSchema()

    /* Middleware. */

    const fieldMiddleware: IMiddlewareTypeMap = {
      Query: {
        withObjectTypeConfig: async (resolve, parent, args, context, info) => {
          const field = info.schema.getQueryType().getFields()[info.fieldName]
          return (field as any).extraProperties || 'fail'
        },
      },
    }
    const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

    const query = `
      query {
        withObjectTypeConfig
      }
    `

    const res = await graphql(schemaWithMiddleware, query)

    /* Tests. */

    expect(res).toEqual({
      data: {
        withObjectTypeConfig: 'extra properties are passed down',
      },
    })
  })

  test('Additional properties are passed down properly on type middleware - Query', async () => {
    /* Schema. */

    const schema = getSchema()

    /* Middleware. */

    const typeMiddleware: IMiddlewareTypeMap = {
      Query: async (resolve, parent, args, context, info) => {
        const field = info.schema.getQueryType().getFields()[info.fieldName]
        return (field as any).extraProperties || 'fail'
      },
    }
    const schemaWithMiddleware = applyMiddleware(schema, typeMiddleware)

    const query = `
      query {
        withObjectTypeConfig
      }
    `
    const res = await graphql(schemaWithMiddleware, query)

    /* Tests. */

    expect(res).toEqual({
      data: {
        withObjectTypeConfig: 'extra properties are passed down',
      },
    })
  })
})
