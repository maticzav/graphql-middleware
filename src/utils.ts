import { GraphQLObjectType, GraphQLInterfaceType } from 'graphql'
import {
  IMiddlewareResolver,
  IMiddlewareWithFragment,
  IMiddlewareFunction,
  IMiddlewareGenerator,
} from './types'
import { MiddlewareGenerator } from './generator'

// Type checkers

export function isMiddlewareResolver<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareResolver<TSource, TContext, TArgs> {
  return (
    typeof obj === 'function' ||
    (typeof obj === 'object' && obj.then !== undefined)
  )
}

export function isMiddlewareWithFragment<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareWithFragment<TSource, TContext, TArgs> {
  return (
    typeof obj.fragment === 'string' &&
    (obj.resolve === undefined || isMiddlewareResolver(obj.resolve))
  )
}

export function isMiddlewareFunction<TSource, TContext, TArgs>(
  obj: any,
): obj is IMiddlewareFunction<TSource, TContext, TArgs> {
  return isMiddlewareWithFragment(obj) || isMiddlewareResolver(obj)
}

export function isMiddlewareGenerator<TSource, TContext, TArgs>(
  x: any,
): x is IMiddlewareGenerator<TSource, TContext, TArgs> {
  return x instanceof MiddlewareGenerator
}

export function isGraphQLObjectType(
  obj: any,
): obj is GraphQLObjectType | GraphQLInterfaceType {
  return obj instanceof GraphQLObjectType || obj instanceof GraphQLInterfaceType
}
