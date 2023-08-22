import {
  GraphQLObjectType,
  GraphQLFieldResolver,
  GraphQLField,
  GraphQLSchema,
  defaultFieldResolver,
  isIntrospectionType,
  GraphQLArgument,
} from 'graphql'
import {
  IMiddlewareFunction,
  IMiddlewareResolver,
  IMiddlewareFieldMap,
  IApplyOptions,
  IMiddleware,
  IResolvers,
  IResolverOptions,
} from './types'
import {
  isMiddlewareFunction,
  isGraphQLObjectType,
  isMiddlewareResolver,
  isMiddlewareWithFragment,
} from './utils'

// Applicator

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

function parseField(
  field: GraphQLField<any, any, any> & { isDeprecated?: boolean },
) {
  const { isDeprecated, ...restData } = field
  const argsMap = field.args.reduce(
    (acc, cur) => {
      acc[cur.name] = cur;
      return acc;
    }, {} as Record<string, GraphQLArgument>,
  )
  return {
    ...restData,
    args: argsMap,
  }
}

function applyMiddlewareToField<TSource, TContext, TArgs>(
  field: GraphQLField<any, any, any>,
  options: IApplyOptions,
  middleware: IMiddlewareFunction<TSource, TContext, TArgs>,
): IResolverOptions {
  const parsedField = parseField(field)
  
  const resolve = options.onlyDeclaredResolvers
    ? field.resolve !== defaultFieldResolver
      ? parsedField.resolve
      : null
    : field.resolve || defaultFieldResolver

  const subscribe = parsedField.subscribe

  if (resolve || subscribe) {
    let update = null
    let middlewareResolve = null

    if (isMiddlewareWithFragment(middleware)) {
      update = {}
      update.fragment = middleware.fragment
      update.fragments = middleware.fragments
      middlewareResolve = middleware.resolve
    } else if (isMiddlewareResolver(middleware)) {
      update = {}
      middlewareResolve = middleware
    }

    if (middlewareResolve) {
      if (resolve) {
        update.resolve = wrapResolverInMiddleware(resolve, middlewareResolve)
      }
      if (subscribe) {
        update.subscribe = wrapResolverInMiddleware(
          subscribe,
          middlewareResolve,
        )
      }
      return { ...parsedField, ...update }
    } else {
      return parsedField
    }
  } else {
    return parsedField
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
      (resolvers, fieldName) => {
        resolvers[fieldName] = applyMiddlewareToField(
          fieldMap[fieldName],
          options,
          middleware as IMiddlewareFunction<TSource, TContext, TArgs>,
        );
        return resolvers;
      },
      {},
    )

    return resolvers
  } else {
    const resolvers = Object.keys(middleware).reduce(
      (resolvers, fieldName) => {
        resolvers[fieldName] = applyMiddlewareToField(
          fieldMap[fieldName],
          options,
          middleware[fieldName],
        );
        return resolvers;
      },
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
    .filter(
      (type) =>
        isGraphQLObjectType(typeMap[type]) &&
        !isIntrospectionType(typeMap[type]),
    )
    .reduce(
      (resolvers, type) => {
        resolvers[type] = applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          options,
          middleware,
        );
        return resolvers;
      },
      {},
    )

  return resolvers
}

// Generator

export function generateResolverFromSchemaAndMiddleware<
  TSource,
  TContext,
  TArgs,
>(
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
      (resolvers, type) => {
        resolvers[type] = applyMiddlewareToType(
          typeMap[type] as GraphQLObjectType,
          options,
          middleware[type],
        );
        return resolvers;
      },
      {},
    )

    return resolvers
  }
}
