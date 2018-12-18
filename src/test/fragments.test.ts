import test from 'ava'
import { makeExecutableSchema } from 'graphql-tools'

import { applyMiddleware, applyMiddlewareToDeclaredResolvers } from '../'

test('Applies schema middleware with fragments correctly.', async t => {
  const typeDefs = `
  type Query {
    book: Book!
  }

  type Book {
    id: ID!
    name: String!
    content: String!
    author: String!
  }
`

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          name: 'name',
          content: 'content',
          author: 'author',
        }
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const schemaMiddlewareWithFragment = {
    fragment: `schema-fragment`,
    resolve: resolve => resolve(),
  }

  const { fragmentReplacements } = applyMiddleware(
    schema,
    schemaMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    { field: 'book', fragment: 'schema-fragment' },
    { field: 'id', fragment: 'schema-fragment' },
    { field: 'name', fragment: 'schema-fragment' },
    { field: 'content', fragment: 'schema-fragment' },
    { field: 'author', fragment: 'schema-fragment' },
  ])
})

test('Applies type middleware with fragments correctly.', async t => {
  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
      author: String!
    }
  `

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          name: 'name',
          content: 'content',
          author: 'author',
        }
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const typeMiddlewareWithFragment = {
    Query: {
      fragments: [`type-fragment:Query-1`, `type-fragment:Query-2`],
      resolve: resolve => resolve(),
    },
    Book: {
      fragment: `type-fragment:Book`,
      resolve: resolve => resolve(),
    },
  }

  const { fragmentReplacements } = applyMiddleware(
    schema,
    typeMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    {
      field: 'book',
      fragment: 'type-fragment:Query-1',
    },
    {
      field: 'book',
      fragment: 'type-fragment:Query-2',
    },
    {
      field: 'id',
      fragment: 'type-fragment:Book',
    },
    {
      field: 'name',
      fragment: 'type-fragment:Book',
    },
    {
      field: 'content',
      fragment: 'type-fragment:Book',
    },
    {
      field: 'author',
      fragment: 'type-fragment:Book',
    },
  ])
})

test('Applies field middleware with fragments correctly.', async t => {
  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
      author: String!
    }
  `

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          name: 'name',
          content: 'content',
          author: 'author',
        }
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const fieldMiddlewareWithFragment = {
    Book: {
      content: {
        fragment: `field-fragment:Book.content`,
        resolve: resolve => resolve(),
      },
      author: {
        fragments: [
          `field-fragment:Book.author-1`,
          `field-fragment:Book.author-2`,
        ],
        resolve: resolve => resolve(),
      },
    },
  }

  const { fragmentReplacements } = applyMiddleware(
    schema,
    fieldMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    {
      field: 'content',
      fragment: 'field-fragment:Book.content',
    },
    {
      field: 'author',
      fragment: 'field-fragment:Book.author-1',
    },
    {
      field: 'author',
      fragment: 'field-fragment:Book.author-2',
    },
  ])
})

test('Applies schema middleware with fragments correctly on declared resolvers.', async t => {
  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
      author: String!
    }
  `

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          name: 'name',
          content: 'content',
          author: 'author',
        }
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const schemaMiddlewareWithFragment = {
    fragment: `schema-fragment`,
    resolve: resolve => resolve(),
  }

  const { fragmentReplacements } = applyMiddlewareToDeclaredResolvers(
    schema,
    schemaMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    { field: 'book', fragment: 'schema-fragment' },
  ])
})

test('Applies type middleware with fragments correctly on declared resolvers.', async t => {
  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
      author: String!
    }
  `

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          name: 'name',
          content: 'content',
          author: 'author',
        }
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware
  const typeMiddlewareWithFragment = {
    Query: {
      fragments: [`type-fragment:Query-1`, `type-fragment:Query-2`],
      resolve: resolve => resolve(),
    },
    Book: {
      fragment: `type-fragment:Book`,
      resolve: resolve => resolve(),
    },
  }

  const { fragmentReplacements } = applyMiddlewareToDeclaredResolvers(
    schema,
    typeMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    {
      field: 'book',
      fragment: 'type-fragment:Query-1',
    },
    {
      field: 'book',
      fragment: 'type-fragment:Query-2',
    },
  ])
})

test('Applies field middleware with fragments correctly on declared resolvers.', async t => {
  const typeDefs = `
    type Query {
      book: Book!
    }

    type Book {
      id: ID!
      name: String!
      content: String!
      author: String!
    }
  `

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          name: 'name',
          content: 'content',
          author: 'author',
        }
      },
    },
    Book: {
      name: parent => parent.name,
      content: parent => parent.content,
      author: parent => parent.author,
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const fieldMiddlewareWithFragment = {
    Book: {
      id: {
        fragment: `not-copied`,
        resolve: resolve => resolve(),
      },
      content: {
        fragment: `field-fragment:Book.content`,
        resolve: resolve => resolve(),
      },
      author: {
        fragments: [
          `field-fragment:Book.author-1`,
          `field-fragment:Book.author-2`,
        ],
        resolve: resolve => resolve(),
      },
    },
  }

  const { fragmentReplacements } = applyMiddlewareToDeclaredResolvers(
    schema,
    fieldMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    {
      field: 'content',
      fragment: 'field-fragment:Book.content',
    },
    {
      field: 'author',
      fragment: 'field-fragment:Book.author-1',
    },
    {
      field: 'author',
      fragment: 'field-fragment:Book.author-2',
    },
  ])
})
