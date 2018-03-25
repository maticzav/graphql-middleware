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
import { mergeSchemas } from 'graphql-tools'
import { IResolvers } from 'graphql-tools/dist/Interfaces'
import {
  IDocumentMiddlewareFunction,
  IFieldMiddleware,
  IFieldMiddlewareFunction,
  IFieldMiddlewareTypeMap,
  IFieldMiddlewareFieldMap,
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
  middleware: IFieldMiddlewareFunction,
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

// Inspired by graphql-tools.
function transformDocumentMiddlewareToFieldMiddleware(
  middleware: IDocumentMiddlewareFunction,
): IFieldMiddlewareFunction {
  let value = null
  const randomNumber = Math.random()

  return async (resolve, parent, args, ctx, info) => {
    if (!info.operation['__runAtMostOnce']) {
      info.operation['__runAtMostOnce'] = {}
    }

    if (!info.operation['__runAtMostOnce'][randomNumber]) {
      info.operation['__runAtMostOnce'][randomNumber] = true
      value = await middleware(resolve, parent, ctx, info)
      return value
    }

    return value
  }
}

// Merge

function applyMiddlewareToField(
  field: GraphQLField<any, any, any>,
  middleware: IFieldMiddlewareFunction,
): GraphQLFieldResolver<any, any, any> {
  let resolver = field.resolve

  if (field.subscribe) {
    resolver = field.subscribe
  }

  return wrapResolverInMiddleware(resolver, middleware)
}

function applyMiddlewareToType(
  type: GraphQLObjectType,
  middleware: IFieldMiddlewareFunction | IFieldMiddlewareFieldMap,
): IResolvers {
  const fieldMap = type.getFields()

  if (isMiddlewareFunction(middleware)) {
    const resolvers = Object.keys(fieldMap).reduce(
      (resolvers, field) => ({
        ...resolvers,
        [field]: applyMiddlewareToField(
          fieldMap[field],
          middleware as IFieldMiddlewareFunction,
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
  middleware: IFieldMiddlewareFunction,
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

function generateResolverFromSchemaAndFieldMiddleware(
  schema: GraphQLSchema,
  middleware: IFieldMiddleware,
): IResolvers {
  if (isMiddlewareFunction(middleware)) {
    return applyMiddlewareToSchema(
      schema,
      middleware as IFieldMiddlewareFunction,
    )
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

function generateResolverFromSchemaAndDocumentMiddleware(
  schema: GraphQLSchema,
  middleware: IDocumentMiddlewareFunction,
): IResolvers {
  const typeMap = {
    Query: schema.getQueryType(),
    Mutation: schema.getMutationType(),
    Subscription: schema.getSubscriptionType(),
  }

  const resolvers = Object.keys(typeMap)
    .filter(type => isGraphQLObjectType(typeMap[type]))
    .reduce(
      (resolvers, type) => ({
        ...resolvers,
        [type]: applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          transformDocumentMiddlewareToFieldMiddleware(middleware),
        ),
      }),
      {},
    )

  return {}
}

// Reducers

function addFieldMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IFieldMiddleware,
): GraphQLSchema {
  const resolvers = generateResolverFromSchemaAndFieldMiddleware(
    schema,
    middleware,
  )

  return mergeSchemas({
    schemas: [schema],
    resolvers,
  })
}

function addDocumentMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IDocumentMiddlewareFunction,
): GraphQLSchema {
  const resolvers = generateResolverFromSchemaAndDocumentMiddleware(
    schema,
    middleware,
  )

  return mergeSchemas({
    schemas: [schema],
    resolvers,
  })
}

// Exposed functions

export function applyFieldMiddleware(
  schema: GraphQLSchema,
  ...middlewares: IFieldMiddleware[]
): GraphQLSchema {
  const schemaWithMiddleware = middlewares.reduce(
    (currentSchema, middleware) =>
      addFieldMiddlewareToSchema(currentSchema, middleware),
    schema,
  )

  return schemaWithMiddleware
}

export function applyDocumentMiddleware(
  schema: GraphQLSchema,
  ...middlewares: IDocumentMiddlewareFunction[]
): GraphQLSchema {
  const schemaWithMiddleware = middlewares.reduce(
    (currentSchema, middleware) =>
      addDocumentMiddlewareToSchema(currentSchema, middleware),
    schema,
  )

  return schemaWithMiddleware
}
