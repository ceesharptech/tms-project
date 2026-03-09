import api from './api';

/**
 * identifyDriver — submit a single face image for identification.
 *
 * Returns:
 *   { matched: true,  confidence, distance, driver }
 *   { matched: false }
 *
 * Throws a plain Error with a user-friendly `.message` on failure.
 */
export async function identifyDriver(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  try {
    const response = await api.post('/drivers/identify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const msg =
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message;

    // 404 = no match found (not an error condition)
    if (status === 404) {
      return { matched: false };
    }

    // 400-level: face processing errors from Python service
    if (status === 400) {
      const detail =
        typeof msg === 'string' ? msg : 'Face processing error';
      const err = new Error(detail);
      err.type = detectErrorType(detail);
      throw err;
    }

    // 503 = face service down
    if (status === 503) {
      const err = new Error(
        'The facial recognition service is currently unavailable. Please try manual search.',
      );
      err.type = 'SERVICE_UNAVAILABLE';
      throw err;
    }

    // Network timeout
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      const err = new Error(
        'Request timed out. The service may be busy — please try again.',
      );
      err.type = 'TIMEOUT';
      throw err;
    }

    // Generic network error
    if (!error.response) {
      const err = new Error(
        'Cannot connect to the server. Check your connection.',
      );
      err.type = 'NETWORK_ERROR';
      throw err;
    }

    const err = new Error(
      typeof msg === 'string' ? msg : 'Identification failed',
    );
    err.type = 'UNKNOWN';
    throw err;
  }
}

/** Infer error type from Python service error message for contextual UI display. */
function detectErrorType(message) {
  const lower = (message || '').toLowerCase();
  if (lower.includes('no face') || lower.includes('face detected'))
    return 'NO_FACE';
  if (lower.includes('multiple face') || lower.includes('more than one'))
    return 'MULTIPLE_FACES';
  if (lower.includes('quality') || lower.includes('resolution'))
    return 'POOR_QUALITY';
  return 'FACE_ERROR';
}
