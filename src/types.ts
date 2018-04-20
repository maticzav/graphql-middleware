import { GraphQLResolveInfo, GraphQLFieldResolver, GraphQLField } from 'graphql'

export type IMiddlewareFunction = (
  resolve: GraphQLFieldResolver<any, any>,
  parent: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo,
) => Promise<any>

export interface IMiddlewareTypeMap {
  [key: string]: IMiddlewareFunction | IMiddlewareFieldMap
}

export interface IMiddlewareFieldMap {
  [key: string]: IMiddlewareFunction
}

export type IMiddleware = IMiddlewareFunction | IMiddlewareTypeMap
