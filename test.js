import test from 'ava'
import fetch from 'node-fetch'
import { graphql, subscribe, parse, print } from 'graphql'
import { makeExecutableSchema, makeRemoteExecutableSchema } from 'graphql-tools'
import { GraphQLServer } from 'graphql-yoga'
import { Binding } from 'graphql-binding'
import { ApolloLink } from 'apollo-link'
import { HttpLink } from 'apollo-link-http'
import { $$asyncIterator } from 'iterall'

import {
  applyMiddleware,
  middleware,
  applyMiddlewareToDeclaredResolvers,
  MiddlewareError,
} from './dist'

// Helpers

async function mockRemoteSchema() {
  const randomId = () =>
    Math.random()
      .toString(36)
      .substr(2, 5)

  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
      secret: String!
    }
  `

  const book = {
    __typename: 'Book',
    id: randomId(),
    name: 'awesome',
    content: 'content',
    secret: 'hidden',
  }

  const resolvers = {
    Query: {
      book: () => book,
    },
  }

  const server = new GraphQLServer({ typeDefs, resolvers })

  const http = await server.start({ port: 0 })
  const { port } = http.address()
  const uri = `http://localhost:${port}/`

  return {
    uri,
    typeDefs,
    data: { book },
  }
}

class MockBinding extends Binding {
  constructor({ endpoint, typeDefs, fragmentReplacements }) {
    const link = new HttpLink({ uri: endpoint, fetch })

    const schema = makeRemoteExecutableSchema({
      link,
      schema: typeDefs,
    })

    super({
      schema,
      fragmentReplacements,
    })
  }
}

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

const emptyStringMiddleware = async (resolve, parent, args, context, info) => {
  if (/^String!?$/.test(info.returnType)) {
    return ''
  } else {
    return resolve()
  }
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

test('Schema, Type, Field - Overlapping', async t => {
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

  // Permutations
  const schemaWithMiddleware1 = applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    schemaMiddleware,
    fieldMiddleware,
    typeMiddleware,
  )
  const schemaWithMiddleware2 = applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    schemaMiddleware,
    typeMiddleware,
    fieldMiddleware,
  )
  const schemaWithMiddleware3 = applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    typeMiddleware,
    schemaMiddleware,
    fieldMiddleware,
  )
  const schemaWithMiddleware4 = applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    typeMiddleware,
    fieldMiddleware,
    schemaMiddleware,
  )
  const schemaWithMiddleware5 = applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    fieldMiddleware,
    schemaMiddleware,
    typeMiddleware,
  )
  const schemaWithMiddleware6 = applyMiddleware(
    makeExecutableSchema({ typeDefs, resolvers }),
    fieldMiddleware,
    typeMiddleware,
    schemaMiddleware,
  )

  const res1 = await graphql(schemaWithMiddleware1, query)
  const res2 = await graphql(schemaWithMiddleware2, query)
  const res3 = await graphql(schemaWithMiddleware3, query)
  const res4 = await graphql(schemaWithMiddleware4, query)
  const res5 = await graphql(schemaWithMiddleware5, query)
  const res6 = await graphql(schemaWithMiddleware6, query)

  const res = [res1, res2, res3, res4, res5, res6].map(JSON.stringify)

  t.true(res.every(r => r === res[0]))
})

// Not found fields

test('Middleware Error - Schema undefined type', async t => {
  const schema = getSchema()

  const res = t.throws(() => {
    applyMiddleware(schema, middlewareWithUndefinedType)
  })

  t.deepEqual(
    res,
    new MiddlewareError(
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
    new MiddlewareError(
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
    new MiddlewareError(
      `Expected Query.before to be a function but found boolean`,
    ),
  )
})

// Execution order

test('Middleware execution order', async t => {
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

// Generator

test('Middleware with generator', async t => {
  t.plan(2)

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

  const testMiddleware = middleware(_schema => {
    t.deepEqual(schema, _schema)
    return async (resolve, parent, args, ctx, info) => {
      return 'pass'
    }
  })

  const schemaWithMiddleware = applyMiddleware(schema, testMiddleware)
  const query = `
    query {
      test
    }
  `

  const res = await graphql(schemaWithMiddleware, query)

  t.is(res.data.test, 'pass')
})

test('applyMiddlewareToDeclaredResolvers - applies middleware to all but default resolvers', async t => {
  const schema = getSchema()
  const schemaWithMiddleware = applyMiddlewareToDeclaredResolvers(
    schema,
    emptyStringMiddleware,
  )

  const query = `
    query {
      resolverless {
        someData
      }
      after
    }
  `
  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      resolverless: {
        someData: 'data',
      },
      after: '',
    },
  })
})

test('Argumnets forwarded correctly', async t => {
  t.plan(3)

  const typeDefs = `
    type Query {
      test(arg: String!): Test!
    }
    
    type Test {
      parent: String!
    }
  `

  const resolvers = {
    Query: {
      test: (parent, { arg }, ctx, info) => {
        t.is(arg, 'pass')
        return 'fail'
      },
    },
    Test: {
      parent: (parent, arg, ctx, info) => {
        t.is(parent, 'pass')
        return 'pass'
      },
    },
  }

  const middleware = (resolve, parent, args, ctx, info) => {
    return resolve('pass', { arg: 'pass' }, ctx, info)
  }

  const schema = makeExecutableSchema({ resolvers, typeDefs })
  const schemaWithMiddleware = applyMiddleware(schema, middleware)

  const query = `
    query {
      test(arg: "fail") {
        parent
      }
    }
  `

  const res = await graphql(schemaWithMiddleware, query)

  t.deepEqual(res, {
    data: {
      test: {
        parent: 'pass',
      },
    },
  })
})

// Fragments

test('Supports fragments - Field', async t => {
  t.plan(2)

  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
    }
  `

  const resolvers = {
    Query: {
      book: (parent, args, ctx, info) => ctx.binding.query.book({}, info),
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const middlewareWithFragments = {
    Book: {
      content: {
        fragment: `fragment BookSecret on Book { secret }`,
        resolve: async (resolve, parent, args, ctx, info) => {
          t.is(parent.secret, 'hidden')
          return resolve()
        },
      },
    },
  }

  const {
    schema: schemaWithMiddleware,
    fragmentReplacements,
  } = applyMiddleware(schema, middlewareWithFragments)

  // Remote

  const remote = await mockRemoteSchema()

  // GraphQL

  const server = new GraphQLServer({
    schema: schemaWithMiddleware,
    context: () => ({
      binding: new MockBinding({
        typeDefs: remote.typeDefs,
        endpoint: remote.uri,
        fragmentReplacements,
      }),
    }),
  })

  const http = await server.start({ port: 0 })
  const { port } = http.address()
  const endpoint = `http://localhost:${port}/`

  const query = `
    query {
      book {
        id
        name
        content
      }
    }
  `

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }).then(response => response.json())

  t.deepEqual(res, {
    data: {
      book: {
        id: remote.data.book.id,
        name: remote.data.book.name,
        content: remote.data.book.content,
      },
    },
  })
})
