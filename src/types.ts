import {
  GraphQLField,
  GraphQLResolveInfo,
  GraphQLSchema,
  GraphQLTypeResolver,
  GraphQLIsTypeOfFn,
} from 'graphql'
import { MergeInfo } from 'graphql-tools'

// Middleware Tree

export declare type IMiddlewareFragment = string

export declare type IMiddlewareResolver<
  TSource = any,
  TContext = any,
  TArgs = any
> = (
  resolve: Function,
  parent: TSource,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo,
) => Promise<any>

export interface IMiddlewareWithOptions<
  TSource = any,
  TContext = any,
  TArgs = any
> {
  fragment?: IMiddlewareFragment
  fragments?: IMiddlewareFragment[]
  resolve?: IMiddlewareResolver<TSource, TContext, TArgs>
}

export type IMiddlewareFunction<TSource = any, TContext = any, TArgs = any> =
  | IMiddlewareWithOptions<TSource, TContext, TArgs>
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

// Middleware Generator

export declare class IMiddlewareGenerator<TSource, TContext, TArgs> {
  constructor(
    generator: IMiddlewareGeneratorConstructor<TSource, TContext, TArgs>,
  )
  generate(schema: GraphQLSchema): IMiddleware<TSource, TContext, TArgs>
}

export declare type IMiddlewareGeneratorConstructor<
  TSource = any,
  TContext = any,
  TArgs = any
> = (schema: GraphQLSchema) => IMiddleware<TSource, TContext, TArgs>

export declare type IMiddleware<TSource = any, TContext = any, TArgs = any> =
  | IMiddlewareFunction<TSource, TContext, TArgs>
  | IMiddlewareTypeMap<TSource, TContext, TArgs>

// Middleware

export declare type IApplyOptions = {
  onlyDeclaredResolvers: boolean
}

export declare type GraphQLSchemaWithFragmentReplacements = GraphQLSchema & {
  schema?: GraphQLSchema
  fragmentReplacements?: FragmentReplacement[]
}

// Fragments (inspired by graphql-tools)

export interface FragmentReplacement {
  field: string
  fragment: string
}

export interface IResolvers<TSource = any, TContext = any> {
  [key: string]: IResolverObject<TSource, TContext>
}

export interface IResolverObject<TSource = any, TContext = any> {
  [key: string]:
    | IFieldResolver<TSource, TContext>
    | IResolverOptions<TSource, TContext>
}

export interface IResolverOptions<TSource = any, TContext = any>
  extends GraphQLField<any, any, any> {
  fragment?: string
  fragments?: string[]
  resolve?: IFieldResolver<TSource, TContext>
  subscribe?: IFieldResolver<TSource, TContext>
  __resolveType?: GraphQLTypeResolver<TSource, TContext>
  __isTypeOf?: GraphQLIsTypeOfFn<TSource, TContext>
}

export type IFieldResolver<TSource, TContext> = (
  source: TSource,
  args: { [argument: string]: any },
  context: TContext,
  info: GraphQLResolveInfo & { mergeInfo: MergeInfo },
) => any
