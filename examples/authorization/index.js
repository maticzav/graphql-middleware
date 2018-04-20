const { GraphQLServer } = require('graphql-yoga')
const { makeExecutableSchema } = require('graphql-tools')
const { applyFieldMiddleware } = require('graphql-middleware')

// Agents

const agents = [
  { id: '1', name: 'Matt', code: 'mysecret' },
  { id: '2', name: 'Joh', code: 'cool' },
  { id: '3', name: 'Em', code: 'donttell' },
]

// Schema

const typeDefs = `
  type Query {
    hello(name: String): String!
    agent(mission: String!): String!
  }
`

const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    agent: (_, { mission }) =>
      `Top secret information about your mission (${mission})`,
  },
}

// Middleware

const authMiddleware = {
  Query: {
    agent: (resolve, parent, args, ctx, info) => {
      // Include your agent code as Authorization: <token> header.
      const code = ctx.request.get('Authorization')
      const permit = agents.some(agent => agent.code === code)

      if (!permit) {
        throw new Error(`Not authorised!`)
      }
      return resolve()
    },
  },
}

// Server

const schema = makeExecutableSchema({ typeDefs, resolvers })
const securedSchema = applyFieldMiddleware(schema, authMiddleware)

const server = new GraphQLServer({
  schema: securedSchema,
  context: req => ({ ...req }),
})

server.start(() => console.log('Server is running on localhost:4000'))
