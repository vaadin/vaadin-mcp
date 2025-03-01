# Deployment Guide for Vaadin Documentation Projects

This guide explains how to deploy both the `docs-ingestion` and `mcp-server` projects to fly.io.

## Prerequisites

1. Install the Fly CLI:
   ```bash
   # macOS
   brew install flyctl
   
   # Linux
   curl -L https://fly.io/install.sh | sh
   
   # Windows
   powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```

2. Sign up and log in to Fly.io:
   ```bash
   fly auth signup
   # or if you already have an account
   fly auth login
   ```

## Deploying the docs-ingestion Project

The `docs-ingestion` project is a scheduled job that pulls Vaadin documentation from GitHub and processes it for use by the MCP server.

### Initial Setup

1. Navigate to the docs-ingestion directory:
   ```bash
   cd docs-ingestion
   ```

2. Create a new Fly.io app:
   ```bash
   fly apps create vaadin-docs-ingestion
   ```

3. Create a volume for storing the cloned documentation repository:
   ```bash
   fly volumes create vaadin_docs_data --size 1 --region sjc
   ```

4. Set up the required secrets:
   ```bash
   fly secrets set OPENAI_API_KEY=your_openai_api_key
   fly secrets set PINECONE_API_KEY=your_pinecone_api_key
   fly secrets set PINECONE_INDEX=your_pinecone_index_name
   ```

### Deployment

1. Deploy the application:
   ```bash
   fly deploy
   ```

### Running the Ingestion Process

Since this is a batch job rather than a continuously running service, you can run it manually or set up a scheduled execution:

1. Run the ingestion process manually:
   ```bash
   fly machine run --app vaadin-docs-ingestion
   ```

2. To set up scheduled execution, use the Fly.io Machines API or a CI/CD pipeline with a cron schedule.

## Deploying the mcp-server Project

The `mcp-server` project is a continuously running service that provides access to the Vaadin documentation through the Model Context Protocol.

### Initial Setup

1. Navigate to the mcp-server directory:
   ```bash
   cd mcp-server
   ```

2. Create a new Fly.io app:
   ```bash
   fly apps create vaadin-docs-mcp-server
   ```

3. Set up the required secrets:
   ```bash
   fly secrets set OPENAI_API_KEY=your_openai_api_key
   fly secrets set PINECONE_API_KEY=your_pinecone_api_key
   fly secrets set PINECONE_INDEX=your_pinecone_index_name
   ```

### Deployment

1. Deploy the application:
   ```bash
   fly deploy
   ```

2. Once deployed, you can access the server at:
   ```
   https://vaadin-docs-mcp-server.fly.dev
   ```

## Monitoring and Logs

### Viewing Logs

```bash
# For docs-ingestion
fly logs -a vaadin-docs-ingestion

# For mcp-server
fly logs -a vaadin-docs-mcp-server
```

### Monitoring Status

```bash
# For docs-ingestion
fly status -a vaadin-docs-ingestion

# For mcp-server
fly status -a vaadin-docs-mcp-server
```

## Updating Deployments

When you make changes to either project, simply run `fly deploy` in the respective directory to update the deployment.

## Scaling (for mcp-server)

If needed, you can scale the mcp-server:

```bash
# Scale to multiple instances
fly scale count 2 -a vaadin-docs-mcp-server

# Scale machine size
fly scale vm dedicated-cpu-1x -a vaadin-docs-mcp-server
```

## Troubleshooting

- If the deployment fails, check the logs with `fly logs`.
- Ensure all required environment variables are set correctly.
- For the docs-ingestion project, check that the volume is mounted correctly.
- For the mcp-server project, verify that the health check endpoint is responding correctly.

## Important Notes

1. The docs-ingestion project is designed to run as a batch job, not a continuously running service.
2. The mcp-server project requires the data processed by the docs-ingestion project to be available in Pinecone.
3. Both projects require the same Pinecone index to function properly.
4. Make sure your Fly.io account has sufficient resources for both deployments.
