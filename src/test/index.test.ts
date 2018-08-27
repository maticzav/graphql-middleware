import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql, subscribe, parse } from 'graphql'
import { $$asyncIterator } from 'iterall'
import { ExecutionResult } from 'apollo-link'

import { applyMiddleware } from '../'

// Setup ---------------------------------------------------------------------

const typeDefs = `
  type Query {
    before(arg: String!): String!
    beforeNothing(arg: String!): String!
    after: String!
    afterNothing: String!
    null: String
    nested: Nothing!
    resolverless: Resolverless!
  }

  type Mutation {
    before(arg: String!): String!
    beforeNothing(arg: String!): String!
    after: String!
    afterNothing: String!
    null: String
    nested: Nothing!
    withObjectTypeConfig: String!
  }
  
  type Subscription {
    sub: String
  }

  type Nothing {
    nothing: String!
  }

  type Resolverless {
    someData: String!
  }

  schema {
    query: Query,
    mutation: Mutation,
    subscription: Subscription
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
    resolverless: () => ({ someData: 'data' }),
  },
  Mutation: {
    before: async (parent, { arg }, ctx, info) => arg,
    beforeNothing: (parent, { arg }, ctx, info) => arg,
    after: () => 'after',
    afterNothing: () => 'after',
    null: () => null,
    nested: () => ({}),
    withObjectTypeConfig: {
      extraProperties: 'extra properties are passed down',
      resolve: () => 'withObjectTypeConfig'
    }
  },
  Subscription: {
    sub: {
      subscribe: async (parent, { arg }, ctx, info) => {
        const iterator = {
          next: () => Promise.resolve({ done: false, value: { sub: arg } }),
          return: () => {
            return
          },
          throw: () => {
            return
          },
          [$$asyncIterator]: () => iterator,
        }
        return iterator
      },
    },
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
    withObjectTypeConfig: async (resolve, parent, args, context, info) => {
      return info.schema.getMutationType().getFields()[info.fieldName].extraProperties || 'fail'
    },
  },
  Subscription: {
    sub: async (resolve, parent, args, context, info) => {
      const _args = { arg: 'changed' }
      return resolve(parent, _args)
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
  Subscription: async (resolve, parent, args, context, info) => {
    const _args = { arg: 'changed' }
    return resolve(parent, _args)
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

const emptyStringMiddleware = async (resolve, parent, args, context, info) => {
  if (/^String!?$/.test(info.returnType)) {
    return ''
  } else {
    return resolve()
  }
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
      withObjectTypeConfig
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
      withObjectTypeConfig: 'extra properties are passed down',
    },
  })
})

test('Field middleware - Subscription', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

  const query = `
    subscription {
      sub
    }
  `
  const iterator = await subscribe(schemaWithMiddleware, parse(query))
  const res = await (iterator as AsyncIterator<ExecutionResult>).next()

  t.deepEqual(res, {
    done: false,
    value: {
      data: {
        sub: 'changed',
      },
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

test('Type middleware - Subscription', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, typeMiddlewareBefore)

  const query = `
    subscription {
      sub
    }
  `
  const iterator = await subscribe(schemaWithMiddleware, parse(query))
  const res = await (iterator as AsyncIterator<ExecutionResult>).next()

  t.deepEqual(res, {
    done: false,
    value: {
      data: {
        sub: 'changed',
      },
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

test('Schema middleware - Subscription', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, schemaMiddlewareBefore)

  const query = `
    subscription {
      sub
    }
  `
  const iterator = await subscribe(schemaWithMiddleware, parse(query))
  const res = await (iterator as AsyncIterator<ExecutionResult>).next()

  t.deepEqual(res, {
    done: false,
    value: {
      data: {
        sub: 'changed',
      },
    },
  })
})

test('Schema middleware - Uses default field resolver', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, schemaMiddlewareBefore)

  const query = `
    query {
      resolverless {
        someData
      }
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      resolverless: {
        someData: 'data',
      },
    },
  })
})

// Combinations and overlapping

test('Combinations - Schema, Type, Field middleware', async t => {
  const typeDefs = `
    type Query {
      # Field scoped
      fieldTest: Int!
      fieldTestNothing: Int!
      # Type scoped
      forward: Type!
      typeTestNothing: Int!
    }

    type Type {
      typeTest: Int!
      fieldTest: Int!
    }
  `

  const resolvers = {
    Query: {
      fieldTest: () => 0,
      fieldTestNothing: () => 0,
      forward: () => ({}),
      typeTestNothing: () => 0,
    },
    Type: {
      typeTest: () => 0,
      fieldTest: () => 0,
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const addOne = async (resolve, parent, args, ctx, info) => {
    return (await resolve()) + 1
  }

  const schemaMiddleware = async (resolve, parent, args, ctx, info) => {
    const res = await resolve()

    if (typeof res === 'number') {
      return res + 1
    } else {
      return res
    }
  }

  const typeMiddleware = {
    Type: addOne,
  }

  const fieldMiddleware = {
    Query: {
      fieldTest: addOne,
    },
    Type: {
      fieldTest: addOne,
    },
  }

  const schemaWithMiddleware = applyMiddleware(
    schema,
    schemaMiddleware,
    fieldMiddleware,
    typeMiddleware,
  )

  const query = `
    query {
      fieldTest # 2 (schema, field)
      fieldTestNothing # 1 (schema)
      forward {
        typeTest # 2 (schema, type)
        fieldTest # 3 (schema, type, field)
      }
      typeTestNothing # 1 (schema)
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      fieldTest: 2,
      fieldTestNothing: 1,
      forward: {
        typeTest: 2,
        fieldTest: 3,
      },
      typeTestNothing: 1,
    },
  })
})
