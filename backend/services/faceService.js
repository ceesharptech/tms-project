const axios = require("axios");

const FACE_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

const faceService = {
  async enrollFace(imageBase64Array) {
    const response = await axios.post(`${FACE_SERVICE_URL}/enroll`, {
      images: imageBase64Array,
    });
    return response.data;
  },

  async identifyFace(imageBase64) {
    const response = await axios.post(`${FACE_SERVICE_URL}/identify`, {
      image: imageBase64,
    });
    return response.data;
  },

  async healthCheck() {
    const response = await axios.get(`${FACE_SERVICE_URL}/health`);
    return response.data;
  },
};

module.exports = faceService;
