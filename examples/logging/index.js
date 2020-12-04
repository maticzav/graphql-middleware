const { applyMiddleware } = require('graphql-middleware-tool')
const { ApolloServer } = require('apollo-server')
const { makeExecutableSchema } = require('@graphql-tools/schema')

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

const schema = makeExecutableSchema({ typeDefs, resolvers })

const schemaWithMiddleware = applyMiddleware(schema, logMiddleware)

const server = new ApolloServer({
  schema: schemaWithMiddleware,
})

server
  .listen({ port: 8008 })
  .then(() => console.log('Server is running on http://localhost:8008'))
