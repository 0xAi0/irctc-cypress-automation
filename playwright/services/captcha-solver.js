const DEFAULT_URL = process.env.CAPTCHA_SOLVER_URL || 'http://localhost:5000/extract-text';

async function requestCaptchaText(requestContext, image) {
  const response = await requestContext.post(DEFAULT_URL, {
    data: { image },
    timeout: 15000,
  });

  if (!response.ok()) {
    throw new Error(`Captcha solver failed with status ${response.status()}`);
  }

  const payload = await response.json();
  if (!payload.extracted_text) {
    throw new Error('Captcha solver did not return extracted_text');
  }

  return payload.extracted_text;
}

module.exports = {
  requestCaptchaText,
};
