module.exports = {
  apps: [
    {
      name: 'docuware-front-end',
      script: 'npm',
      args: 'start',
      cwd: './', // ruta del proyecto
      env: {
        NODE_ENV: 'production',
        PORT: 3010, // o el puerto que desees
      },
    },
  ],
};