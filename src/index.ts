import {
  defaultFieldResolver,
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

export { IMiddleware }

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
    const resolveFn = resolver || defaultFieldResolver

    return middleware(
      (_parent = parent, _args = args, _ctx = ctx, _info = info) =>
        resolveFn(_parent, _args, _ctx, _info),
      parent,
      args,
      ctx,
      info,
    )
  }
}

// Validation

function validateMiddleware(
  schema: GraphQLSchema,
  middleware: IMiddleware,
): IMiddleware {
  if (isMiddlewareFunction(middleware)) {
    return middleware
  }

  const types = schema.getTypeMap()

  Object.keys(middleware).forEach(type => {
    if (!Object.keys(types).includes(type)) {
      throw new MiddlewareError(
        `Type ${type} exists in middleware but is missing in Schema.`,
      )
    }

    if (!isMiddlewareFunction(middleware[type])) {
      const fields = (types[type] as
        | GraphQLObjectType
        | GraphQLInterfaceType).getFields()

      Object.keys(middleware[type]).forEach(field => {
        if (!Object.keys(fields).includes(field)) {
          throw new MiddlewareError(
            `Field ${type}.${field} exists in middleware but is missing in Schema.`,
          )
        }

        if (!isMiddlewareFunction(middleware[type][field])) {
          throw new MiddlewareError(
            `Expected ${type}.${field} to be a function but found ` +
              typeof middleware[type][field],
          )
        }
      })
    }
  })

  return middleware
}

export class MiddlewareError extends Error {
  constructor(...props) {
    super(...props)
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
  const validMiddleware = validateMiddleware(schema, middleware)
  const resolvers = generateResolverFromSchemaAndMiddleware(
    schema,
    validMiddleware,
  )
  addResolveFunctionsToSchema({
    schema,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
  })

  return schema
}

// Exposed functions

export function applyMiddleware(
  schema: GraphQLSchema,
  ...middleware: IMiddleware[]
): GraphQLSchema {
  const schemaWithMiddleware = middleware.reduce(
    (currentSchema, middleware) =>
      addMiddlewareToSchema(currentSchema, middleware),
    schema,
  )

  return schemaWithMiddleware
}
