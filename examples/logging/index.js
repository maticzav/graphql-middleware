const { GraphQLServer } = require('graphql-yoga')

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
  } catch (e) {
    console.log(e)
  }
}

const server = new GraphQLServer({
  typeDefs: typeDefs,
  resolvers: resolvers,
  middlewares: [logMiddleware],
  context: req => ({ ...req }),
})

server.start(() => console.log('Server is running on http://localhost:4000'))
