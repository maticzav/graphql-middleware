import { makeExecutableSchema } from 'graphql-tools'
import { GraphQLServer as YogaServer } from 'graphql-yoga'
import { gql, ApolloServer } from 'apollo-server'
import * as request from 'request-promise-native'
import { AddressInfo } from 'ws'
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

    const schemaWithMiddleware = applyMiddleware(schema, async resolve => {
      const res = await resolve()
      return `pass-${res}`
    })

    const server = new ApolloServer({
      schema: schemaWithMiddleware,
    })

    await server.listen({ port: 8008 })
    const uri = `http://localhost:8008/`

    /* Tests */

    const query = `
      query {
        test
      }
    `

    const body = await request({
      uri,
      method: 'POST',
      json: true,
      body: { query },
    }).promise()

    /* Tests. */

    expect(body).toEqual({
      data: {
        test: 'pass-test',
      },
    })
  })
})
