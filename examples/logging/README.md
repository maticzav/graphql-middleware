# GraphQL Middleware - Logging example

This example illustrates basic usage of GraphQL Middleware. The idea is to log every field that has been requested by user.

## Code

> Mind the following parts

### Import

This is where we import `graphql-middleware-tool`.

```js
const { applyMiddleware } = require('graphql-middlewar-tool')
```

### Middleware

Because we want every field of our schema to make a log once it's requested, we use `schema` wide middleware definition.

```js
const logMiddleware = async (resolve, parent, args, ctx, info) => {
  console.log(args, info)
  return resolve()
}
```

### Applying middleware

This is the part where we modify the schema to reflect the changed middleware introduce.

```js
const analysedSchema = applyMiddleware(schema, logMiddleware)
```

## License

MIT
