const { GraphQLServer } = require('graphql-yoga')
const { makeExecutableSchema } = require('graphql-tools')
const { applyMiddleware } = require('graphql-middleware')

// Schema

const code = 'supersecret'

const typeDefs = `
  type Query {
    open: String!
    secured: String!
  }
`

const resolvers = {
  Query: {
    open: () => `Open data, everyone's welcome!`,
    secured: () => `Personal diary - this is for my eyes only!`,
  },
}

// Middleware

const permissions = {
  Query: {
    secured: async (resolve, parent, args, ctx, info) => {
      // Include your agent code as Authorization: <token> header.
      const permit = ctx.request.get('Authorization') === code

      if (!permit) {
        throw new Error(`Not authorised!`)
      }

      return resolve()
    },
  },
}

// Server

const schema = makeExecutableSchema({ typeDefs, resolvers })
const protectedSchema = applyMiddleware(schema, permissions)

const server = new GraphQLServer({
  schema: protectedSchema,
  context: req => ({ ...req }),
})

server.start(() => console.log('Server is running on localhost:4000'))
