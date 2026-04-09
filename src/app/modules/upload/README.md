Short documentation for presigned S3 upload flow and endpoint

POST /upload/presign (Authenticated)
Body: { filename: string, contentType: string, folder?: 'videos' | 'images' }

Response: { signedUrl, publicUrl, key }

Flow:

1. Request a pre-signed upload URL from the backend
2. Upload your file directly to S3 using `PUT signedUrl` with the correct `Content-Type` header
3. Send a create post request with `media_source` including the `publicUrl` (and optionally size and type)

Example client flow:
const res = await api.post('/upload/presign', { filename: file.name, contentType: file.type });
await fetch(res.data.signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
await api.post('/post', { caption: 'Test', media_source: [{ url: res.data.publicUrl, type: 'video', size: file.size }] });

Notes:

- If you upload the video via the app server (multipart), the server will reject large videos on serverless deployments. Use presigned URLs for > 10MB (default) uploads.
