import { makeExecutableSchema } from '@graphql-tools/schema'
import { graphql } from 'graphql'
import {
  applyMiddleware,
  applyMiddlewareToDeclaredResolvers,
  IMiddlewareFunction,
} from '../src'
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

    const firstMiddleware: IMiddlewareFunction = async (resolve) => {
      sequence.push('first')
      return resolve()
    }

    const secondMiddleware: IMiddlewareFunction = async (resolve) => {
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
    await graphql({
      schema: schemaWithMiddleware,
      source: query,
      rootValue: null,
      contextValue: {},
    })

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

    const res = await graphql({ schema: schemaWithMiddleware, source: query })

    /* Tests. */

    expect(res).toEqual({
      data: {
        test: randomTestString,
      },
    })
  })

  test('applies multiple middlwares only to declared resolvers', async () => {
    /* Schema. */

    const typeDefs = `
      type Object {
        id: String,
        name: String
      }
      type Query {
        test(arg: String): Object!
      }
    `

    const resolvers: IResolvers = {
      Query: {
        test: (parent, { arg }) => ({ id: arg, name: 'name' }),
      },
    }

    const schema = makeExecutableSchema({ resolvers, typeDefs })

    /* Middleware. */

    const randomTestString = Math.random().toString()

    const firstMiddleware: IMiddlewareFunction = jest.fn((resolve, parent) => {
      return resolve(parent, { arg: randomTestString })
    })
    const secondMiddleware: IMiddlewareFunction = jest.fn((resolve, parent) => {
      return resolve(parent, { arg: randomTestString })
    })

    const schemaWithMiddleware = applyMiddlewareToDeclaredResolvers(
      schema,
      firstMiddleware,
      secondMiddleware,
    )

    const query = `
      query {
        test(arg: "id") {
          id
          name
        }
      }
    `

    await graphql({ schema: schemaWithMiddleware, source: query })

    /* Tests. */
    expect(firstMiddleware).toHaveBeenCalledTimes(1)
    expect(secondMiddleware).toHaveBeenCalledTimes(1)
  })
})
