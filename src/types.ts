import {
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql'

export interface IResolverWithFragment<
  TSource = any,
  TContext = any,
  TArgs = any
> {
  fragment: string
  resolve: GraphQLFieldResolver<TSource, TContext, TArgs>
}

export declare type IMiddlewareResolver<
  TSource = any,
  TContext = any,
  TArgs = any
> = (
  resolve: GraphQLFieldResolver<TSource, TContext, TArgs>,
  parent: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<any>

export interface IMiddlewareFunctionWithFragment<
  TSource = any,
  TContext = any,
  TArgs = any
> {
  fragment: string
  resolve: IMiddlewareResolver<TSource, TContext, TArgs>
}

export type IMiddlewareFunction<TSource = any, TContext = any, TArgs = any> =
  | IMiddlewareResolver<TSource, TContext, TArgs>
  | IMiddlewareFunctionWithFragment<TSource, TContext, TArgs>

export interface IMiddlewareTypeMap<
  TSource = any,
  TContext = any,
  TArgs = any
> {
  [key: string]:
    | IMiddlewareFunction<TSource, TContext, TArgs>
    | IMiddlewareFieldMap<TSource, TContext, TArgs>
}

export interface IMiddlewareFieldMap<
  TSource = any,
  TContext = any,
  TArgs = any
> {
  [key: string]: IMiddlewareFunction<TSource, TContext, TArgs>
}

export declare type IMiddlewareGenerator<TSource, TContext, TArgs> = (
  schema: GraphQLSchema,
) => IMiddleware<TSource, TContext, TArgs>

export declare type IMiddleware<TSource = any, TContext = any, TArgs = any> =
  | IMiddlewareFunction<TSource, TContext, TArgs>
  | IMiddlewareTypeMap<TSource, TContext, TArgs>
