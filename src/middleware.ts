import { GraphQLSchema, GraphQLNamedType } from 'graphql'
// import { addResolveFunctionsToSchema } from 'graphql-tools'
import {
  IApplyOptions,
  IMiddleware,
  FragmentReplacement,
  IMiddlewareGenerator,
  GraphQLSchemaWithFragmentReplacements,
  IResolvers,
  IResolverObject,
} from './types'
import { generateResolverFromSchemaAndMiddleware } from './applicator'
import { validateMiddleware } from './validation'
import { extractFragmentReplacements } from './fragments'
import { isMiddlewareGenerator } from './utils'

function addResolveFunctionsToNamedType<T = GraphQLNamedType>(
  type: T,
  resolvers: IResolverObject,
): T {
  return new GraphQLTy()
}

function addResolveFunctionsToMaybeNamedType<T = GraphQLNamedType>(
  type: T,
  resolvers: IResolverObject,
): T {
  return type ? addResolveFunctionsToNamedType(type, resolvers) : null
}

function addResolveFunctionsToSchema(
  schema: GraphQLSchema,
  resolvers: IResolvers,
): GraphQLSchema {
  const operationTypes = {
    query: addResolveFunctionsToMaybeNamedType(
      schema.getQueryType(),
      resolvers['Query'],
    ),
    mutation: addResolveFunctionsToMaybeNamedType(
      schema.getMutationType(),
      resolvers['Mutation'],
    ),
    subscription: addResolveFunctionsToMaybeNamedType(
      schema.getSubscriptionType(),
      resolvers['Subscription'],
    ),
  }

  const types = Object.values(schema.getTypeMap()).map(type => {
    if (resolvers[type.name]) {
      return addResolveFunctionsToNamedType(type, resolvers[type.name])
    } else {
      return type
    }
  })

  return new GraphQLSchema({
    ...operationTypes,
    types,
    directives: [...schema.getDirectives()],
    astNode: schema.astNode,
    extensionASTNodes: schema.extensionASTNodes,
  })
}

/**
 *
 * @param schema
 * @param options
 * @param middleware
 *
 * Validates middleware and generates resolvers map for provided middleware.
 * Applies middleware to the current schema and returns the modified one.
 *
 */
export function addMiddlewareToSchema<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  options: IApplyOptions,
  middleware: IMiddleware<TSource, TContext, TArgs>,
): {
  schema: GraphQLSchema
  fragmentReplacements: FragmentReplacement[]
} {
  const validMiddleware = validateMiddleware(schema, middleware)
  const resolvers = generateResolverFromSchemaAndMiddleware(
    schema,
    options,
    validMiddleware,
  )

  const fragmentReplacements = extractFragmentReplacements(resolvers)

  const schemaWithMiddleware = addResolveFunctionsToSchema(schema, resolvers)

  return {
    schema: schemaWithMiddleware,
    fragmentReplacements,
  }
}

/**
 *
 * @param schema
 * @param options
 * @param middlewares
 *
 * Generates middleware from middleware generators and applies middleware to
 * resolvers. Returns generated schema with all provided middleware.
 *
 */
function applyMiddlewareWithOptions<TSource = any, TContext = any, TArgs = any>(
  schema: GraphQLSchema,
  options: IApplyOptions,
  ...middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | IMiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchemaWithFragmentReplacements {
  const normalisedMiddlewares = middlewares.map(middleware => {
    if (isMiddlewareGenerator(middleware)) {
      return middleware.generate(schema)
    } else {
      return middleware
    }
  })

  const schemaWithMiddlewareAndFragmentReplacements = normalisedMiddlewares.reduceRight(
    (
      {
        schema: currentSchema,
        fragmentReplacements: currentFragmentReplacements,
      },
      middleware,
    ) => {
      const {
        schema: newSchema,
        fragmentReplacements: newFragmentReplacements,
      } = addMiddlewareToSchema(currentSchema, options, middleware)

      return {
        schema: newSchema,
        fragmentReplacements: [
          ...currentFragmentReplacements,
          ...newFragmentReplacements,
        ],
      }
    },
    { schema, fragmentReplacements: [] },
  )

  const schemaWithMiddleware: GraphQLSchemaWithFragmentReplacements =
    schemaWithMiddlewareAndFragmentReplacements.schema

  schemaWithMiddleware.schema =
    schemaWithMiddlewareAndFragmentReplacements.schema
  schemaWithMiddleware.fragmentReplacements =
    schemaWithMiddlewareAndFragmentReplacements.fragmentReplacements

  return schemaWithMiddleware
}

// Exposed functions

/**
 *
 * @param schema
 * @param middlewares
 *
 * Apply middleware to resolvers and return generated schema.
 *
 */
export function applyMiddleware<TSource = any, TContext = any, TArgs = any>(
  schema: GraphQLSchema,
  ...middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | IMiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchemaWithFragmentReplacements {
  return applyMiddlewareWithOptions(
    schema,
    { onlyDeclaredResolvers: false },
    ...middlewares,
  )
}

/**
 *
 * @param schema
 * @param middlewares
 *
 * Apply middleware to declared resolvers and return new schema.
 *
 */
export function applyMiddlewareToDeclaredResolvers<
  TSource = any,
  TContext = any,
  TArgs = any
>(
  schema: GraphQLSchema,
  ...middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | IMiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchemaWithFragmentReplacements {
  return applyMiddlewareWithOptions(
    schema,
    { onlyDeclaredResolvers: true },
    ...middlewares,
  )
}
