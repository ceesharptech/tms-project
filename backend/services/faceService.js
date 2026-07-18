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
      timeout: 60_000,
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
 * identifyFace — compare a query image against all stored driver embeddings.
 *
 * @param {Buffer}  imageBuffer    - Raw image bytes from the uploaded file.
 * @param {string}  imageMimetype  - MIME type, e.g. "image/jpeg".
 * @param {string}  imageFilename  - Original file name.
 * @param {Array<{driver_id: string, embedding: number[]}>} storedEmbeddings
 *   - All active driver embeddings fetched from the database.
 *
 * @returns {{ matched: boolean, driver_id?: string, confidence?: number, distance?: number }}
 */
async function identifyFace(
  imageBuffer,
  imageMimetype,
  imageFilename,
  storedEmbeddings,
) {
  const form = new FormData();

  form.append("image", imageBuffer, {
    filename: imageFilename || "query.jpg",
    contentType: imageMimetype || "image/jpeg",
  });

  form.append("stored_embeddings", JSON.stringify(storedEmbeddings));

  try {
    const response = await axios.post(`${FACE_SERVICE_URL}/identify`, form, {
      headers: form.getHeaders(),
      timeout: 90_000,
    });
    return response.data;
  } catch (err) {
    if (err.response) {
      // 404 = no match found
      if (err.response.status === 404) {
        const detail = err.response.data?.detail;
        if (detail && typeof detail === "object") return detail;
        return { matched: false };
      }
      const detail =
        err.response.data?.detail ||
        err.response.data?.message ||
        "Face service error";
      const faceErr = new Error(
        typeof detail === "string" ? detail : JSON.stringify(detail),
      );
      faceErr.statusCode = err.response.status;
      throw faceErr;
    }
    if (
      err.code === "ECONNREFUSED" ||
      err.code === "ECONNRESET" ||
      err.code === "ETIMEDOUT"
    ) {
      const netErr = new Error(
        "Facial recognition service is not available. Please try again later.",
      );
      netErr.statusCode = 503;
      throw netErr;
    }
    throw err;
  }
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
