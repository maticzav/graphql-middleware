import test from 'ava'
import { graphql, subscribe, parse } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'
import { $$asyncIterator } from 'iterall'
import { applyMiddleware, MiddlewareError } from './dist'

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
  },
  Subscription: {
    sub: {
      subscribe: async (parent, { arg }, ctx, info) => {
        const iterator = {
          next: () => Promise.resolve({ done: false, value: { sub: arg } }),
          return: () => {},
          throw: () => {},
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

// Middleware Validation

const middlewareWithUndefinedType = {
  Wrong: () => ({}),
}

const middlewareWithUndefinedField = {
  Query: {
    wrong: () => ({}),
  },
}

const middlewareWithObjectField = {
  Query: {
    before: false,
  },
}

// Middleware execution

const firstMiddleware = t => async (resolve, parent, args, ctx, info) => {
  t.pass()

  if (!ctx._execution) {
    ctx._execution = true
  }

  return resolve()
}

const secondMiddleware = t => async (resolve, parent, args, ctx, info) => {
  if (ctx._execution) {
    t.pass()
  }

  return resolve()
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

test('Field middleware - Subscription', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(schema, fieldMiddleware)

  const query = `
    subscription {
      sub
    }
  `
  const iterator = await subscribe(schemaWithMiddleware, parse(query))
  const res = await iterator.next()

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
  const res = await iterator.next()

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
  const res = await iterator.next()

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

// Combinations

test('Schema, Field middleware - Query', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(
    schema,
    schemaMiddlewareBefore,
    fieldMiddleware,
  )

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
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

test('Schema, Field middleware - Mutation', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(
    schema,
    schemaMiddlewareBefore,
    fieldMiddleware,
  )

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
      afterNothing: 'after',
      null: null,
      nested: { nothing: 'nothing' },
    },
  })
})

// Not found fields

test('Middleware Error - Schema undefined type', async t => {
  const schema = getSchema()

  const res = t.throws(() => {
    applyMiddleware(schema, middlewareWithUndefinedType)
  })

  t.deepEqual(
    res,
    MiddlewareError(
      `Type Wrong exists in middleware but is missing in Schema.`,
    ),
  )
})

test('Middleware Error - Schema undefined field', async t => {
  const schema = getSchema()

  const res = t.throws(() => {
    applyMiddleware(schema, middlewareWithUndefinedField)
  })

  t.deepEqual(
    res,
    MiddlewareError(
      `Field Query.wrong exists in middleware but is missing in Schema.`,
    ),
  )
})

test('Middleware Error - Middleware field is not a function.', async t => {
  const schema = getSchema()

  const res = t.throws(() => {
    applyMiddleware(schema, middlewareWithObjectField)
  })

  t.deepEqual(
    res,
    MiddlewareError(`Expected Query.before to be a function but found boolean`),
  )
})

// Execution chain

test('Middleware execution chain', async t => {
  t.plan(2)

  const schema = getSchema()
  const schemaWithMiddleware = applyMiddleware(
    schema,
    firstMiddleware(t),
    secondMiddleware(t),
  )

  const query = `
    query {
      after
    }
  `
  const res = await graphql(schemaWithMiddleware, query, null, {})
})
