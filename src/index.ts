import {
  GraphQLSchema,
  getNamedType,
  getNullableType,
  isCompositeType,
  GraphQLCompositeType,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLField,
  GraphQLFieldResolver
} from "graphql";
import { mergeSchemas } from "graphql-tools";
import { IResolvers } from "graphql-tools/dist/Interfaces";
import {
  IDocumentMiddlewareFunction,
  IFieldMiddleware,
  IFieldMiddlewareFunction
} from "./types";

function wrapResolverInMiddleware(
  resolver: GraphQLField<any, any>,
  middleware: IFieldMiddlewareFunction
): GraphQLFieldResolver<any, any> {
  return (parent, args, ctx, info) => {
    return middleware(resolver, parent, args, ctx, info);
  };
}

function generateResolverFromSchemaAndMiddleware(
  schema: GraphQLSchema,
  middleware: IFieldMiddleware
): IResolvers {
  let resolvers = {};
  const typeMap = schema.getTypeMap();

  Object.keys(middleware).forEach(type => {
    resolvers[type] = mergeResolvers(typeMap[type], middleware[type]);
  });

  return resolvers;
}

function addMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IFieldMiddleware
): GraphQLSchema {
  const resolvers = generateResolverFromSchemaAndMiddleware(
    schema, 
    middleware
  );

  return mergeSchemas({
    schemas: [schema],
    resolvers
  });
}

export function applyFieldMiddleware(
  schema: GraphQLSchema,
  ...middlewares: IFieldMiddleware[]
): GraphQLSchema {
  const schemaWithMiddleware = middlewares.reduce(
    (currentSchema, middleware) =>
      addMiddlewareToSchema(currentSchema, middleware),
    schema
  );

  return schemaWithMiddleware;
}

export function applyDocumentMiddleware(
  schema: GraphQLSchema,
  ...middlewares: IDocumentMiddlewareFunction[]
): GraphQLSchema {
  return null;
}
