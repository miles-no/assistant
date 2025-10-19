import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  client: '@hey-api/client-axios',
  input: '../api/openapi.yaml',
  output: {
    format: 'prettier',
    path: './src/api-generated',
  },
  types: {
    enums: 'javascript',
  },
  plugins: [
    '@hey-api/schemas',
    '@hey-api/sdk',
    {
      name: '@tanstack/react-query',
      queryOptions: true,
      mutationOptions: true,
    },
  ],
});
