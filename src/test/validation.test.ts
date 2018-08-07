import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { validateMiddleware, MiddlewareError } from '../validation'

test('Middleware Error - Unknown type found in Middleware.', async t => {
  // Schema
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

  // Middleware

  const middlewareWithUndefinedType = {
    Test: () => ({}),
  }

  const res = t.throws(() => {
    validateMiddleware(schema, middlewareWithUndefinedType as any)
  })

  t.deepEqual(
    res,
    new MiddlewareError(
      `Type Test exists in middleware but is missing in Schema.`,
    ),
  )
})

test('Middleware Error - Unknown field found in middleware.', async t => {
  // Schema

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

  // Middleware

  const middlewareWithUndefinedField = {
    Query: {
      test: () => ({}),
    },
  }

  const res = t.throws(() => {
    validateMiddleware(schema, middlewareWithUndefinedField as any)
  })

  t.deepEqual(
    res,
    new MiddlewareError(
      `Field Query.test exists in middleware but is missing in Schema.`,
    ),
  )
})

test('Middleware Error - Middleware leafs are not functions.', async t => {
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

  const schema = makeExecutableSchema({ resolvers, typeDefs })

  // Middleware

  const middlewareWithObjectField = {
    Query: {
      test: false,
    },
  }

  const res = t.throws(() => {
    validateMiddleware(schema, middlewareWithObjectField as any)
  })

  t.deepEqual(
    res,
    new MiddlewareError(
      `Expected Query.test to be a function but found boolean`,
    ),
  )
})
