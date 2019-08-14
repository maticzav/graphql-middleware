import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'
import { applyMiddleware, IMiddlewareFunction } from '../src'
import { IResolvers } from '../src/types'

describe('execution:', () => {
  test('follows correct order', async () => {
    // Schema

    const typeDefs = `
      type Query {
        test: String!
      }
    `

    const resolvers = {
      Query: {
        test: () => 'pass',
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    /* Middleware tests. */

    let sequence: string[] = []

    const firstMiddleware: IMiddlewareFunction = async resolve => {
      sequence.push('first')
      return resolve()
    }

    const secondMiddleware: IMiddlewareFunction = async resolve => {
      sequence.push('second')
      return resolve()
    }

    const schemaWithMiddleware = applyMiddleware(
      schema,
      firstMiddleware,
      secondMiddleware,
    )

    const query = `
      query {
        test
      }
    `
    await graphql(schemaWithMiddleware, query, null, {})

    /* Tests */

    expect(JSON.stringify(sequence)).toBe(JSON.stringify(['first', 'second']))
  })

  test('forwards arguments correctly', async () => {
    /* Schema. */

    const typeDefs = `
      type Query {
        test(arg: String): String!
      }
    `

    const resolvers: IResolvers = {
      Query: {
        test: (parent, { arg }) => arg,
      },
    }

    const schema = makeExecutableSchema({ resolvers, typeDefs })

    /* Middleware. */

    const randomTestString = Math.random().toString()

    const middleware: IMiddlewareFunction = (resolve, parent) => {
      return resolve(parent, { arg: randomTestString })
    }

    const schemaWithMiddleware = applyMiddleware(schema, middleware)

    const query = `
      query {
        test(arg: "none")
      }
    `

    const res = await graphql(schemaWithMiddleware, query)

    /* Tests. */

    expect(res).toEqual({
      data: {
        test: randomTestString,
      },
    })
  })
})
