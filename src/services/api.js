import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
});

export const fetchHomePageURL = async () => {
  const response = await api.get('/global-value');
  return response.data.data.attributes.homepage_url;
}

// Function to retrieve image URLs from a specific collection and field
export async function getImageUrls(collectionName, fieldName) {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}${collectionName}?populate=${fieldName}`);

    // Check if data exists
    const imageData = response.data?.data?.attributes?.[fieldName]?.data?.attributes?.formats;

    if (!imageData) {
      return null;
    }

    // Create a hash map of formats and their URLs
    const imageUrls = {};
    for (const format in imageData) {
      imageUrls[format] = `${process.env.REACT_APP_CMS_URL.replace(/\/$/, '')}${imageData[format].url}`;
    }

    return imageUrls;
  } catch (error) {
    console.error('Error fetching image URLs:', error);
    return null;
  }
}


export default api;
