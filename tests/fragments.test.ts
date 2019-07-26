import { makeExecutableSchema } from 'graphql-tools'
import { $$asyncIterator } from 'iterall'
import {
  applyMiddleware,
  applyMiddlewareToDeclaredResolvers,
  IMiddlewareFunction,
  IMiddlewareTypeMap,
} from '../src'
import { IResolvers } from '../src/types'

/**
 * Tests whether graphql-middleware correctly applies middleware to fields it
 * ought to impact based on the width of the middleware specification.
 */
describe('fragments:', () => {
  test('schema-wide middleware', async () => {
    /* Schema. */
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
        book() {
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

    /* Middleware. */

    const schemaMiddlewareWithFragment: IMiddlewareFunction = {
      fragment: `fragment NodeID on Node { id }`,
      resolve: resolve => resolve(),
    }

    const { fragmentReplacements } = applyMiddleware(
      schema,
      schemaMiddlewareWithFragment,
    )

    /* Tests. */

    expect(fragmentReplacements).toEqual([
      { field: 'book', fragment: '... on Node {\n  id\n}' },
      { field: 'name', fragment: '... on Node {\n  id\n}' },
      { field: 'content', fragment: '... on Node {\n  id\n}' },
      { field: 'author', fragment: '... on Node {\n  id\n}' },
    ])
  })

  test('type-wide middleware', async () => {
    /* Schema. */
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
        book() {
          return {
            id: 'id',
            content: 'content',
            author: 'author',
          }
        },
        author() {
          return {
            name: 'name',
          }
        },
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    // Middleware

    const typeMiddlewareWithFragment: IMiddlewareTypeMap = {
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

    /* Tests. */

    expect(fragmentReplacements).toEqual([
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

  test('field-specific middleware', async () => {
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
        book() {
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

    const fieldMiddlewareWithFragment: IMiddlewareTypeMap = {
      Book: {
        content: {
          fragment: `fragment BookId on Book { id ... on Book { name } }`,
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

    /* Tests. */

    expect(fragmentReplacements).toEqual([
      {
        field: 'content',
        fragment: '... on Book {\n  id\n  ... on Book {\n    name\n  }\n}',
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

  test('subscription fragment', async () => {
    /* Schema. */
    const typeDefs = `
      type Query {
        book(id: ID!): Book!
      }

      type Subscription {
        book(id: ID!): Book!
      }

      type Book {
        id: ID!
        name: String!
      }

      schema {
        query: Query,
        subscription: Subscription
      }
    `

    const resolvers: IResolvers = {
      Query: {
        book() {
          return {
            id: 'id',
            name: 'name',
          }
        },
      },
      Subscription: {
        book: {
          subscribe: async (parent, { id }) => {
            const iterator = {
              next: () => Promise.resolve({ done: false, value: { sub: id } }),
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
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    /* Middleware. */

    const fieldMiddlewareWithFragment: IMiddlewareTypeMap = {
      Subscription: {
        book: {
          fragment: `fragment Ignored on Book { ignore }`,
          resolve: resolve => resolve(),
        },
      },
    }

    const { fragmentReplacements } = applyMiddlewareToDeclaredResolvers(
      schema,
      fieldMiddlewareWithFragment,
    )

    /* Tests. */

    expect(fragmentReplacements).toEqual([
      {
        field: 'book',
        fragment: '... on Book {\n  ignore\n}',
      },
    ])
  })
})

describe('fragments on declared resolvers:', () => {
  test('schema-wide middleware', async () => {
    /* Schema. */
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
        book() {
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

    /* Middleware. */

    const schemaMiddlewareWithFragment: IMiddlewareFunction = {
      fragment: `fragment NodeId on Node { id }`,
      resolve: resolve => resolve(),
    }

    const { fragmentReplacements } = applyMiddlewareToDeclaredResolvers(
      schema,
      schemaMiddlewareWithFragment,
    )

    /* Tests. */

    expect(fragmentReplacements).toEqual([
      { field: 'book', fragment: '... on Node {\n  id\n}' },
    ])
  })

  test('type-wide middleware', async () => {
    /* Schema. */
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
        book() {
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

    /* Middleware. */

    const typeMiddlewareWithFragment: IMiddlewareTypeMap = {
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

    /* Tests. */

    expect(fragmentReplacements).toEqual([
      {
        field: 'book',
        fragment: '... on Query {\n  viewer\n}',
      },
    ])
  })

  test('field-specific middleware', async () => {
    /* Schema. */
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
        book() {
          return {}
        },
      },
      Book: {
        id: () => 'id',
        name: () => 'name',
        content: () => 'content',
        author: () => 'author',
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    /* Middleware. */

    const fieldMiddlewareWithFragment: IMiddlewareTypeMap = {
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

    /* Tests. */

    expect(fragmentReplacements).toEqual([
      {
        field: 'id',
        fragment: '... on Book {\n  ignore\n}',
      },
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
})

test('imparsable fragment', async () => {
  /* Schema. */
  const typeDefs = `
      type Query {
        book: String!
      }
    `

  const resolvers = {
    Query: {
      book() {
        return 'book'
      },
    },
  }

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  /* Middleware. */

  const fieldMiddlewareWithFragment: IMiddlewareFunction = {
    fragment: 'foo',
    resolve: resolve => resolve(),
  }

  /* Tests. */

  expect(() => {
    applyMiddlewareToDeclaredResolvers(schema, fieldMiddlewareWithFragment)
  }).toThrow('Could not parse fragment')
})
