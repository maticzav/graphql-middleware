import {
  GraphQLResolveInfo,
  GraphQLFieldResolver,
  GraphQLField
} from "graphql";

export type IFieldMiddlewareFunction = (
  resolve: GraphQLFieldResolver<any, any>,
  parent: any,
  args: any,
  context: any,
  info: GraphQLResolveInfo
) => Promise<any>;

export interface IFieldMiddlewareTypeMap {
  [key: string]: IFieldMiddlewareFunction | IFieldMiddlewareFieldMap;
}

export interface IFieldMiddlewareFieldMap {
  [key: string]: IFieldMiddlewareFunction;
}

export type IFieldMiddleware =
  | IFieldMiddlewareFunction
  | IFieldMiddlewareTypeMap;

export interface GraphQLResponse {
  data: any;
  errors?: any[];
  extensions?: any;
}

export type IDocumentMiddlewareFunction = (
  execute: Function,
  rootValue: any,
  context: any,
  info: GraphQLResolveInfo
) => Promise<GraphQLResponse>;
