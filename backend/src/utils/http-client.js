const axios = require('axios');

const createHttpClient = (baseURL) => {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
    },
  });

  client.interceptors.response.use(
    (response) => response,
    (error) => {
      const errorMsg = error.response 
        ? `API Error: ${error.response.status} - ${error.response.statusText}`
        : `Network Error: ${error.message}`;
      
      console.error(`[Axios Client] ${errorMsg}`);
      return Promise.reject(new Error(errorMsg));
    }
  );

  return client;
};

module.exports = createHttpClient;

