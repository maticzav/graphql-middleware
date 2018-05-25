const { GraphQLServer } = require('graphql-yoga')
const { makeExecutableSchema } = require('graphql-tools')
const { applyMiddleware } = require('graphql-middleware')

// Schema

const typeDefs = `
  type Query {
    hello(name: String): String!
    bye(name: String): String!
  }
`

const resolvers = {
  Query: {
    hello: (_, { name }) => {
      throw new Error('No hello!')
    },
    bye: (_, { name }) => `Bye ${name || 'World'}`,
  },
}

// Middleware

const logMiddleware = async (resolve, parent, args, ctx, info) => {
  try {
    const res = await resolve()
    return res
  } catch(e) {
    console.log(e)
  }
}

// Server

const schema = makeExecutableSchema({ typeDefs, resolvers })
const analysedSchema = applyMiddleware(schema, logMiddleware)

const server = new GraphQLServer({
  schema: analysedSchema,
  context: req => ({ ...req }),
})

server.start(() => console.log('Server is running on http://localhost:4000'))
