export async function uploadImageViaCloudinary(file) {
  if (!file) throw new Error("No file provided");
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", uploadPreset);

  const res = await fetch(url, { method: "POST", body: form });
  const data = await res.json();

  if (!res.ok) throw new Error(data?.error?.message || "Cloudinary upload failed");
  return { url: data?.secure_url || "", publicId: data?.public_id || "", raw: data };
}
