import { GraphQLResolveInfo, GraphQLSchema } from 'graphql'

// Middleware

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

export declare type IApplyOptions = {
  onlyDeclaredResolvers: boolean
}

export declare type GraphQLSchemaWithFragmentReplacements = GraphQLSchema & {
  schema?: GraphQLSchema
  fragmentReplacements?: FragmentReplacement[]
}

export interface FragmentReplacement {
  field: string
  fragment: string
}
