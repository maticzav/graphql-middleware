import {
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql'

export declare type IMiddlewareFunction<
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
