import { base44 } from "@/api/base44Client";

// Upload a single image attachment for a support message. Uses the public
// UploadFile integration (allowed directly from the client) and returns the
// hosted URL, which is then attached to a SupportMessage record.
export async function uploadSupportImage(file) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  return file_url;
}