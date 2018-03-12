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
  IFieldMiddlewareFunction,
  IFieldMiddlewareTypeMap,
  IFieldMiddlewareFieldMap
} from "./types";

// Type checks

function isMiddlewareFunction(obj: any): boolean {
  return (
    typeof obj === "function" ||
    (typeof obj === "object" && obj.then !== undefined)
  );
}

function isGraphQLObjectType(obj: any): boolean {
  return obj._fields !== undefined;
}

//

function wrapResolverInMiddleware(
  resolver: GraphQLFieldResolver<any, any, any>,
  middleware: IFieldMiddlewareFunction
): GraphQLFieldResolver<any, any> {
  return (parent, args, ctx, info) => {
    return middleware(resolver, parent, args, ctx, info);
  };
}

// Merge

function applyMiddlewareToField(
  field: GraphQLField<any, any, any>,
  middleware: IFieldMiddlewareFunction
): GraphQLFieldResolver<any, any, any> {
  let resolver = field.resolve;

  if (field.subscribe) {
    resolver = field.subscribe;
  }

  return wrapResolverInMiddleware(resolver, middleware);
}

function applyMiddlewareToType(
  type: GraphQLObjectType,
  middleware: IFieldMiddlewareFunction | IFieldMiddlewareFieldMap
): IResolvers {
  let resolvers = {};
  const fieldMap = type.getFields();

  Object.keys(fieldMap).forEach(field => {
    if (isMiddlewareFunction(middleware)) {
      resolvers[field] = applyMiddlewareToField(
        fieldMap[field],
        middleware as IFieldMiddlewareFunction
      );
    } else {
      resolvers[field] = applyMiddlewareToField(
        fieldMap[field],
        middleware[field]
      );
    }
  });

  return resolvers;
}

function applyMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IFieldMiddlewareFunction
): IResolvers {
  let resolvers = {};
  const typeMap = schema.getTypeMap();

  Object.keys(typeMap)
    .filter(type => isGraphQLObjectType(typeMap[type]))
    .forEach(type => {
      resolvers[type] = applyMiddlewareToType(
        typeMap[type] as GraphQLObjectType,
        middleware
      );
    });

  return resolvers;
}

// Generator

function generateResolverFromSchemaAndMiddleware(
  schema: GraphQLSchema,
  middleware: IFieldMiddleware
): IResolvers {
  let resolvers = {};

  if (isMiddlewareFunction(middleware)) {
    resolvers = applyMiddlewareToSchema(
      schema,
      middleware as IFieldMiddlewareFunction
    );
  } else {
    const typeMap = schema.getTypeMap();

    Object.keys(middleware).forEach(type => {
      resolvers[type] = applyMiddlewareToType(
        typeMap[type] as GraphQLObjectType,
        middleware[type]
      );
    });
  }

  return resolvers;
}

function addMiddlewareToSchema(
  schema: GraphQLSchema,
  middleware: IFieldMiddleware
): GraphQLSchema {
  const resolvers = generateResolverFromSchemaAndMiddleware(schema, middleware);

  return mergeSchemas({
    schemas: [schema],
    resolvers
  });
}

// Exposed functions

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
