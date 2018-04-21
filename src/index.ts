import {
  GraphQLSchema,
  getNamedType,
  getNullableType,
  isCompositeType,
  GraphQLCompositeType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLInterfaceType,
} from 'graphql'
import { addResolveFunctionsToSchema } from 'graphql-tools'
import { IResolvers } from 'graphql-tools/dist/Interfaces'
import {
  IMiddleware,
  IMiddlewareFunction,
  IMiddlewareTypeMap,
  IMiddlewareFieldMap,
} from './types'

// Type checks

function isMiddlewareFunction(obj: any): boolean {
  return (
    typeof obj === 'function' ||
    (typeof obj === 'object' && obj.then !== undefined)
  )
}

function isGraphQLObjectType(obj: any): boolean {
  return obj instanceof GraphQLObjectType || obj instanceof GraphQLInterfaceType
}

// Wrapper

function wrapResolverInMiddleware(
  resolver: GraphQLFieldResolver<any, any, any>,
  middleware: IMiddlewareFunction,
): GraphQLFieldResolver<any, any> {
  return (parent, args, ctx, info) => {
    return middleware(
      (_parent = parent, _args = args, _ctx = ctx, _info = info) =>
        resolver(_parent, _args, _ctx, _info),
      parent,
      args,
      ctx,
      info,
    )
  }
}

// Merge

function applyMiddlewareToField(
  field: GraphQLField<any, any, any>,
  middleware: IMiddlewareFunction,
): GraphQLFieldResolver<any, any, any> {
  let resolver = field.resolve

  if (field.subscribe) {
    resolver = field.subscribe
  }

  return wrapResolverInMiddleware(resolver, middleware)
}

function applyMiddlewareToType(
  type: GraphQLObjectType,
  middleware: IMiddlewareFunction | IMiddlewareFieldMap,
): IResolvers {
  const fieldMap = type.getFields()

  if (isMiddlewareFunction(middleware)) {
    const resolvers = Object.keys(fieldMap).reduce(
      (resolvers, field) => ({
        ...resolvers,
        [field]: applyMiddlewareToField(
          fieldMap[field],
          middleware as IMiddlewareFunction,
        ),
      }),
      {},
    )

    return resolvers
  } else {
    const resolvers = Object.keys(middleware).reduce(
      (resolvers, field) => ({
        ...resolvers,
        [field]: applyMiddlewareToField(fieldMap[field], middleware[field]),
      }),
      {},
    )

    return resolvers
  }
}

function applyMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IMiddlewareFunction,
): IResolvers {
  const typeMap = schema.getTypeMap()

  const resolvers = Object.keys(typeMap)
    .filter(type => isGraphQLObjectType(typeMap[type]))
    .reduce(
      (resolvers, type) => ({
        ...resolvers,
        [type]: applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          middleware,
        ),
      }),
      {},
    )

  return resolvers
}

// Generator

function generateResolverFromSchemaAndMiddleware(
  schema: GraphQLSchema,
  middleware: IMiddleware,
): IResolvers {
  if (isMiddlewareFunction(middleware)) {
    return applyMiddlewareToSchema(schema, middleware as IMiddlewareFunction)
  } else {
    const typeMap = schema.getTypeMap()

    const resolvers = Object.keys(middleware).reduce(
      (resolvers, type) => ({
        ...resolvers,
        [type]: applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          middleware[type],
        ),
      }),
      {},
    )

    return resolvers
  }
}

// Reducers

function addMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IMiddleware,
): GraphQLSchema {
  const resolvers = generateResolverFromSchemaAndMiddleware(schema, middleware)

  addResolveFunctionsToSchema(schema, resolvers)

  return schema
}

// Exposed functions

export function applyMiddleware(
  schema: GraphQLSchema,
  ...middlewares: IMiddleware[]
): GraphQLSchema {
  const schemaWithMiddleware = middlewares.reduce(
    (currentSchema, middleware) =>
      addMiddlewareToSchema(currentSchema, middleware),
    schema,
  )

  return schemaWithMiddleware
}
