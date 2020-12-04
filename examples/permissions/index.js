const { applyMiddleware } = require('graphql-middleware-tools')
const { ApolloServer } = require('apollo-server')
const { makeExecutableSchema } = require('@graphql-tools/schema')

// Schema

const code = 'supersecret'

const typeDefs = `
  type Query {
    open: String!
    secured: String!
    me: Me!
  }

  type Me {
    name: String!
    surname: String!
    age: Int!
  }
`

const resolvers = {
  Query: {
    open: () => `Open data, everyone's welcome!`,
    secured: () => `Personal diary - this is for my eyes only!`,
    me: () => ({}),
  },
  Me: {
    name: () => 'Ben',
    surname: () => 'Cool',
    age: () => 18,
  },
}

// Middleware - Permissions

const isLoggedIn = async (resolve, parent, args, ctx, info) => {
  // Include your agent code as Authorization: <token> header.
  const permit = ctx.request.get('Authorization') === code

  if (!permit) {
    throw new Error(`Not authorised!`)
  }

  return resolve()
}

const permissions = {
  Query: {
    secured: isLoggedIn,
  },
  Me: isLoggedIn,
}

const schema = makeExecutableSchema({ typeDefs, resolvers })

const schemaWithMiddleware = applyMiddleware(schema, permissions)

const server = new ApolloServer({
  schema: schemaWithMiddleware,
  context: ({ req }) => ({ req }),
})

await server.listen({ port: 8008 })
