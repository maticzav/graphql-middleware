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
    fragment: `fragment NodeID on Node { id }`,
    resolve: resolve => resolve(),
  }

  const { fragmentReplacements } = applyMiddleware(
    schema,
    schemaMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    { field: 'book', fragment: '... on Node {\n  id\n}' },
    { field: 'name', fragment: '... on Node {\n  id\n}' },
    { field: 'content', fragment: '... on Node {\n  id\n}' },
    { field: 'author', fragment: '... on Node {\n  id\n}' },
  ])
})

test('Applies type middleware with fragments correctly.', async t => {
  const typeDefs = `
    type Query {
      book: Book!
      author: Author!
    }

    type Book {
      id: ID!
      content: String!
      author: String!
    }

    type Author {
      id: ID!
      name: String!
    }
  `

  const resolvers = {
    Query: {
      book(parent, args, ctx, info) {
        return {
          id: 'id',
          content: 'content',
          author: 'author',
        }
      },
      author(parent, args, ctx, info) {
        return {
          name: 'name',
        }
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  // Middleware

  const typeMiddlewareWithFragment = {
    Book: {
      fragment: `fragment BookId on Book { id }`,
      resolve: resolve => resolve(),
    },
    Author: {
      fragments: [`... on Author { id }`, `... on Author { name }`],
      resolve: resolve => resolve(),
    },
  }

  const { fragmentReplacements } = applyMiddleware(
    schema,
    typeMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    {
      field: 'content',
      fragment: '... on Book {\n  id\n}',
    },
    {
      field: 'author',
      fragment: '... on Book {\n  id\n}',
    },
    {
      field: 'id',
      fragment: '... on Author {\n  name\n}',
    },
    {
      field: 'name',
      fragment: '... on Author {\n  id\n}',
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
        fragment: `fragment BookId on Book { id }`,
        resolve: resolve => resolve(),
      },
      author: {
        fragments: [
          `fragment BookId on Book { id }`,
          `fragment BookContent on Book { content }`,
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
      fragment: '... on Book {\n  id\n}',
    },
    {
      field: 'author',
      fragment: '... on Book {\n  id\n}',
    },
    {
      field: 'author',
      fragment: '... on Book {\n  content\n}',
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
    fragment: `fragment NodeId on Node { id }`,
    resolve: resolve => resolve(),
  }

  const { fragmentReplacements } = applyMiddlewareToDeclaredResolvers(
    schema,
    schemaMiddlewareWithFragment,
  )

  t.deepEqual(fragmentReplacements, [
    { field: 'book', fragment: '... on Node {\n  id\n}' },
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
      fragments: [`fragment QueryViewer on Query { viewer }`],
      resolve: resolve => resolve(),
    },
    Book: {
      fragment: `... on Book { id }`,
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
      fragment: '... on Query {\n  viewer\n}',
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
        fragment: `fragment Ignored on Book { ignore }`,
        resolve: resolve => resolve(),
      },
      content: {
        fragment: `fragment BookId on Book { id }`,
        resolve: resolve => resolve(),
      },
      author: {
        fragments: [
          `fragment AuthorId on Author { id }`,
          `fragment AuthorName on Author { name }`,
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
      fragment: '... on Book {\n  id\n}',
    },
    {
      field: 'author',
      fragment: '... on Author {\n  id\n}',
    },
    {
      field: 'author',
      fragment: '... on Author {\n  name\n}',
    },
  ])
})
