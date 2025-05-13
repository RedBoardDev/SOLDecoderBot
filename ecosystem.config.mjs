// ecosystem.config.mjs
export default {
  apps: [
    {
      name: 'soldecoder-bot',
      script: 'src/index.ts',
      interpreter: 'npx',
      interpreter_args: 'tsx',
      cwd: '.',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};

