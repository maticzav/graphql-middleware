import {
  defaultFieldResolver,
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLField,
  GraphQLFieldResolver,
  GraphQLInterfaceType,
} from 'graphql'
import {
  addResolveFunctionsToSchema,
  transformSchema,
  ReplaceFieldWithFragment,
} from 'graphql-tools'
import { IResolvers, IResolverOptions } from 'graphql-tools/dist/Interfaces'
import {
  IApplyOptions,
  IMiddleware,
  IMiddlewareFunction,
  IMiddlewareTypeMap,
  IMiddlewareFieldMap,
  IMiddlewareGenerator,
  IMiddlewareResolver,
  IMiddlewareWithFragment,
  FragmentReplacement,
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

function isMiddlewareResolver<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareResolver<TSource, TContext, TArgs> {
  return (
    typeof obj === 'function' ||
    (typeof obj === 'object' && obj.then !== undefined)
  )
}

function isMiddlewareWithFragment<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareWithFragment<TSource, TContext, TArgs> {
  return (
    typeof obj.fragment === 'string' &&
    (obj.resolve === undefined || isMiddlewareResolver(obj.resolve))
  )
}

function isMiddlewareFunction<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareFunction<TSource, TContext, TArgs> {
  return isMiddlewareWithFragment(obj) || isMiddlewareResolver(obj)
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

// Constructors

export function middleware<TSource = any, TContext = any, TArgs = any>(
  generator: IMiddlewareGenerator<TSource, TContext, TArgs>,
): MiddlewareGenerator<TSource, TContext, TArgs> {
  return new MiddlewareGenerator(generator)
}

// Extractors

export function extractFragmentReplacements(
  resolvers: IResolvers,
): FragmentReplacement[] {
  const fragmentReplacements: FragmentReplacement[] = []

  for (const typeName in resolvers) {
    const fieldResolvers: any = resolvers[typeName]
    for (const fieldName in fieldResolvers) {
      const fieldResolver = fieldResolvers[fieldName]
      if (typeof fieldResolver === 'object' && fieldResolver.fragment) {
        fragmentReplacements.push({
          field: fieldName,
          fragment: fieldResolver.fragment,
        })
      }
    }
  }

  return fragmentReplacements
}

// Wrappers

function wrapResolverInMiddleware<TSource, TContext, TArgs>(
  resolver: GraphQLFieldResolver<any, any, any>,
  middleware: IMiddlewareResolver<TSource, TContext, TArgs>,
): GraphQLFieldResolver<any, any, any> {
  return (parent, args, ctx, info) =>
    middleware(
      (_parent = parent, _args = args, _ctx = ctx, _info = info) =>
        resolver(_parent, _args, _ctx, _info),
      parent,
      args,
      ctx,
      info,
    )
}

// Merge

function applyMiddlewareToField<TSource, TContext, TArgs>(
  field: GraphQLField<any, any, any>,
  options: IApplyOptions,
  middleware: IMiddlewareFunction<TSource, TContext, TArgs>,
): IResolverOptions {
  if (!field.subscribe && !field.resolve && options.onlyDeclaredResolvers) {
    return { resolve: defaultFieldResolver }
  } else if (isMiddlewareWithFragment(middleware) && field.subscribe) {
    return {
      fragment: middleware.fragment,
      subscribe: wrapResolverInMiddleware(field.subscribe, middleware.resolve),
    }
  } else if (isMiddlewareWithFragment(middleware) && field.resolve) {
    return {
      fragment: middleware.fragment,
      resolve: wrapResolverInMiddleware(field.resolve, middleware.resolve),
    }
  } else if (isMiddlewareResolver(middleware) && field.subscribe) {
    return { subscribe: wrapResolverInMiddleware(field.subscribe, middleware) }
  } else if (isMiddlewareResolver(middleware) && field.resolve) {
    return { resolve: wrapResolverInMiddleware(field.resolve, middleware) }
  } else {
    return { resolve: defaultFieldResolver }
  }
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

  const fragmentReplacements = extractFragmentReplacements(resolvers)

  addResolveFunctionsToSchema({
    schema,
    resolvers,
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
  })

  const schemaWithFragments = transformSchema(schema, [
    new ReplaceFieldWithFragment(schema, fragmentReplacements),
  ])

  return schemaWithFragments
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
    | MiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchema {
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
    | MiddlewareGenerator<TSource, TContext, TArgs>)[]
): GraphQLSchema {
  return applyMiddlewareWithOptions(
    schema,
    { onlyDeclaredResolvers: true },
    ...middlewares,
  )
}
