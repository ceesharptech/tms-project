const axios = require("axios");
const FormData = require("form-data");

const FACE_SERVICE_URL =
  process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

/**
 * enrollFace — forward 3-5 image buffers to the Python face service.
 *
 * @param {string} driverId
 * @param {Array<{buffer: Buffer, originalname: string, mimetype: string}>} files
 * @returns {{ embedding: number[], model: string, num_images: number }}
 */
async function enrollFace(driverId, files) {
  const form = new FormData();
  form.append("driver_id", driverId);

  for (const file of files) {
    form.append("images", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });
  }

  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/enroll`, form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });

    const { embedding, model, num_images } = response.data;
    return { embedding, model, num_images };
  } catch (err) {
    if (err.response) {
      // Python service returned a structured error
      const detail =
        err.response.data?.detail ||
        err.response.data?.message ||
        "Face service error";
      const status = err.response.status;
      const faceErr = new Error(
        typeof detail === "string" ? detail : JSON.stringify(detail),
      );
      faceErr.statusCode = status;
      throw faceErr;
    }
    if (
      err.code === "ECONNREFUSED" ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT"
    ) {
      const netErr = new Error(
        "Cannot reach face recognition service — ensure it is running on port 8000",
      );
      netErr.statusCode = 503;
      throw netErr;
    }
    throw err;
  }
}

/**
 * identifyFace — Phase 6 stub.
 */
async function identifyFace() {
  throw new Error("Not implemented yet");
}

/**
 * healthCheck — verify the Python service is reachable.
 */
async function healthCheck() {
  const response = await axios.get(`${FACE_SERVICE_URL}/health`, {
    timeout: 5000,
  });
  return response.data;
}

module.exports = { enrollFace, identifyFace, healthCheck };
