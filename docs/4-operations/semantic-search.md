---
sidebar_position: 6
---
# Semantic Search

Graphily supports vector-based semantic search, allowing users to query data based on meaning and context rather than exact keyword matches.

## How It Works

1. **Embedding Generation**: When new data is ingested (e.g., a document or profile description), an Action trigger fires and calls an external LLM to generate a vector embedding.
2. **Vector Storage**: This embedding is stored alongside the standard relational data.
3. **Similarity Query**: When a user executes a `semanticSearch` GraphQL query, Graphily converts their search string into a vector, and then performs a high-speed cosine similarity search in the database.

## Example Query

```graphql
query {
  articles(
    where: {
      content: {
        similarTo: "How to deploy Kubernetes"
      }
    }
    limit: 5
  ) {
    id
    title
    similarity_score
  }
}
```

:::tip Database Support
Semantic search capabilities depend on the underlying database engine. If you are using PostgreSQL, ensure `pgvector` is installed and enabled. For MySQL, ensure vector search capabilities are configured in your host environment.
:::
