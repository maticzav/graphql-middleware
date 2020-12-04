import { makeExecutableSchema } from '@graphql-tools/schema'
import { validateMiddleware, MiddlewareError } from '../src/validation'
import { IMiddlewareFieldMap, IMiddlewareTypeMap } from '../src'

describe('validation:', () => {
  test('warns about the unknown type', async () => {
    /* Schema. */
    const typeDefs = `
      type Query {
        pass: String!
      }
    `

    const resolvers = {
      Query: {
        pass: () => 'pass',
      },
    }

    const schema = makeExecutableSchema({ resolvers, typeDefs })

    /* Middleware. */

    const middlewareWithUndefinedType: IMiddlewareFieldMap = {
      Test: async () => ({}),
    }

    /* Tests. */

    expect(() => {
      validateMiddleware(schema, middlewareWithUndefinedType)
    }).toThrow(
      new MiddlewareError(
        `Type Test exists in middleware but is missing in Schema.`,
      ),
    )
  })

  test('warns about the unknown field', async () => {
    /* Schema. */
    const typeDefs = `
      type Query {
        pass: String!
      }
    `

    const resolvers = {
      Query: {
        pass: () => 'pass',
      },
    }

    const schema = makeExecutableSchema({ resolvers, typeDefs })

    /* Middleware. */

    const middlewareWithUndefinedField: IMiddlewareTypeMap = {
      Query: {
        test: async () => ({}),
      },
    }

    /* Tests. */

    expect(() => {
      validateMiddleware(schema, middlewareWithUndefinedField)
    }).toThrow(
      new MiddlewareError(
        `Field Query.test exists in middleware but is missing in Schema.`,
      ),
    )
  })

  test('warns that middleware leafs are not functions', async () => {
    /* Schema. */
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

    const schema = makeExecutableSchema({ resolvers, typeDefs })

    /* Middleware. */

    const middlewareWithObjectField: any = {
      Query: {
        test: false,
      },
    }

    /* Tests. */

    expect(() => {
      validateMiddleware(schema, middlewareWithObjectField as any)
    }).toThrow(
      new MiddlewareError(
        `Expected Query.test to be a function but found boolean`,
      ),
    )
  })
})
