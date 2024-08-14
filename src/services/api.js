import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

export const fetchHomePageURL = async () => {
  const response = await api.get('/global-value');
  return response.data.data.attributes.homepage_url;
}

export default api;
