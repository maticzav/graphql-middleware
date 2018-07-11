import {
  GraphQLFieldResolver,
  GraphQLResolveInfo,
  GraphQLSchema,
} from 'graphql'
import { FragmentReplacement } from 'graphql-binding'

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

export interface IMiddlewareWithFragment<
  TSource = any,
  TContext = any,
  TArgs = any
> {
  fragment: string
  resolve?: IMiddlewareResolver<TSource, TContext, TArgs>
}

export type IMiddlewareFunction<TSource = any, TContext = any, TArgs = any> =
  | IMiddlewareWithFragment<TSource, TContext, TArgs>
  | IMiddlewareResolver<TSource, TContext, TArgs>

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

export declare type IMiddlewareGenerator<
  TSource = any,
  TContext = any,
  TArgs = any
> = (schema: GraphQLSchema) => IMiddleware<TSource, TContext, TArgs>

export declare type IMiddleware<TSource = any, TContext = any, TArgs = any> =
  | IMiddlewareFunction<TSource, TContext, TArgs>
  | IMiddlewareTypeMap<TSource, TContext, TArgs>

export declare type IApplyOptions = {
  onlyDeclaredResolvers: boolean
}

export interface GraphQLSchemaWithFragmentReplacements {
  schema: GraphQLSchema
  fragmentReplacements: FragmentReplacement[]
}
