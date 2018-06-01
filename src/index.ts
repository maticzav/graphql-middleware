import {
  defaultFieldResolver,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLInterfaceType,
} from 'graphql'
import { addResolveFunctionsToSchema } from 'graphql-tools'
import { IResolvers } from 'graphql-tools/dist/Interfaces'
import {
  IApplyOptions,
  IMiddleware,
  IMiddlewareFunction,
  IMiddlewareTypeMap,
  IMiddlewareFieldMap,
  IMiddlewareGenerator,
} from './types'

export {
  IMiddleware,
  IMiddlewareTypeMap,
  IMiddlewareFieldMap,
  IMiddlewareFunction,
  IMiddlewareGenerator,
}

// Classes

export class MiddlewareGenerator<TSource, TContext, TArgs> {
  private generator: IMiddlewareGenerator<TSource, TContext, TArgs>

  constructor(generator: IMiddlewareGenerator<TSource, TContext, TArgs>) {
    this.generator = generator
  }

  generate(schema: GraphQLSchema): IMiddleware<TSource, TContext, TArgs> {
    return this.generator(schema)
  }
}

// Type checks

function isMiddlewareFunction<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareFunction<TSource, TContext, TArgs> {
  return (
    typeof obj === 'function' ||
    (typeof obj === 'object' && obj.then !== undefined)
  )
}

function isMiddlewareGenerator<TSource, TContext, TArgs>(
  x: any,
): x is MiddlewareGenerator<TSource, TContext, TArgs> {
  return x instanceof MiddlewareGenerator
}

function isGraphQLObjectType(
  obj: any,
): obj is GraphQLObjectType | GraphQLInterfaceType {
  return obj instanceof GraphQLObjectType || obj instanceof GraphQLInterfaceType
}

// Wrappers

export function middleware<TSource = any, TContext = any, TArgs = any>(
  generator: IMiddlewareGenerator<TSource, TContext, TArgs>,
): MiddlewareGenerator<TSource, TContext, TArgs> {
  return new MiddlewareGenerator(generator)
}

function wrapResolverInMiddleware<TSource, TContext, TArgs>(
  resolver: GraphQLFieldResolver<any, any, any>,
  options: IApplyOptions,
  middleware: IMiddlewareFunction<TSource, TContext, TArgs>,
): GraphQLFieldResolver<any, any, any> {
  if (options.onlyDeclaredResolvers && !resolver) {
    return defaultFieldResolver
  }

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

function validateMiddleware<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  middleware: IMiddleware<TSource, TContext, TArgs>,
): IMiddleware<TSource, TContext, TArgs> {
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

function applyMiddlewareToField<TSource, TContext, TArgs>(
  field: GraphQLField<any, any, any>,
  options: IApplyOptions,
  middleware: IMiddlewareFunction<TSource, TContext, TArgs>,
):
  | GraphQLFieldResolver<any, any, any>
  | { subscribe: GraphQLFieldResolver<any, any, any> } {
  if (field.subscribe) {
    return {
      subscribe: wrapResolverInMiddleware(field.subscribe, options, middleware),
    }
  }

  return wrapResolverInMiddleware(field.resolve, options, middleware)
}

function applyMiddlewareToType<TSource, TContext, TArgs>(
  type: GraphQLObjectType,
  options: IApplyOptions,
  middleware:
    | IMiddlewareFunction<TSource, TContext, TArgs>
    | IMiddlewareFieldMap<TSource, TContext, TArgs>,
): IResolvers {
  const fieldMap = type.getFields()

  if (isMiddlewareFunction(middleware)) {
    const resolvers = Object.keys(fieldMap).reduce(
      (resolvers, field) => ({
        ...resolvers,
        [field]: applyMiddlewareToField(
          fieldMap[field],
          options,
          middleware as IMiddlewareFunction<TSource, TContext, TArgs>,
        ),
      }),
      {},
    )

    return resolvers
  } else {
    const resolvers = Object.keys(middleware).reduce(
      (resolvers, field) => ({
        ...resolvers,
        [field]: applyMiddlewareToField(
          fieldMap[field],
          options,
          middleware[field],
        ),
      }),
      {},
    )

    return resolvers
  }
}

function applyMiddlewareToSchema<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  options: IApplyOptions,
  middleware: IMiddlewareFunction<TSource, TContext, TArgs>,
): IResolvers {
  const typeMap = schema.getTypeMap()

  const resolvers = Object.keys(typeMap)
    .filter(type => isGraphQLObjectType(typeMap[type]))
    .reduce(
      (resolvers, type) => ({
        ...resolvers,
        [type]: applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          options,
          middleware,
        ),
      }),
      {},
    )

  return resolvers
}

// Generator

function generateResolverFromSchemaAndMiddleware<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  options: IApplyOptions,
  middleware: IMiddleware<TSource, TContext, TArgs>,
): IResolvers {
  if (isMiddlewareFunction(middleware)) {
    return applyMiddlewareToSchema(
      schema,
      options,
      middleware as IMiddlewareFunction<TSource, TContext, TArgs>,
    )
  } else {
    const typeMap = schema.getTypeMap()

    const resolvers = Object.keys(middleware).reduce(
      (resolvers, type) => ({
        ...resolvers,
        [type]: applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          options,
          middleware[type],
        ),
      }),
      {},
    )

    return resolvers
  }
}

// Reducers

function addMiddlewareToSchema<TSource, TContext, TArgs>(
  schema: GraphQLSchema,
  options: IApplyOptions,
  middleware: IMiddleware<TSource, TContext, TArgs>,
): GraphQLSchema {
  const validMiddleware = validateMiddleware(schema, middleware)
  const resolvers = generateResolverFromSchemaAndMiddleware(
    schema,
    options,
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

function applyMiddlewareWithOptions<TSource = any, TContext = any, TArgs = any>(
  schema: GraphQLSchema,
  options: IApplyOptions,
  ...middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | MiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchema {
  const normalisedMiddlewares = middlewares.map(middleware => {
    if (isMiddlewareGenerator(middleware)) {
      return middleware.generate(schema)
    } else {
      return middleware
    }
  })

  const schemaWithMiddleware = normalisedMiddlewares.reduceRight(
    (currentSchema, middleware) =>
      addMiddlewareToSchema(currentSchema, options, middleware),
    schema,
  )

  return schemaWithMiddleware
}

// Exposed functions

export function applyMiddleware<TSource = any, TContext = any, TArgs = any>(
  schema: GraphQLSchema,
  ...middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | MiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchema {
  return applyMiddlewareWithOptions(schema, {}, ...middlewares)
}

export function applyMiddlewareToDeclaredResolvers<
  TSource = any,
  TContext = any,
  TArgs = any
>(
  schema: GraphQLSchema,
  ...middlewares: (
    | IMiddleware<TSource, TContext, TArgs>
    | MiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchema {
  return applyMiddlewareWithOptions(
    schema,
    { onlyDeclaredResolvers: true },
    ...middlewares,
  )
}
