import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'
import { graphql } from 'graphql'
import { applyMiddleware } from '../'

test('Middleware execution order', async t => {
  t.plan(2)

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

  // Middleware

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

  const schemaWithMiddleware = applyMiddleware(
    schema,
    firstMiddleware(t),
    secondMiddleware(t),
  )

  const query = `
    query {
      test
    }
  `
  await graphql(schemaWithMiddleware, query, null, {})
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

  const res = [res1, res2, res3, res4, res5, res6].map(obj =>
    JSON.stringify(obj),
  )

  t.true(res.every(r => r === res[0]))
})
