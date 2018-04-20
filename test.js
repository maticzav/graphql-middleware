import test from 'ava'
import { graphql } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { applyMiddleware } from './dist'

// Setup ---------------------------------------------------------------------

const typeDefs = `
  type Query {
    before(arg: String!): String!
    beforeNothing(arg: String!): String!
    after: String!
    afterNothing: String!
    null: String
    nested: Nothing!
  }

  type Mutation {
    before(arg: String!): String!
    beforeNothing(arg: String!): String!
    after: String!
    afterNothing: String!
    null: String
    nested: Nothing!
  }

  type Nothing {
    nothing: String!
  }

  schema {
    query: Query,
    mutation: Mutation
  }
`

const resolvers = {
  Query: {
    before: (parent, { arg }, ctx, info) => arg,
    beforeNothing: (parent, { arg }, ctx, info) => arg,
    after: () => 'after',
    afterNothing: () => 'after',
    null: () => null,
    nested: () => ({}),
  },
  Mutation: {
    before: async (parent, { arg }, ctx, info) => arg,
    beforeNothing: (parent, { arg }, ctx, info) => arg,
    after: () => 'after',
    afterNothing: () => 'after',
    null: () => null,
    nested: () => ({}),
  },
  Nothing: {
    nothing: () => 'nothing',
  },
}

const getSchema = () => makeExecutableSchema({ typeDefs, resolvers })

// Middleware ----------------------------------------------------------------

// Field Middleware

const fieldMiddleware = {
  Query: {
    before: async (resolve, parent, args, context, info) => {
      const _args = { arg: 'changed' }
      return resolve(parent, _args)
    },
    after: async (resolve, parent, args, context, info) => {
      const res = resolve()
      return 'changed'
    },
  },
  Mutation: {
    before: async (resolve, parent, args, context, info) => {
      const _args = { arg: 'changed' }
      return resolve(parent, _args)
    },
    after: async (resolve, parent, args, context, info) => {
      const res = resolve()
      return 'changed'
    },
  },
}

// Type Middleware

const typeMiddlewareBefore = {
  Query: async (resolve, parent, args, context, info) => {
    const _args = { arg: 'changed' }
    return resolve(parent, _args)
  },
  Mutation: async (resolve, parent, args, context, info) => {
    const _args = { arg: 'changed' }
    return resolve(parent, _args)
  },
  // TODO this should work without explicit implementation
  Nothing: {
    nothing: async (resolve, parent, args, context, info) => {
      return resolve()
    },
  },
}

const typeMiddlewareAfter = {
  Query: async (resolve, parent, args, context, info) => {
    const res = resolve()
    return 'changed'
  },
  Mutation: async (resolve, parent, args, context, info) => {
    const res = resolve()
    return 'changed'
  },
  // TODO this should work without explicit implementation
  Nothing: {
    nothing: async (resolve, parent, args, context, info) => {
      return resolve()
    },
  },
}

// Schema Middleware

const schemaMiddlewareBefore = async (resolve, parent, args, context, info) => {
  const _args = { arg: 'changed' }
  return resolve(parent, _args, context, info)
}

const schemaMiddlewareAfter = async (resolve, parent, args, context, info) => {
  const res = resolve()
  return 'changed'
}

// Test ----------------------------------------------------------------------

// Field

test('Field middleware - Query', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

  const query = `
    query {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'before',
      after: 'changed',
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

test('Field middleware - Mutation', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

  const query = `
    mutation {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'before',
      after: 'changed',
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

// Type

test('Type middleware - Query before', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareBefore)

  const query = `
    query {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'after',
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

test('Type middleware - Query after', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareAfter)

  const query = `
    query {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'changed',
      afterNothing: 'changed',
      null: 'changed',
      nested: { nothing: 'nothing' },
    },
  })
})

test('Type middleware - Mutation before', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareBefore)

  const query = `
    mutation {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'after',
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

test('Type middleware - Mutation after', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareAfter)

  const query = `
    mutation {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'changed',
      afterNothing: 'changed',
      null: 'changed',
      nested: { nothing: 'nothing' },
    },
  })
})

// Schema

test('Schema middleware - Query before', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, schemaMiddlewareBefore)

  const query = `
    query {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'after',
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

test('Schema middleware - Query after', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, schemaMiddlewareAfter)

  const query = `
    query {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'changed',
      afterNothing: 'changed',
      null: 'changed',
      nested: { nothing: 'changed' },
    },
  })
})

test('Schema middleware - Mutation before', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, schemaMiddlewareBefore)

  const query = `
    mutation {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing
      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'after',
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

test('Schema middleware - Mutation after', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, schemaMiddlewareAfter)

  const query = `
    mutation {
      before(arg: "before")
      beforeNothing(arg: "before")
      after
      afterNothing

      null
      nested { nothing }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      before: 'changed',
      beforeNothing: 'changed',
      after: 'changed',
      afterNothing: 'changed',
      null: 'changed',
      nested: { nothing: 'changed' },
    },
  })
})
