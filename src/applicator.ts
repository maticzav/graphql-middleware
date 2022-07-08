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

function parseField(field: GraphQLField<any, any, any>) {
  const { deprecationReason, ...restData } = field
  const argsMap = field.args.reduce(
    (acc, cur) => ({
      ...acc,
      [cur.name]: cur,
    }),
    {} as Record<string, GraphQLArgument>,
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
  if (
    isMiddlewareWithFragment(middleware) &&
    parsedField.resolve &&
    parsedField.resolve !== defaultFieldResolver
  ) {
    return {
      ...parsedField,
      fragment: middleware.fragment,
      fragments: middleware.fragments,
      resolve: wrapResolverInMiddleware(
        parsedField.resolve,
        middleware.resolve,
      ),
    }
  } else if (isMiddlewareWithFragment(middleware) && parsedField.subscribe) {
    return {
      ...parsedField,
      fragment: middleware.fragment,
      fragments: middleware.fragments,
      subscribe: wrapResolverInMiddleware(
        parsedField.subscribe,
        middleware.resolve,
      ),
    }
  } else if (
    isMiddlewareResolver(middleware) &&
    parsedField.resolve &&
    parsedField.resolve !== defaultFieldResolver
  ) {
    return {
      ...parsedField,
      resolve: wrapResolverInMiddleware(parsedField.resolve, middleware),
    }
  } else if (isMiddlewareResolver(middleware) && parsedField.subscribe) {
    return {
      ...parsedField,
      subscribe: wrapResolverInMiddleware(parsedField.subscribe, middleware),
    }
  } else if (
    isMiddlewareWithFragment(middleware) &&
    !options.onlyDeclaredResolvers
  ) {
    return {
      ...parsedField,
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
      ...parsedField,
      resolve: wrapResolverInMiddleware(defaultFieldResolver, middleware),
    }
  } else {
    return { ...parsedField, resolve: defaultFieldResolver }
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
    .filter(
      (type) =>
        isGraphQLObjectType(typeMap[type]) &&
        !isIntrospectionType(typeMap[type]),
    )
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
