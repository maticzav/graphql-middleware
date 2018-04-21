# GraphQL Middleware - Permissions example

This example illustrates how to use GraphQL Middleware to handle user permissions. Do take into consideration that this is a low level implementation with no optimizations. We recommend using `graphql-shield` for production usage.

## Code

> Mind the following parts

### Import

This is where we import `graphql-middleware`.

```js
const { applyMiddleware } = require('graphql-middleware')
```

### Permission function

This is where we decide whether the user should or shouldn't access the information. The following implementation preassumes that the secret is passed as the query header using `Authorization: <token>` format.

```js
const isLoggedIn = async (resolve, parent, args, ctx, info) => {
  // Include your agent code as Authorization: <token> header.
  const permit = ctx.request.get('Authorization') === code

  if (!permit) {
    throw new Error(`Not authorised!`)
  }

  return resolve()
}
```

### Middleware

The following middleware implements one field-scoped and one type-scoped middleware. We use `field` scoped middleware with `secured` field to ensure only `secured` field of `Query` requires authorisation. Furthermore, we also use `type` middleware to make sure every field of `Me` type requires authorisation.

There is no need to apply permissions to `me` field of `Query` as requesting any of type `Me` fields already requires authentication.

```js
const permissions = {
  Query: {
    secured: isLoggedIn,
  },
  Me: isLoggedIn,
}
```

### Applying middleware

This is the part where we modify the schema to reflect the changed middleware introduce.

```js
const protectedSchema = applyMiddleware(schema, permissions)
```

## License

MIT
