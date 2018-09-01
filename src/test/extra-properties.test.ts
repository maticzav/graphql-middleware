import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'

import { applyMiddleware } from '../'

// Setup ---------------------------------------------------------------------

const typeDefs = `
  type Query {
    withObjectTypeConfig: String!
  }

  type Mutation {
    withObjectTypeConfig: String!
  }

  schema {
    query: Query,
    mutation: Mutation,
  }
`

const resolvers = {
  Query: {
    withObjectTypeConfig: {
      extraProperties: 'extra properties are passed down',
      resolve: () => 'withObjectTypeConfig',
    },
  },
  Mutation: {
    withObjectTypeConfig: {
      extraProperties: 'extra properties are passed down',
      resolve: () => 'withObjectTypeConfig',
    },
  },
}

const getSchema = () => makeExecutableSchema({ typeDefs, resolvers })

// Middleware ----------------------------------------------------------------

// Field Middleware

const fieldMiddleware = {
  Query: {
    withObjectTypeConfig: async (resolve, parent, args, context, info) => {
      return (
        info.schema.getQueryType().getFields()[info.fieldName]
          .extraProperties || 'fail'
      )
    },
  },
  Mutation: {
    withObjectTypeConfig: async (resolve, parent, args, context, info) => {
      return (
        info.schema.getMutationType().getFields()[info.fieldName]
          .extraProperties || 'fail'
      )
    },
  },
}

// Type Middleware

const typeMiddlewareBefore = {
  Query: async (resolve, parent, args, context, info) => {
    return (
      info.schema.getQueryType().getFields()[info.fieldName].extraProperties ||
      'fail'
    )
  },
  Mutation: async (resolve, parent, args, context, info) => {
    return (
      info.schema.getMutationType().getFields()[info.fieldName]
        .extraProperties || 'fail'
    )
  },
}

// Test ----------------------------------------------------------------------

// Field

test('Additional properties are passed down properly on field middleware - Query', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

  const query = `
    query {
      withObjectTypeConfig
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      withObjectTypeConfig: 'extra properties are passed down',
    },
  })
})

test('Additional properties are passed down properly on field middleware - Mutation', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

  const query = `
    mutation {
      withObjectTypeConfig
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      withObjectTypeConfig: 'extra properties are passed down',
    },
  })
})

// Type

test('Additional properties are passed down properly on type middleware - Query', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareBefore)

  const query = `
    query {
      withObjectTypeConfig
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      withObjectTypeConfig: 'extra properties are passed down',
    },
  })
})

test('Additional properties are passed down properly on type middleware - Mutation', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareBefore)

  const query = `
    mutation {
      withObjectTypeConfig
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      withObjectTypeConfig: 'extra properties are passed down',
    },
  })
})
