const { GraphQLServer } = require('graphql-yoga')
const { makeExecutableSchema } = require('graphql-tools')
const { applyFieldMiddleware } = require('graphql-middleware')

// Schema

const typeDefs = `
  type Query {
    hello(name: String): String!
    bye(name: String): String!
  }
`

const resolvers = {
  Query: {
    hello: (_, { name }) => `Hello ${name || 'World'}`,
    bye: (_, { name }) => `Bye ${name || 'World'}`,
  },
}

// Middleware

const logMiddleware = async (resolve, parent, args, ctx, info) => {
  console.log(args, info)
  return resolve()
}

// Server

const schema = makeExecutableSchema({ typeDefs, resolvers })
const analysedSchema = applyFieldMiddleware(schema, logMiddleware)

const server = new GraphQLServer({
  schema: analysedSchema,
  context: req => ({ ...req }),
})

server.start(() => console.log('Server is running on localhost:4000'))
