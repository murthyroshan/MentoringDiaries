// PM2 process manager config — for non-Docker deployments (e.g. bare VMs, DigitalOcean droplets).
// Usage:
//   pm2 start ecosystem.config.js --env production
//   pm2 save && pm2 startup   (to survive reboots)

module.exports = {
    apps: [
        {
            name:          'mentoring-diaries',
            script:        'index.js',
            // One process per CPU core for maximum throughput.
            instances:     'max',
            exec_mode:     'cluster',
            // Restart automatically if the process exceeds 512 MB RSS.
            max_memory_restart: '512M',
            // Restart up to 10 times within 30 s before PM2 gives up.
            max_restarts:  10,
            restart_delay: 3000,
            // Keep stdout/stderr logs; rotate them automatically.
            out_file:      './logs/out.log',
            error_file:    './logs/error.log',
            merge_logs:    true,
            log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
            env: {
                NODE_ENV: 'development',
                PORT:     5000,
            },
            env_production: {
                NODE_ENV: 'production',
                PORT:     5000,
            },
        },
    ],
};
