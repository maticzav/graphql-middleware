import { ApolloServer } from 'apollo-server'
import Axios from 'axios'
import { applyMiddleware } from '../src'

describe('integrations', () => {
  test('ApolloServer', async () => {
    /* Schema. */
    const typeDefs = `
      type Query {
        test: String!
      }
    `

    const resolvers = {
      Query: {
        test: () => 'test',
      },
    }

    const schema = makeExecutableSchema({ typeDefs, resolvers })

    const schemaWithMiddleware = applyMiddleware(schema, async (resolve) => {
      const res = await resolve()
      return `pass-${res}`
    })

    const server = new ApolloServer({
      schema: schemaWithMiddleware,
    })

    await server.listen({ port: 8008 })
    try {
    const uri = `http://localhost:8008/`

    /* Tests */

    const query = `
      query {
        test
      }
    `

      const body = await Axios.post(uri, { query })
    /* Tests. */

      expect(body.data).toEqual({
      data: {
        test: 'pass-test',
      },
    })
    } finally {
      await server.stop()
    }
  })
})
