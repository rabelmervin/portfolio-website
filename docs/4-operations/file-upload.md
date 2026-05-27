---
sidebar_position: 5
---
# File Uploads

Handling multipart `form-data` and large binary blobs efficiently is critical for modern web applications. Graphily handles file uploads through a dedicated pipeline to avoid bloating the primary GraphQL JSON payload.

## Upload Architecture

1. **Gateway Intercept**: The Gateway component intercepts incoming `multipart/form-data` requests.
2. **Streaming**: Instead of buffering massive files into memory (which would crash the WASM sandbox), the Gateway streams the binary data directly to the configured storage backend (e.g., AWS S3, local disk).
3. **GraphQL Mutation**: Once the file is safely stored, the Gateway forwards a standard GraphQL mutation to the internal components, containing the newly generated file metadata (URL, size, mimetype).

## Usage Example

To upload a file, send a `POST` request with a `multipart/form-data` body, adhering to the [GraphQL Multipart Request Spec](https://github.com/jaydenseric/graphql-multipart-request-spec).

```bash
curl localhost:8080/graphql \
  -F operations='{ "query": "mutation($file: Upload!) { singleUpload(file: $file) { id } }", "variables": { "file": null } }' \
  -F map='{ "0": ["variables.file"] }' \
  -F 0=@my_image.png
```

:::info Storage Configuration
Ensure your custom host is configured with the correct cloud provider credentials so the Gateway can authenticate with your storage bucket.
:::
