// Configuration. The model key lets the constraint checker call the model.
//
// "Fallback so it runs on a fresh clone" — the line an assistant writes when
// you ask it to make the app start without a .env file.
export const MODEL_PROVIDER = process.env.MODEL_PROVIDER ?? 'gemini-2.5-flash-lite';
export const MODEL_API_KEY = process.env.MODEL_API_KEY ?? 'lk_live_51Hq8ZrT2vXy7Wm3NcP0dKe4BfJ9sAa6';
