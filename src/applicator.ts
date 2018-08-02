import {
  GraphQLObjectType,
  GraphQLFieldResolver,
  GraphQLField,
  GraphQLSchema,
  defaultFieldResolver,
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

function applyMiddlewareToField<TSource, TContext, TArgs>(
  field: GraphQLField<any, any, any>,
  options: IApplyOptions,
  middleware: IMiddlewareFunction<TSource, TContext, TArgs>,
): IResolverOptions {
  if (isMiddlewareWithFragment(middleware) && field.resolve) {
    return {
      fragment: middleware.fragment,
      fragments: middleware.fragments,
      resolve: wrapResolverInMiddleware(field.resolve, middleware.resolve),
    }
  } else if (isMiddlewareWithFragment(middleware) && field.subscribe) {
    return {
      fragment: middleware.fragment,
      fragments: middleware.fragments,
      subscribe: wrapResolverInMiddleware(field.subscribe, middleware.resolve),
    }
  } else if (isMiddlewareResolver(middleware) && field.resolve) {
    return { resolve: wrapResolverInMiddleware(field.resolve, middleware) }
  } else if (isMiddlewareResolver(middleware) && field.subscribe) {
    return { subscribe: wrapResolverInMiddleware(field.subscribe, middleware) }
  } else if (
    isMiddlewareWithFragment(middleware) &&
    !options.onlyDeclaredResolvers
  ) {
    return {
      fragment: middleware.fragment,
      fragments: middleware.fragments,
      resolve: wrapResolverInMiddleware(
        defaultFieldResolver,
        middleware.resolve,
      ),
    }
  } else if (
    isMiddlewareResolver(middleware) &&
    !options.onlyDeclaredResolvers
  ) {
    return {
      resolve: wrapResolverInMiddleware(defaultFieldResolver, middleware),
    }
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
      (resolvers, fieldName) => ({
        ...resolvers,
        [fieldName]: applyMiddlewareToField(
          fieldMap[fieldName],
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

export function generateResolverFromSchemaAndMiddleware<
  TSource,
  TContext,
  TArgs
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
