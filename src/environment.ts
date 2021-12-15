const environment = {
  livecam_server: {
    host: 'localhost',
    port: 7000,
    apiPath: '/api',
    endpoints: {
      list: '/recordings',
      download: '/recordings/:id',
      schedule: '/recordings',
    },
  },
};

export default environment;
